const cron = require('node-cron');
const { statements } = require('./database');
const { triggerBirthdayCollection, postBirthdayThread } = require('./birthday-service');

const ADMIN_CHANNEL = process.env.ADMIN_CHANNEL;
const MGMT_CHANNEL = process.env.MGMT_CHANNEL;
const HR_CHANNEL = process.env.HR_CHANNEL;

// Load public holidays generated from Google Calendar events
const publicHolidays = require('./public-holidays.json');

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date) {
  const d = date.toISOString().split('T')[0];
  return publicHolidays.includes(d);
}

function previousWorkingDay(date) {
  const d = new Date(date);
  while (isWeekend(d) || isHoliday(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function subtractWorkingDays(date, days) {
  const d = new Date(date);
  while (days > 0) {
    d.setDate(d.getDate() - 1);
    if (!isWeekend(d) && !isHoliday(d)) {
      days--;
    }
  }
  return d;
}

function setupCronJobs(app) {
  // Run every day at 9:00 AM Thailand time
  cron.schedule('0 9 * * *', async () => {

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingBirthdays = statements.getAllBirthdays.all();

      for (const birthday of upcomingBirthdays) {
        const [day, month] = birthday.birth_date.split('-').map(n => parseInt(n));
        const currentYear = today.getFullYear();
        const birthdayDate = new Date(currentYear, month - 1, day);

        const celebrationDate = previousWorkingDay(birthdayDate);

        const diffDays = Math.ceil((celebrationDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 7) {
          console.log(`Triggering collection for ${birthday.user_id}`);
          await triggerBirthdayCollection(app.client, birthday.user_id);
        }

        if (diffDays === 5) {
          const msg = `Reminder: <@${birthday.user_id}>'s birthday is on ${celebrationDate.toLocaleDateString('en-GB')}`;
          await app.client.chat.postMessage({ channel: MGMT_CHANNEL, text: msg });
          await app.client.chat.postMessage({ channel: HR_CHANNEL, text: msg });
        }

        if (diffDays === 1) {
          const messageCount = statements.getBirthdayMessageCount.get(birthday.user_id).message_count || 0;
          await app.client.chat.postMessage({
            channel: ADMIN_CHANNEL,
            text: `${messageCount} messages collected for upcoming birthday`
          });
        }

        if (diffDays === 0) {
          console.log(`Posting thread for ${birthday.user_id}`);
          await postBirthdayThread(app.client, birthday.user_id);
        }
      }
    } catch (error) {
      console.error('Error in birthday cron job:', error);
    }
  }, {
    timezone: "Asia/Bangkok"
  });
}

module.exports = { setupCronJobs };
