/**
 * Receipt OCR Scanner utilities
 * Uses Tesseract.js for optical character recognition
 */

import Tesseract from 'tesseract.js';

export interface ReceiptData {
  total?: number;
  date?: string;
  vendorName?: string;
  items?: Array<{ description: string; amount: number }>;
  rawText: string;
}

export interface OCRResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  confidence?: number;
}

/**
 * Scan receipt image and extract text
 */
export async function scanReceiptImage(
  imageFile: File | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      },
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    // Extract receipt data from text
    const receiptData = parseReceiptText(rawText);

    return {
      success: true,
      data: receiptData,
      confidence,
    };
  } catch (error) {
    console.error('OCR failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

/**
 * Parse receipt text to extract structured data
 */
function parseReceiptText(text: string): ReceiptData {
  const receiptData: ReceiptData = {
    rawText: text,
  };

  // Extract total amount (common patterns)
  const totalPatterns = [
    /total[:\s]*\$?(\d+[.,]\d{2})/i,
    /amount[:\s]*\$?(\d+[.,]\d{2})/i,
    /balance[:\s]*\$?(\d+[.,]\d{2})/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(amount)) {
        receiptData.total = amount;
        break;
      }
    }
  }

  // Extract date (common formats)
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      receiptData.date = match[0];
      break;
    }
  }

  // Extract vendor name (usually at the top, first non-empty line)
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length > 0) {
    // Take first line as potential vendor name
    const firstLine = lines[0].trim();
    if (firstLine.length > 2 && firstLine.length < 50) {
      receiptData.vendorName = firstLine;
    }
  }

  // Extract line items (simplified pattern)
  const items: Array<{ description: string; amount: number }> = [];
  const itemPattern = /^(.+?)\s+\$?(\d+[.,]\d{2})$/;

  lines.forEach((line) => {
    const match = line.trim().match(itemPattern);
    if (match) {
      const description = match[1].trim();
      const amount = parseFloat(match[2].replace(',', '.'));

      if (!isNaN(amount) && description.length > 2) {
        items.push({ description, amount });
      }
    }
  });

  if (items.length > 0) {
    receiptData.items = items;
  }

  return receiptData;
}

/**
 * Validate and clean receipt data
 */
export function validateReceiptData(data: ReceiptData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.total || data.total <= 0) {
    errors.push('Total amount not found or invalid');
  }

  if (!data.date) {
    errors.push('Date not found');
  }

  if (!data.vendorName) {
    errors.push('Vendor name not found');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Scan multiple receipts in batch
 */
export async function scanReceiptBatch(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await scanReceiptImage(files[i], (progress) => {
      if (onProgress) {
        onProgress(i, progress);
      }
    });
    results.push(result);
  }

  return results;
}

/**
 * Create image URL from file for preview
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to create preview'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsDataURL(file);
  });
}
