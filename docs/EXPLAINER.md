# Explainer: Setup, Running, and Repair

This document provides a short guide on how to configure, run and troubleshoot the Birthday Bot.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with the following variables:
   - `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` – Slack credentials.
   - `BIRTHDAY_CHANNEL`, `ADMIN_CHANNEL`, `MGMT_CHANNEL`, `HR_CHANNEL` – Slack channel IDs.
   - `HOLIDAY_CALENDAR_IDS` – comma separated Google Calendar IDs.
   - Optional: `BIRTHDAY_CSV` path or `GOOGLE_SHEET_ID` for external birthday data.
3. (If using Google Sheets) set `GOOGLE_SERVICE_ACCOUNT_JSON` to the path of your service account credentials.

## Running
Start the bot with:
```bash
npm start
```
The app listens on `PORT` (default `10000`) and exposes `/health-check` for monitoring. A daily cron job runs at 9 AM Asia/Bangkok time to collect messages, remind management and HR five working days in advance, and post the birthday thread.

## Repair
- Check the `ADMIN_CHANNEL` for error reports.
- Run `checkDatabase()` from `database.js` to verify the SQLite database.
- Ensure environment variables are correct; missing Google credentials will skip birthday imports with a warning.
