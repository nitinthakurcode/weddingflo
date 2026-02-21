/**
 * Google Sheets OAuth Client
 *
 * Handles OAuth flow and API client creation for Google Sheets integration.
 * Enables bi-directional sync between WeddingFlo and Google Sheets.
 *
 * February 2026 - Full implementation
 */

import { google, sheets_v4 } from 'googleapis';

// Scopes required for Google Sheets API
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file', // Create/access files we create
];

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export class GoogleSheetsOAuth {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google-sheets/callback`
    );
  }

  /**
   * Generate authorization URL for user consent
   */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId, // Pass userId to identify user after redirect
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || '',
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      access_token: credentials.access_token || '',
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date || undefined,
      token_type: credentials.token_type || 'Bearer',
      scope: credentials.scope || '',
    };
  }

  /**
   * Get authenticated sheets client
   */
  getSheetsClient(accessToken: string, refreshToken: string): sheets_v4.Sheets {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  /**
   * Get authenticated drive client (for creating spreadsheets)
   */
  getDriveClient(accessToken: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }
}

/**
 * Create a new spreadsheet for a client
 */
export async function createSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  clientName: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await sheetsClient.spreadsheets.create({
    requestBody: {
      properties: {
        title: `WeddingFlo - ${clientName}`,
      },
      sheets: [
        { properties: { title: 'Guests', sheetId: 0 } },
        { properties: { title: 'Budget', sheetId: 1 } },
        { properties: { title: 'Timeline', sheetId: 2 } },
        { properties: { title: 'Hotels', sheetId: 3 } },
        { properties: { title: 'Transport', sheetId: 4 } },
        { properties: { title: 'Vendors', sheetId: 5 } },
        { properties: { title: 'Gifts', sheetId: 6 } },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet');
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Read data from a specific sheet
 */
export async function readSheetData(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<any[][]> {
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  return response.data.values || [];
}

/**
 * Write data to a specific sheet (replaces all data)
 */
export async function writeSheetData(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  data: any[][]
): Promise<void> {
  // Clear existing data first
  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  // Write new data
  if (data.length > 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: data,
      },
    });
  }
}

/**
 * Append data to a sheet (adds rows at the end)
 */
export async function appendSheetData(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  data: any[][]
): Promise<void> {
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: data,
    },
  });
}

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetMetadata(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string
) {
  const response = await sheetsClient.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties',
  });

  return response.data;
}

/**
 * Format headers in a sheet (bold, freeze row)
 */
export async function formatSheetHeaders(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Bold header row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
}
