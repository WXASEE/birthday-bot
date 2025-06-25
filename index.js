const { App } = require('@slack/bolt');
require('dotenv').config();
const { setupCronJobs } = require('./birthday-cron');
const { syncBirthdays } = require('./sync-birthdays');

// Initialize the app with token and signing secret for HTTP mode.
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
  // Bolt will create an ExpressReceiver for you by default
});

// Add a simple health check endpoint for the hosting service
app.receiver.app.get('/health-check', (req, res) => {
  res.status(200).send('Birthday Bot is running!');
});


// Start the application
(async () => {
  // Sync birthdays on startup if configured
  await syncBirthdays();

  // Register cron jobs
  setupCronJobs(app);

  // Start the server, which will listen for events from Slack
  const port = process.env.PORT || 10000;
  await app.start(port);

  console.log(`⚡️ Birthday Bot is running on port ${port}!`);
})();
