const cron = require('node-cron');
const { db, statements } = require('./database');
const { triggerBirthdayCollection, postBirthdayThread } = require('./birthday-service');

const ADMIN_CHANNEL = process.env.ADMIN_CHANNEL;

function setupCronJobs(app) {
  // Run every day at 9:00 AM Europe/London time
  cron.schedule('0 9 * * *', async () => {

  // Run every minute (for testing)
  // cron.schedule('*/1 * * * *', async () => {

    try {
      // Get today's birthdays and upcoming (7 days) birthdays
      const upcomingBirthdays = statements.getAllBirthdays.all();
      
      for (const birthday of upcomingBirthdays) {
        const today = new Date();
        const birthdayDate = new Date(today.getFullYear(), 
          parseInt(birthday.birth_date.split('-')[1]) - 1,
          parseInt(birthday.birth_date.split('-')[0])
        );
        
        const diffTime = birthdayDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 7) {
          console.log(`Triggering collection for ${birthday.user_id}`)
          // Trigger collection for birthdays in 7 days
          await triggerBirthdayCollection(app.client, birthday.user_id);
        } else if (diffDays === 1) {
          const messageCount = statements.getBirthdayMessageCount.get(birthday.user_id).message_count || 0;

          await app.client.chat.postMessage({
            channel: ADMIN_CHANNEL,
            text: `${messageCount} messages collected for upcoming birthday`
          });
        } else if (diffDays === 0) {
          console.log(`Posting thread for ${birthday.user_id}`)
          // Post thread for today's birthdays
          await postBirthdayThread(app.client, birthday.user_id);
        }
      }
    } catch (error) {
      console.error('Error in birthday cron job:', error);
    }
  }, {
    timezone: "Europe/London"
  });
}

module.exports = { setupCronJobs };