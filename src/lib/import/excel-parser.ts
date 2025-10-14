/**
 * Excel Import and Parsing utilities
 * Uses XLSX (SheetJS) for parsing Excel files
 */

import * as XLSX from 'xlsx';
import type { CSVParseResult, CSVFieldMapping } from './csv-parser';

export interface ExcelParseOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
}

/**
 * Read Excel file and convert to array of objects
 */
export function parseExcelFile(file: File, options: ExcelParseOptions = {}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // Get the sheet
        let sheet: XLSX.WorkSheet;
        if (options.sheetName) {
          sheet = workbook.Sheets[options.sheetName];
          if (!sheet) {
            reject(new Error(`Sheet "${options.sheetName}" not found`));
            return;
          }
        } else {
          const sheetIndex = options.sheetIndex || 0;
          const sheetName = workbook.SheetNames[sheetIndex];
          if (!sheetName) {
            reject(new Error(`Sheet at index ${sheetIndex} not found`));
            return;
          }
          sheet = workbook.Sheets[sheetName];
        }

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: options.hasHeaders !== false ? undefined : 1,
          defval: '',
        });

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsBinaryString(file);
  });
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
 */
export async function importGuestListExcel(file: File): Promise<CSVParseResult<{
  guest_name: string;
  number_of_packs: number;
  phone_number?: string;
  email?: string;
  events_attending: string[];
}>> {
  const fieldMapping: CSVFieldMapping[] = [
    {
      csvColumn: 'Guest Name',
      dataField: 'guest_name',
      required: true,
      validator: (value) => value && String(value).trim().length > 0 ? true : 'Guest name is required',
    },
    {
      csvColumn: 'Party Size',
      dataField: 'number_of_packs',
      required: true,
      transformer: (value) => {
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        return num;
      },
      validator: (value) => !isNaN(value) && value > 0 ? true : 'Party size must be a positive number',
    },
    {
      csvColumn: 'Phone',
      dataField: 'phone_number',
      required: false,
      transformer: (value) => value ? String(value) : undefined,
    },
    {
      csvColumn: 'Email',
      dataField: 'email',
      required: false,
      transformer: (value) => value ? String(value) : undefined,
      validator: (value) => {
        if (!value) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? true : 'Invalid email format';
      },
    },
    {
      csvColumn: 'Events Attending',
      dataField: 'events_attending',
      required: false,
      transformer: (value) => {
        if (!value) return [];
        const strValue = String(value);
        return strValue.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean);
      },
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
export function getExcelSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        resolve(workbook.SheetNames);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsBinaryString(file);
  });
}
