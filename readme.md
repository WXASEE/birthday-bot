# PostHog's Birthday Bot

A Slack bot to collect and send birthday messages.
It uses Google Gemini Flash 2.0 to generate personalized birthday poems.

## Setup

```
npm install
```

```
node index.js
```

Set the following environment variables before running the bot:

- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`
- `BIRTHDAY_CHANNEL`, `ADMIN_CHANNEL`
- `ANTHROPIC_API_KEY` for generating birthday poems with Gemini

## Commands

- `/set-birthday @user DD-MM`: Set someone's birthday.
- `/see-birthdays`: Show all birthdays.
- `/post-birthday-thread @user`: Manually post a thread to the birthday channel for someone.
- `/collect-birthdays @user`: Manually collect birthday messages for someone.

## Structure

A cron job that runs every day at 9am UK time to check:

1. If someone's birthday is 7 days away, trigger a collection of messages.
2. If someone's birthday is today, post a thread to the birthday channel.

There are also some commands that can be used to set birthdays and trigger functions manually.
### External Birthday Sources

If you have a CSV file or Google Sheet with birthdays, set one of the following environment variables and the bot will import the data at startup:

- `BIRTHDAY_CSV` – path to a CSV file with `user_id` and `birth_date` columns.
- `GOOGLE_SHEET_ID` – the ID of a Google Sheet with two columns: user ID and birthday. Provide service account credentials in `GOOGLE_SERVICE_ACCOUNT_JSON`.

This data will be imported into the local database each time the bot starts.
