const fs = require('fs');
const { google } = require('googleapis');

async function generateHolidays() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : null;
  if (!credentials) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
    process.exit(1);
  }

  const calendarIds = process.env.HOLIDAY_CALENDAR_IDS
    ? process.env.HOLIDAY_CALENDAR_IDS.split(',').map(id => id.trim()).filter(Boolean)
    : [];
  if (calendarIds.length === 0) {
    console.error('HOLIDAY_CALENDAR_IDS not provided');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly']
  });
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const currentYear = new Date().getFullYear();
  const timeMin = new Date(currentYear, 0, 1).toISOString();
  const timeMax = new Date(currentYear + 1, 0, 1).toISOString();

  const dates = new Set();
  for (const id of calendarIds) {
    try {
      const res = await calendar.events.list({
        calendarId: id,
        timeMin,
        timeMax,
        singleEvents: true,
        maxResults: 2500
      });
      for (const event of res.data.items || []) {
        const summary = event.summary || '';
        if (summary.includes('[Office Holiday]')) {
          const start = event.start.date || event.start.dateTime;
          if (start) {
            dates.add(start.split('T')[0]);
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching events from ${id}:`, e.message);
    }
  }

  const arr = Array.from(dates).sort();
  fs.writeFileSync('public-holidays.json', JSON.stringify(arr, null, 2));
  console.log(`Wrote ${arr.length} holidays to public-holidays.json`);
}

generateHolidays().catch(err => {
  console.error('Error generating holidays:', err);
  process.exit(1);
});
