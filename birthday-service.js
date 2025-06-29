const cron = require('node-cron');
const { db, statements } = require('./database');
// Predefined birthday greetings to avoid using an LLM
const birthdayGreetings = [
  "🎉 Happy birthday! Wishing you a year full of success and joy!",
  "Hope your special day is amazing. Happy birthday!",
  "Cheers to another fantastic year ahead. Happy birthday!",
  "May your birthday be as awesome as you are!",
  "Wishing you lots of cake and laughter today!",
  "Have a wonderful birthday and a brilliant year ahead!",
  "Sending you our best wishes on your birthday!",
  "May all your dreams come true this year. Happy birthday!",
  "Enjoy your day to the fullest. Happy birthday!",
  "Here's to a day filled with celebration. Happy birthday!",
  "Warmest wishes for a very happy birthday!",
  "Have an incredible birthday and a fantastic year!"
];

const getRandomGreeting = () =>
  birthdayGreetings[Math.floor(Math.random() * birthdayGreetings.length)];

// Channel IDs where messages will be posted
const BIRTHDAY_CHANNEL = process.env.BIRTHDAY_CHANNEL;
const ADMIN_CHANNEL = process.env.ADMIN_CHANNEL;

// Description message prompts
const descriptionPrompts = [
  "What makes them unique and essential?",
  "What's something you admire about them?",
  "What's their defining feature?",
  "What makes them amazing to work with?",
  "How would you describe them in one word?",
  "What's their superpower?"
];

