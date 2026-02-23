/**
 * Excel Import and Parsing utilities
 * Uses ExcelJS for parsing Excel files (secure replacement for xlsx)
 */

import ExcelJS from 'exceljs';
import type { CSVParseResult, CSVFieldMapping } from './csv-parser';
import { normalizeRsvpStatus, normalizeGuestSide } from '@/lib/constants/enums';

export interface ExcelParseOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
}

/**
 * Read Excel file and convert to array of objects
 */
export async function parseExcelFile(file: File, options: ExcelParseOptions = {}): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Get the sheet
  let worksheet: ExcelJS.Worksheet | undefined;
  if (options.sheetName) {
    worksheet = workbook.getWorksheet(options.sheetName);
    if (!worksheet) {
      throw new Error(`Sheet "${options.sheetName}" not found`);
    }
  } else {
    const sheetIndex = (options.sheetIndex || 0) + 1; // ExcelJS uses 1-based index
    worksheet = workbook.getWorksheet(sheetIndex);
    if (!worksheet) {
      throw new Error(`Sheet at index ${options.sheetIndex || 0} not found`);
    }
  }

  // Convert to JSON
  const jsonData: any[] = [];
  const headers: string[] = [];
  let hintsRowSkipped = false;

  // Helper to detect hints row by checking for common hint patterns
  const isHintsRow = (row: ExcelJS.Row): boolean => {
    const firstCellValue = String(row.getCell(1).value || '').toLowerCase();
    const secondCellValue = String(row.getCell(2).value || '').toLowerCase();

    // Patterns that indicate this is a hints/instructions row, not data
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'hh:mm',
      'true/false', 'numbers only', 'email@', 'pending/',
      'example', 'format:', 'optional', 'e.g.'
    ];

    return hintsPatterns.some(pattern =>
      firstCellValue.includes(pattern) || secondCellValue.includes(pattern)
    );
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 && options.hasHeaders !== false) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
      });
    } else if (rowNumber === 2 && options.hasHeaders !== false) {
      // Check if row 2 is a hints row (January 2026 enhanced export format)
      if (isHintsRow(row)) {
        hintsRowSkipped = true;
        console.log('[Excel Parser] Detected and skipping format hints row (row 2)');
      } else {
        // Row 2 is actual data, process it
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber - 1] || `Column${colNumber}`;
          rowData[key] = cell.value ?? '';
        });

        if (options.skipEmptyLines) {
          const hasValues = Object.values(rowData).some(v => v !== '' && v !== null && v !== undefined);
          if (!hasValues) return;
        }

        jsonData.push(rowData);
      }
    } else {
      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const key = options.hasHeaders !== false && headers[colNumber - 1]
          ? headers[colNumber - 1]
          : `Column${colNumber}`;
        rowData[key] = cell.value ?? '';
      });

      // Skip empty rows if option is set
      if (options.skipEmptyLines) {
        const hasValues = Object.values(rowData).some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValues) return;
      }

      jsonData.push(rowData);
    }
  });

  if (hintsRowSkipped) {
    console.log('[Excel Parser] Processed', jsonData.length, 'data rows (hints row skipped)');
  }

  return jsonData;
}

/**
 * Import Excel with field mapping and validation
 */
export async function importExcelWithMapping<T>(
  file: File,
  fieldMapping: CSVFieldMapping[],
  options: ExcelParseOptions = {}
): Promise<CSVParseResult<T>> {
  const rawData = await parseExcelFile(file, options);

  const data: T[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // Create a map of Excel column names to field mappings
  const mappingByColumn = new Map<string, CSVFieldMapping>();
  fieldMapping.forEach((mapping) => {
    mappingByColumn.set(mapping.csvColumn.toLowerCase(), mapping);
  });

  // Process each row
  rawData.forEach((row, rowIndex) => {
    const rowData: any = {};
    let rowHasErrors = false;

    fieldMapping.forEach((mapping) => {
      // Try to find the value by column name (case-insensitive)
      let value: any;
      const keys = Object.keys(row);
      const matchingKey = keys.find(
        (key) => key.toLowerCase().trim() === mapping.csvColumn.toLowerCase().trim()
      );

      if (matchingKey) {
        value = row[matchingKey];
      } else if (mapping.required) {
        errors.push({
          row: rowIndex + 1,
          field: mapping.csvColumn,
          message: `Required field missing`,
        });
        rowHasErrors = true;
        return;
      }

      // Transform value if transformer is provided
      if (mapping.transformer) {
        try {
          value = mapping.transformer(value);
        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            field: mapping.csvColumn,
            message: `Transformation failed: ${error}`,
          });
          rowHasErrors = true;
          return;
        }
      }

      // Validate value if validator is provided
      if (mapping.validator) {
        const validationResult = mapping.validator(value);
        if (validationResult !== true) {
          errors.push({
            row: rowIndex + 1,
            field: mapping.csvColumn,
            message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
          });
          rowHasErrors = true;
          return;
        }
      }

      rowData[mapping.dataField] = value;
    });

    if (!rowHasErrors) {
      data.push(rowData as T);
    }
  });

  return {
    data,
    errors,
    totalRows: rawData.length,
    validRows: data.length,
  };
}

