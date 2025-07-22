# Code Overview

This project implements a Slack bot using the Bolt framework. The key modules are:

- **index.js** – Entry point that initialises the Bolt `App`, syncs birthdays and sets up daily cron jobs.
- **birthday-cron.js** – Contains the function `setupCronJobs` that schedules a 9 AM job (Asia/Bangkok) to collect messages, send reminders and post birthday threads while skipping weekends and public holidays.
- **sync-birthdays.js** – Imports birthday data from a CSV file or Google Sheet if the related environment variables are present.
- **birthday-service.js** – Provides `triggerBirthdayCollection` and `postBirthdayThread` to collect messages from colleagues and post them in the birthday channel.
- **commands.js** – Optional slash commands such as `/set-birthday` and `/see-birthdays` for manual interaction with the bot.
- **database.js** – Sets up the SQLite database tables and exports prepared statements for interacting with them.
- **generate-holidays.js** – Creates `public-holidays.json` from Google Calendar events tagged `[Office Holiday]`.

### Main Libraries
- `@slack/bolt` for Slack API interactions.
- `better-sqlite3` for persistent storage.
- `googleapis` to access Google Sheets and Calendar.
- `node-cron` for scheduling daily tasks.
