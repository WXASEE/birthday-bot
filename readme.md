# PostHog's Birthday Bot



## Setup

```
npm install
```

```
node index.js
```

Set the following environment variables before running the bot:

- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- `BIRTHDAY_CHANNEL`, `ADMIN_CHANNEL`, `MGMT_CHANNEL`, `HR_CHANNEL`
- `HOLIDAY_CALENDAR_IDS` – comma separated Google Calendar IDs to pull holidays

The bot runs automatically each day and no longer relies on slash commands or an LLM.

## Structure

A cron job runs every day at **9am Thailand time** to:

1. Send a reminder to the management and HR channels five working days before a birthday.
2. Post the birthday message on the celebrant's working day (handling weekends and public holidays).

All birthdays are loaded from a Google Sheet or CSV on startup. No manual slash commands are required.
### External Birthday Sources

If you have a CSV file or Google Sheet with birthdays, set one of the following environment variables and the bot will import the data at startup:

- `BIRTHDAY_CSV` – path to a CSV file with `user_id` and `birth_date` columns.
- `GOOGLE_SHEET_ID` – the ID of a Google Sheet containing user ID, birthday and status. Provide service account credentials in `GOOGLE_SERVICE_ACCOUNT_JSON`.

The sheet should contain three columns: user ID, birthday (DD-MM), and status.
Only rows marked as `active` are imported when the bot starts.

### Office Holidays

To keep the list of public holidays up to date, run:

```
npm run generate-holidays
```

This script reads events tagged `[Office Holiday]` from the calendars listed in
`HOLIDAY_CALENDAR_IDS` and writes the dates to `public-holidays.json` which the
bot loads on startup.