/**
 * Import guest list from Excel
 * Updated January 2026 - Matches comprehensive export format with separate date/time columns
 * Supports both old and new column formats for backwards compatibility
 */
export async function importGuestListExcel(file: File): Promise<CSVParseResult<{
  id?: string;
  guest_name: string;
  email?: string;
  phone_number?: string;
  group_name?: string;
  guest_side?: string;
  rsvp_status?: string;
  number_of_packs: number;
  additional_guests?: string[];
  relationship?: string;
  events_attending?: string[];
  arrival_date?: string;
  arrival_time?: string;
  arrival_mode?: string;
  departure_date?: string;
  departure_time?: string;
  departure_mode?: string;
  meal_preference?: string;
  dietary_restrictions?: string;
  hotel_required?: boolean;
  transport_required?: boolean;
  per_member_hotel?: Record<string, boolean>;
  per_member_transport?: Record<string, boolean>;
  gift?: string;
  notes?: string;
  checked_in?: boolean;
}>> {
  // Helper to parse boolean values
  const parseBoolean = (value: any): boolean | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const strVal = String(value).toLowerCase().trim();
    if (strVal === 'true' || strVal === 'yes' || strVal === '1') return true;
    if (strVal === 'false' || strVal === 'no' || strVal === '0') return false;
    return undefined;
  };

  // Helper to parse per-member requirements (format: "name1:TRUE, name2:FALSE")
  const parsePerMemberReqs = (value: any): Record<string, boolean> | undefined => {
    if (!value) return undefined;
    const result: Record<string, boolean> = {};
    const parts = String(value).split(',');
    parts.forEach(part => {
      const [name, boolStr] = part.split(':').map(s => s.trim());
      if (name && boolStr) {
        const boolVal = parseBoolean(boolStr);
        if (boolVal !== undefined) {
          result[name] = boolVal;
        }
      }
    });
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const fieldMapping: CSVFieldMapping[] = [
    {
      csvColumn: 'ID',
      dataField: 'id',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Guest Name',
      dataField: 'guest_name',
      required: true,
      validator: (value) => value && String(value).trim().length > 0 ? true : 'Guest name is required',
    },
    {
      csvColumn: 'Email',
      dataField: 'email',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
      validator: (value) => {
        if (!value) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? true : 'Invalid email format';
      },
    },
    {
      csvColumn: 'Phone',
      dataField: 'phone_number',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Group',
      dataField: 'group_name',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Side',
      dataField: 'guest_side',
      required: false,
      transformer: (value) => {
        if (!value) return undefined;
        return normalizeGuestSide(String(value));
      },
    },
    {
      csvColumn: 'RSVP',
      dataField: 'rsvp_status',
      required: false,
      transformer: (value) => {
        if (!value) return 'pending';
        return normalizeRsvpStatus(String(value));
      },
    },
    {
      csvColumn: 'Party Size',
      dataField: 'number_of_packs',
      required: false,
      transformer: (value) => {
        if (!value) return 1;
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        return isNaN(num) || num < 1 ? 1 : num;
      },
    },
    {
      csvColumn: 'Additional Guests',
      dataField: 'additional_guests',
      required: false,
      transformer: (value) => {
        if (!value) return [];
        const strValue = String(value);
        return strValue.split(/[,]/).map((e: string) => e.trim()).filter(Boolean);
      },
    },
    {
      csvColumn: 'Relationship',
      dataField: 'relationship',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Events',
      dataField: 'events_attending',
      required: false,
      transformer: (value) => {
        if (!value) return [];
        const strValue = String(value);
        return strValue.split(/[,]/).map((e: string) => e.trim()).filter(Boolean);
      },
    },
    {
      csvColumn: 'Arrival Date',
      dataField: 'arrival_date',
      required: false,
      transformer: (value) => {
        if (!value) return undefined;
        // Handle various date formats
        if (value instanceof Date) return value.toISOString().split('T')[0];
        const dateStr = String(value).trim();
        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Try to parse
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
      },
    },
    {
      csvColumn: 'Arrival Time',
      dataField: 'arrival_time',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Arrival Mode',
      dataField: 'arrival_mode',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Departure Date',
      dataField: 'departure_date',
      required: false,
      transformer: (value) => {
        if (!value) return undefined;
        if (value instanceof Date) return value.toISOString().split('T')[0];
        const dateStr = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
      },
    },
    {
      csvColumn: 'Departure Time',
      dataField: 'departure_time',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Departure Mode',
      dataField: 'departure_mode',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Meal',
      dataField: 'meal_preference',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Dietary',
      dataField: 'dietary_restrictions',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Hotel (Primary)',
      dataField: 'hotel_required',
      required: false,
      transformer: parseBoolean,
    },
    {
      csvColumn: 'Transport (Primary)',
      dataField: 'transport_required',
      required: false,
      transformer: parseBoolean,
    },
    {
      csvColumn: 'Per-Member Hotel',
      dataField: 'per_member_hotel',
      required: false,
      transformer: parsePerMemberReqs,
    },
    {
      csvColumn: 'Per-Member Transport',
      dataField: 'per_member_transport',
      required: false,
      transformer: parsePerMemberReqs,
    },
    {
      csvColumn: 'Gift Received',
      dataField: 'gift',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Notes',
      dataField: 'notes',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Checked In',
      dataField: 'checked_in',
      required: false,
      transformer: parseBoolean,
    },
  ];

  // Parse the file, skipping the format hints row (row 2)
  const rawData = await parseExcelFile(file, { hasHeaders: true, skipEmptyLines: true });

  // Filter out the hints row (first data row that has hint text)
  const filteredData = rawData.filter((row, index) => {
    // Check if this is the hints row (typically contains "Do not modify", "Required", etc.)
    const firstCell = Object.values(row)[0];
    if (typeof firstCell === 'string' && firstCell.toLowerCase().includes('do not modify')) {
      return false;
    }
    return true;
  });

  const data: any[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // Create a map of Excel column names to field mappings (case-insensitive)
  const mappingByColumn = new Map<string, CSVFieldMapping>();
  fieldMapping.forEach((mapping) => {
    mappingByColumn.set(mapping.csvColumn.toLowerCase(), mapping);
  });

  // Process each row
  filteredData.forEach((row, rowIndex) => {
    const rowData: any = {};
    let rowHasErrors = false;

    fieldMapping.forEach((mapping) => {
      // Try to find the value by column name (case-insensitive)
      let value: any;
      const keys = Object.keys(row);
      const matchingKey = keys.find(
        (key) => key.toLowerCase().trim() === mapping.csvColumn.toLowerCase().trim()
      );

      if (matchingKey) {
        value = row[matchingKey];
      } else if (mapping.required) {
        errors.push({
          row: rowIndex + 3, // +3 because of header row (1) + hints row (2) + 0-based index
          field: mapping.csvColumn,
          message: `Required field missing`,
        });
        rowHasErrors = true;
        return;
      }

      // Transform value if transformer is provided
      if (mapping.transformer) {
        try {
          value = mapping.transformer(value);
        } catch (error) {
          errors.push({
            row: rowIndex + 3,
            field: mapping.csvColumn,
            message: `Transformation failed: ${error}`,
          });
          rowHasErrors = true;
          return;
        }
      }

      // Validate value if validator is provided
      if (mapping.validator) {
        const validationResult = mapping.validator(value);
        if (validationResult !== true) {
          errors.push({
            row: rowIndex + 3,
            field: mapping.csvColumn,
            message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
          });
          rowHasErrors = true;
          return;
        }
      }

      rowData[mapping.dataField] = value;
    });

    if (!rowHasErrors) {
      data.push(rowData);
    }
  });

  return {
    data,
    errors,
    totalRows: filteredData.length,
    validRows: data.length,
  };
}

/**
 * Import gift assignments from Excel
 */
export async function importGiftsExcel(file: File): Promise<CSVParseResult<{
  guest_name: string;
  gift_item?: string;
  gift_type?: string;
  quantity: number;
  delivery_date?: string;
  delivery_time?: string;
  delivery_location?: string;
  delivery_status?: string;
  delivered_by?: string;
  notes?: string;
}>> {
  const fieldMapping: CSVFieldMapping[] = [
    {
      csvColumn: 'Guest Name',
      dataField: 'guest_name',
      required: true,
      validator: (value) => value && String(value).trim().length > 0 ? true : 'Guest name is required',
    },
    {
      csvColumn: 'Gift Item',
      dataField: 'gift_item',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Gift Type',
      dataField: 'gift_type',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Quantity',
      dataField: 'quantity',
      required: false,
      transformer: (value) => {
        if (!value) return 1;
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        return isNaN(num) ? 1 : num;
      },
    },
    {
      csvColumn: 'Delivery Date',
      dataField: 'delivery_date',
      required: false,
      transformer: (value) => {
        if (!value) return undefined;
        // Handle various date formats
        if (value instanceof Date) return value.toISOString().split('T')[0];
        const dateStr = String(value);
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
      },
    },
    {
      csvColumn: 'Delivery Time',
      dataField: 'delivery_time',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Delivery Location',
      dataField: 'delivery_location',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Delivery Status',
      dataField: 'delivery_status',
      required: false,
      transformer: (value) => {
        if (!value) return 'pending';
        const status = String(value).toLowerCase().trim();
        // Normalize status values
        if (['pending', 'ready', 'in_transit', 'in transit', 'delivered'].includes(status)) {
          return status.replace(' ', '_');
        }
        return 'pending';
      },
    },
    {
      csvColumn: 'Delivered By',
      dataField: 'delivered_by',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
    {
      csvColumn: 'Notes',
      dataField: 'notes',
      required: false,
      transformer: (value) => value ? String(value).trim() : undefined,
    },
  ];

  return importExcelWithMapping(file, fieldMapping, {
    hasHeaders: true,
    skipEmptyLines: true,
  });
}

/**
 * Get sheet names from Excel file
 */
export async function getExcelSheetNames(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheetNames: string[] = [];
  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);
  });

  return sheetNames;
}

