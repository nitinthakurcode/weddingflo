/**
 * CSV Import and Parsing utilities
 */

export interface CSVParseResult<T = any> {
  data: T[];
  errors: Array<{ row: number; field: string; message: string }>;
  totalRows: number;
  validRows: number;
}

export interface CSVImportOptions {
  delimiter?: string;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
  trimValues?: boolean;
}

export interface CSVFieldMapping {
  csvColumn: string;
  dataField: string;
  required?: boolean;
  validator?: (value: any) => boolean | string;
  transformer?: (value: any) => any;
}

/**
 * Parse CSV file content
 */
export function parseCSV(
  content: string,
  options: CSVImportOptions = {}
): { headers: string[]; rows: string[][] } {
  const {
    delimiter = ',',
    hasHeaders = true,
    skipEmptyLines = true,
    trimValues = true,
  } = options;

  const lines = content.split('\n');
  const rows: string[][] = [];
  let headers: string[] = [];

  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (skipEmptyLines && line.trim().length === 0) {
      continue;
    }

    const parsedLine = parseCSVLine(line, delimiter, trimValues);

    if (hasHeaders && headers.length === 0) {
      headers = parsedLine;
      startIndex = i + 1;
    } else {
      rows.push(parsedLine);
    }
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string, delimiter: string = ',', trim: boolean = true): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      values.push(trim ? currentValue.trim() : currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  values.push(trim ? currentValue.trim() : currentValue);

  return values;
}

/**
 * Import and validate CSV data with field mapping
 */
export function importCSVWithMapping<T>(
  content: string,
  fieldMapping: CSVFieldMapping[],
  options: CSVImportOptions = {}
): CSVParseResult<T> {
  const { headers, rows } = parseCSV(content, options);

  const data: T[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // Create a map of CSV column names to field mappings
  const mappingByColumn = new Map<string, CSVFieldMapping>();
  fieldMapping.forEach((mapping) => {
    mappingByColumn.set(mapping.csvColumn.toLowerCase(), mapping);
  });

  // Find column indices
  const columnIndices = new Map<string, number>();
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    columnIndices.set(normalizedHeader, index);
  });

  // Check for required columns
  fieldMapping.forEach((mapping) => {
    if (mapping.required) {
      const columnName = mapping.csvColumn.toLowerCase();
      if (!columnIndices.has(columnName)) {
        errors.push({
          row: 0,
          field: mapping.csvColumn,
          message: `Required column "${mapping.csvColumn}" not found`,
        });
      }
    }
  });

  // If required columns are missing, return early
  if (errors.length > 0) {
    return {
      data: [],
      errors,
      totalRows: rows.length,
      validRows: 0,
    };
  }

  // Process each row
  rows.forEach((row, rowIndex) => {
    const rowData: any = {};
    let rowHasErrors = false;

    fieldMapping.forEach((mapping) => {
      const columnName = mapping.csvColumn.toLowerCase();
      const columnIndex = columnIndices.get(columnName);

      if (columnIndex === undefined) {
        if (mapping.required) {
          errors.push({
            row: rowIndex + 1,
            field: mapping.csvColumn,
            message: `Required field missing`,
          });
          rowHasErrors = true;
        }
        return;
      }

      let value = row[columnIndex];

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
    totalRows: rows.length,
    validRows: data.length,
  };
}

/**
 * Import guest list from CSV
 */
export function importGuestListCSV(content: string): CSVParseResult<{
  guest_name: string;
  number_of_packs: number;
  phone_number?: string;
  email?: string;
  events_attending: string[];
}> {
  const fieldMapping: CSVFieldMapping[] = [
    {
      csvColumn: 'Guest Name',
      dataField: 'guest_name',
      required: true,
      validator: (value) => value && value.trim().length > 0 ? true : 'Guest name is required',
    },
    {
      csvColumn: 'Party Size',
      dataField: 'number_of_packs',
      required: true,
      transformer: (value) => parseInt(value, 10),
      validator: (value) => !isNaN(value) && value > 0 ? true : 'Party size must be a positive number',
    },
    {
      csvColumn: 'Phone',
      dataField: 'phone_number',
      required: false,
    },
    {
      csvColumn: 'Email',
      dataField: 'email',
      required: false,
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
      transformer: (value) => value ? value.split(';').map((e: string) => e.trim()) : [],
    },
  ];

  return importCSVWithMapping(content, fieldMapping, {
    hasHeaders: true,
    skipEmptyLines: true,
    trimValues: true,
  });
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsText(file);
  });
}
