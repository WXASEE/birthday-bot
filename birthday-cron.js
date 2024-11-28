const cron = require('node-cron');
const { db, statements } = require('./database');
const { triggerBirthdayCollection, postBirthdayThread } = require('./birthday-service');

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