// Function to get a random description prompt
const getRandomPrompt = () => {
  const randomIndex = Math.floor(Math.random() * descriptionPrompts.length);
  return descriptionPrompts[randomIndex];
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function generateBirthdayMessage() {
  return getRandomGreeting();
}

const generateBirthdayCollectionBlocks = (celebrantId) => {
  const descriptionPrompt = getRandomPrompt();
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hey! :birthday: *<@${celebrantId}>* has a birthday coming up in 7 days!`
      }
    },
    {
      type: "input",
      block_id: "message_input_block",
      element: {
        type: "plain_text_input",
        action_id: "message_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "Type your birthday message here..."
        }
      },
      label: {
        type: "plain_text",
        text: "Your Birthday Message"
      }
    },
    {
      type: "input",
      block_id: "media_input_block",
      element: {
        type: "plain_text_input",
        action_id: "media_input",
        placeholder: {
          type: "plain_text",
          text: "Paste a URL to a GIF or image..."
        }
      },
      label: {
        type: "plain_text", 
        text: "Optional: Add Media (Hint: Use /giphy to search for a GIF and copy the URL)"
      },
      optional: true
    },
    {
      type: "divider"
    },
    {
      type: "input",
      block_id: "description_input_block",
      element: {
        type: "plain_text_input",
        action_id: "description_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: `${descriptionPrompt}`
        }
      },
      label: {
        type: "plain_text",
        text: "Describe Them"
      },
      optional: true
    },
    {
      type: "actions",
      block_id: "submit_block",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Submit",
            emoji: true
          },
          action_id: "submit_birthday_content",
          value: `${celebrantId}`
        }
      ]
    }
  ]
}

async function triggerBirthdayCollection(client, celebrantId) {
  try {
    const exists = statements.checkUserExists.get(celebrantId);
    if (!exists.count) {
      throw new Error('User does not exist in birthdays table');
    }

    const today = new Date().toISOString().split('T')[0];
    const birthday = statements.getBirthday.get(celebrantId);
    
    if (birthday.last_notification_date === today) {
      console.log(`Already sent notifications for ${celebrantId} today`);
      return;
    }
    
    const result = await client.users.list();
    const users = result.members.filter(user => 
      !user.is_bot && 
      !user.deleted &&
      !user.is_restricted && 
      !user.is_ultra_restricted &&
      user.id !== celebrantId && 
      user.id !== 'USLACKBOT'
    );

    const userBatches = chunk(users, 10);

    console.log(`Attempting to send messages to ${users.length} users in ${userBatches.length} batches`);

    for (const batch of userBatches) {
      await Promise.all(batch.map(async (user) => {
        try {
          await client.chat.postMessage({
            channel: user.id,
            text: `Birthday message collection for <@${celebrantId}>`,
            blocks: generateBirthdayCollectionBlocks(celebrantId)
          });
          console.log(`Sent birthday message collection to ${user.id}`);
        } catch (error) {
           if (error.data.error === 'cannot_dm_user') {
               console.log(`Skipping user ${user.id} because DMs are not open.`);
           } else {
               console.error(`Error sending birthday collection message to ${user.id}:`, error.data);
           }
        }
      }));
      
      await delay(2500); // Delay between batches to avoid rate limits
    }

    await client.chat.postMessage({
      channel: ADMIN_CHANNEL,
      text: `Birthday message collection trigger sent to ${users.length} users for <@${celebrantId}>.`
    });

    console.log(`Updating last notification date for ${celebrantId}`);
    statements.updateLastNotificationDate.run(celebrantId);
  } catch (error) {
    await client.chat.postMessage({
      channel: ADMIN_CHANNEL,
      text: `Error triggering birthday collection for <@${celebrantId}>: ${error.message}`
    });
    console.error('Error triggering birthday collection:', error);
  }
}

async function postBirthdayThread(client, celebrantId) {
  try {
    console.log(`Getting birthday messages for ${celebrantId}`);
    const messages = statements.getBirthdayMessages.all(celebrantId);

    if (messages.length === 0) {
      console.log(`No birthday messages found for ${celebrantId}, posting a default message.`);
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        text: `สุขสันต์วันเกิด (Happy Birthday) <@${celebrantId}>! 🎂`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:birthday: *สุขสันต์วันเกิด (Happy Birthday) <@${celebrantId}>!* :balloon:\n\nWishing you a fantastic day and a wonderful year ahead!`
            }
          }
        ]
      });
      return;
    }

    const mainPost = await client.chat.postMessage({
      channel: BIRTHDAY_CHANNEL,
      text: `สุขสันต์วันเกิด (Happy Birthday) <@${celebrantId}>! 🎂`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:birthday: *สุขสันต์วันเกิด (Happy Birthday) <@${celebrantId}>!* :balloon:\n\nYour colleagues have some special messages for you! Check out the thread below. :arrow_down:`
          }
        }
      ]
    });

    const descriptions = statements.getDescriptionMessages.all(celebrantId);

    if (descriptions.length > 0) {
      const greeting = generateBirthdayMessage();
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: `*${greeting}*`
      });

      let descriptionMessage = "*Here's what your colleagues say about you:*\n\n";
      for (const desc of descriptions) {
        descriptionMessage += `• ${desc.message} _- ${desc.sender_name}_\n`;
      }
      
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: descriptionMessage
      });

      statements.markDescriptionMessagesAsSent.run(celebrantId);
    }
    
    for (const message of messages) {
      let text = `${message.sender_name} says:\n${message.message}`;
      let blocks;
      if (message.media_url) {
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${message.sender_name} says:* \n${message.message}`
            }
          },
          {
            type: "image",
            image_url: message.media_url,
            alt_text: "Birthday Media"
          }
        ];
        text += `\n${message.media_url}`; // Fallback text
      } else {
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${message.sender_name} says:* \n${message.message}`
            }
          }
        ];
      }

      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: text, // Fallback for notifications
        blocks: blocks
      });
    }

    statements.markMessagesAsSent.run(celebrantId);

  } catch (error) {
    await client.chat.postMessage({
      channel: ADMIN_CHANNEL,
      text: `Error posting birthday thread for <@${celebrantId}>: ${error.message}`
    });
    console.error('Error posting birthday thread:', error);
  }
}

module.exports = {
  postBirthdayThread,
  triggerBirthdayCollection
};
