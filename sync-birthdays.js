const fs = require('fs');
const csv = require('csv-parser');
const { google } = require('googleapis');
const { statements } = require('./database');

async function importFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const id = row.user_id || row.id;
        const date = row.birth_date || row.birthday;
        if (id && date) {
          statements.insertBirthday.run(id.trim(), date.trim());
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
}

async function importFromSheet(sheetId) {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : null;

  if (!credentials) {
    console.warn('GOOGLE_SERVICE_ACCOUNT_JSON not provided; skipping sheet import');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:C'
  });

  const rows = res.data.values || [];
  for (const row of rows) {
    const [id, date, status] = row;
    if (id && date && (!status || status.toLowerCase() === 'active')) {
      statements.insertBirthday.run(id.trim(), date.trim());
    }
  }
}

async function syncBirthdays() {
  if (process.env.BIRTHDAY_CSV) {
    try {
      await importFromCsv(process.env.BIRTHDAY_CSV);
      console.log('Imported birthdays from CSV');
    } catch (e) {
      console.error('Error importing CSV:', e);
    }
  }

  if (process.env.GOOGLE_SHEET_ID) {
    try {
      await importFromSheet(process.env.GOOGLE_SHEET_ID);
      console.log('Imported birthdays from Google Sheet');
    } catch (e) {
      console.error('Error importing Google Sheet:', e);
    }
  }
}

module.exports = { syncBirthdays };
