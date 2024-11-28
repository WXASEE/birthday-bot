const { App } = require('@slack/bolt');
require('dotenv').config();
const registerCommands = require('./commands');
const { setupCronJobs } = require('./birthday-cron');

// Initialize the app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Register commands
registerCommands(app);

// Set up cron jobs
setupCronJobs(app);

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Birthday Bot is running!');
})();