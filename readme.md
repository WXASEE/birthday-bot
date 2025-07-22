# PostHog's Birthday Bot

A Slack bot that collects birthday wishes and posts them on the celebrant's working day. The bot runs automatically via a daily cron job and stores data in a local SQLite database.

## Setup

```bash
npm install
```

Create a `.env` file containing your Slack tokens and channel IDs:
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- `BIRTHDAY_CHANNEL`, `ADMIN_CHANNEL`, `MGMT_CHANNEL`, `HR_CHANNEL`
- `HOLIDAY_CALENDAR_IDS` – comma separated Google Calendar IDs to pull holidays

Optional variables:
- `BIRTHDAY_CSV` – path to a CSV file with `user_id` and `birth_date`
- `GOOGLE_SHEET_ID` – Google Sheet ID for birthdays (requires `GOOGLE_SERVICE_ACCOUNT_JSON`)

Start the bot with:
```bash
node index.js
```

## How It Works
- A cron job runs daily at **9 AM Thailand time** to:
  1. Collect birthday messages from colleagues seven days in advance.
  2. Remind management and HR five working days before a birthday.
  3. Post the birthday thread on the celebrant's working day (skipping weekends and public holidays).
- Birthdays are imported from a CSV or Google Sheet on startup.
- Holiday dates are stored in `public-holidays.json` and can be refreshed with `npm run generate-holidays`.

## Further Documentation
Additional guides are available in the [`docs`](./docs) folder:
- **EXPLAINER.md** – setup, running and repair instructions
- **code-overview.md** – module descriptions and key libraries
- **user-guide.md** – how to interact with the bot
