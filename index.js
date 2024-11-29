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

// Register commands and setup cron jobs before starting
registerCommands(app);
setupCronJobs(app);

// Start the app and listen for connections immediately
const port = process.env.PORT || 10000;
app.start(port)
  .then(() => {
    console.log(`⚡️ Birthday Bot is running on port ${port}!`);
  })
  .catch(error => {
    console.error('Error starting the app:', error);
    process.exit(1);
  });