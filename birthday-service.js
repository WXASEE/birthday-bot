const cron = require('node-cron');
const { db, statements } = require('./database');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Birthday channel ID where messages will be posted
const BIRTHDAY_CHANNEL = process.env.BIRTHDAY_CHANNEL;

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

async function generateBirthdayPoem(descriptions) {
  try {
    // Format descriptions into a single string
    const descriptionsText = descriptions
      .map(desc => desc.message)
      .join('\n');

    console.log(descriptionsText)
    // Create the prompt for Claude
    const prompt = `Based on these descriptions of some from their colleagues:\n\n${descriptionsText}\n\nWrite a warm, personal, and fun birthday poem that incorporates these qualities and characteristics. The poem should be light-hearted and celebratory. Just return the poem and no introduction or other text. Format it with line breaks.`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract the poem from the response
    const poem = response.content[0].text.trim();
    return poem;

  } catch (error) {
    console.error('Error generating poem with Claude:', error);
    // Return a fallback poem if Claude API fails
    return "Here's to another year of joy and cheer,\nWith colleagues who hold you ever so dear.\nYour presence makes our workplace bright,\nHappy birthday, may your day be just right!";
  }
}

async function triggerBirthdayCollection(client, celebrantId) {
  try {

    const exists = statements.checkUserExists.get(celebrantId);
    if (!exists.count) {
      statements.insertBirthday.run(celebrantId, null);
    }
    
    const result = await client.users.list();
    const users = result.members.filter(user => 
      !user.is_bot && 
      !user.is_restricted && 
      !user.is_ultra_restricted &&
      user.id !== celebrantId && 
      user.name !== celebrantId
    );

    for (const user of users) {
      const descriptionPrompt = getRandomPrompt();
      await client.chat.postMessage({
        channel: user.id,
        text: `Birthday message collection for <@${celebrantId}>`,
        blocks: [
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
            }
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
      });
    }
  } catch (error) {
    console.error('Error sending birthday collection messages:', error);
  }
}

async function postBirthdayThread(client, celebrantId) {
  try {
    const mainPost = await client.chat.postMessage({
      channel: BIRTHDAY_CHANNEL,
      text: `Happy Birthday <@${celebrantId}>! 🎂`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:birthday: *Happy Birthday <@${celebrantId}>!* :balloon:\n\nYour colleagues have some special messages for you! Check out the thread below. :arrow_down:`
          }
        }
      ]
    });

    // Get all descriptions and combine them into one message
    const descriptions = statements.getDescriptionMessages.all(celebrantId);
    
    if (descriptions.length > 0) {
      // Generate poem from descriptions
      const poem = await generateBirthdayPoem(descriptions);

      // Post the poem first in the thread
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: "*A special birthday poem for you:*\n\n" + poem + "\n\n:birthday: :sparkles: :cake:"
      });

      // Post the descriptions
      let descriptionMessage = "*Here's what your colleagues say about you:*\n\n";
      for (const desc of descriptions) {
        descriptionMessage += `• ${desc.message} _- ${desc.sender_name}_\n\n`;
      }
      
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: descriptionMessage
      });

      // Mark descriptions as sent
      statements.markDescriptionMessagesAsSent.run(celebrantId);
    }

    const messages = statements.getBirthdayMessages.all(celebrantId);
    
    for (const message of messages) {
      let text = `${message.sender_name} says:\n${message.message}`;
      if (message.media_url) {
        text += `<${message.media_url}|.>`;
      }
      await client.chat.postMessage({
        channel: BIRTHDAY_CHANNEL,
        thread_ts: mainPost.ts,
        text: text
      });
    }

    // Mark messages as sent
    statements.markMessagesAsSent.run(celebrantId);

  } catch (error) {
    console.error('Error posting birthday thread:', error);
  }
}

module.exports = {
  postBirthdayThread,
  triggerBirthdayCollection
};