# User Guide

This guide explains how regular Slack users interact with the Birthday Bot.

## Adding Birthdays
Use the slash command:
```bash
/set-birthday @user DD-MM
```
The bot validates the date and stores it in the database.

## Viewing the Calendar
List all birthdays with:
```bash
/see-birthdays
```
The bot groups birthdays by month and displays them in an organised list.

## Contributing Messages
Seven days before a colleague's birthday, you will receive a direct message with a form to submit:
- A birthday message (optional GIF or image URL)
- A short description about them
You can choose to provide either or both.

## Posting Celebrations
On the celebrant's working day, the bot posts a thread in the `BIRTHDAY_CHANNEL` with all collected messages. If nothing was submitted, a default greeting is posted instead.

## Management and HR Reminders
Five working days prior to a birthday, the bot sends a reminder message to `MGMT_CHANNEL` and `HR_CHANNEL` so preparations can be made.

## Updating Holidays
Run the script:
```bash
npm run generate-holidays
```
This updates `public-holidays.json` with dates from calendars specified in `HOLIDAY_CALENDAR_IDS`.