/**
 * Import Timeline from Excel
 * January 2026 - Full round-trip import support
 *
 * Supports:
 * - Creating new timeline items (empty ID)
 * - Updating existing items (with ID)
 * - Deleting items (DELETE in Notes column)
 */
export interface TimelineImportItem {
  id?: string;
  eventId?: string;
  eventName?: string;
  title: string;
  description?: string;
  phase?: 'setup' | 'showtime' | 'wrapup' | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  location?: string;
  participants?: string[];
  responsiblePerson?: string;
  completed?: boolean;
  sortOrder?: number;
  notes?: string;
  _action?: 'create' | 'update' | 'delete';
}

export async function importTimelineExcel(
  file: File,
  events: Array<{ id: string; title: string }>
): Promise<CSVParseResult<TimelineImportItem>> {
  // Parse the Excel file
  const rawData = await parseExcelFile(file, {
    sheetName: 'Timeline',
    hasHeaders: true,
    skipEmptyLines: true,
  });

  // Create event name to ID map for matching
  const eventNameToId = new Map<string, string>();
  events.forEach((e) => {
    eventNameToId.set(e.title.toLowerCase().trim(), e.id);
  });

  const data: TimelineImportItem[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // Helper to parse boolean
  const parseBoolean = (value: any): boolean | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const strVal = String(value).toLowerCase().trim();
    if (strVal === 'true' || strVal === 'yes' || strVal === '1') return true;
    if (strVal === 'false' || strVal === 'no' || strVal === '0') return false;
    return undefined;
  };

  // Helper to parse time string
  const parseTime = (value: any): string | undefined => {
    if (!value) return undefined;
    const strVal = String(value).trim();
    // Handle HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(strVal)) return strVal.padStart(5, '0');
    // Handle Excel date/time objects
    if (value instanceof Date) {
      return value.toTimeString().slice(0, 5);
    }
    return strVal;
  };

  // Helper to parse date string
  const parseDate = (value: any): string | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    const strVal = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;
    // Try parsing
    const parsed = new Date(strVal);
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
  };

  // Process each row
  rawData.forEach((row, rowIndex) => {
    // Skip hints row
    const firstValue = String(Object.values(row)[0] || '').toLowerCase();
    if (firstValue.includes('do not modify') || firstValue.includes('required')) {
      return;
    }

    // Get values case-insensitively
    const getValue = (key: string): any => {
      const lowerKey = key.toLowerCase();
      const matchingKey = Object.keys(row).find((k) => k.toLowerCase().trim() === lowerKey);
      return matchingKey ? row[matchingKey] : undefined;
    };

    const id = getValue('id') ? String(getValue('id')).trim() : undefined;
    const title = getValue('title') ? String(getValue('title')).trim() : '';
    const notes = getValue('notes') ? String(getValue('notes')).trim() : undefined;

    // Check for delete action
    if (notes?.toUpperCase() === 'DELETE' && id) {
      data.push({
        id,
        title: title || 'Deleted Item',
        _action: 'delete',
      });
      return;
    }

    // Validate required fields
    if (!title) {
      errors.push({
        row: rowIndex + 3, // +3 for header, hints row, 0-index
        field: 'Title',
        message: 'Title is required',
      });
      return;
    }

    // Get event ID - prefer explicit eventId, fallback to matching by name
    let eventId = getValue('event id') ? String(getValue('event id')).trim() : undefined;
    if (!eventId) {
      const eventName = getValue('event name') ? String(getValue('event name')).trim().toLowerCase() : '';
      if (eventName && eventNameToId.has(eventName)) {
        eventId = eventNameToId.get(eventName);
      }
    }

    // Parse participants
    const participantsStr = getValue('participants') ? String(getValue('participants')).trim() : '';
    const participants = participantsStr
      ? participantsStr.split(',').map((p) => p.trim()).filter(Boolean)
      : undefined;

    // Parse phase - validate and cast to union type
    const rawPhase = getValue('phase') ? String(getValue('phase')).toLowerCase().trim() : undefined;
    const phase: 'setup' | 'showtime' | 'wrapup' | undefined =
      rawPhase && ['setup', 'showtime', 'wrapup'].includes(rawPhase)
        ? (rawPhase as 'setup' | 'showtime' | 'wrapup')
        : rawPhase ? 'showtime' : undefined;

    // Parse duration
    const durationVal = getValue('duration (min)') || getValue('durationminutes');
    const durationMinutes = durationVal
      ? (typeof durationVal === 'number' ? durationVal : parseInt(String(durationVal), 10))
      : undefined;

    // Parse sort order
    const sortOrderVal = getValue('sort order') || getValue('sortorder');
    const sortOrder = sortOrderVal !== undefined && sortOrderVal !== ''
      ? (typeof sortOrderVal === 'number' ? sortOrderVal : parseInt(String(sortOrderVal), 10))
      : undefined;

    const item: TimelineImportItem = {
      id: id || undefined,
      eventId,
      title,
      description: getValue('description') ? String(getValue('description')).trim() : undefined,
      phase,
      date: parseDate(getValue('date')),
      startTime: parseTime(getValue('start time') || getValue('starttime')),
      endTime: parseTime(getValue('end time') || getValue('endtime')),
      durationMinutes: isNaN(durationMinutes as number) ? undefined : durationMinutes,
      location: getValue('location') ? String(getValue('location')).trim() : undefined,
      participants,
      responsiblePerson: getValue('responsible person') || getValue('responsibleperson')
        ? String(getValue('responsible person') || getValue('responsibleperson')).trim()
        : undefined,
      completed: parseBoolean(getValue('completed')),
      sortOrder: isNaN(sortOrder as number) ? undefined : sortOrder,
      notes,
      _action: id ? 'update' : 'create',
    };

    data.push(item);
  });

  return {
    data,
    errors,
    totalRows: rawData.length,
    validRows: data.length,
  };
}
