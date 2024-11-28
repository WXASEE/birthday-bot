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
  const port = process.env.PORT || 10000; // Default Render port is 10000
  await app.start({
    port: port,
    host: '0.0.0.0' // Required for Render deployment
  });
  console.log(`⚡️ Birthday Bot is running on port ${port}!`);
})();