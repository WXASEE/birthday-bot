const { db, statements } = require('./database');
const { postBirthdayThread, triggerBirthdayCollection } = require('./birthday-service');

// Helper function to format date
function formatDate(dateStr) {
  const [day, month] = dateStr.split('-');
  const date = new Date(2000, parseInt(month) - 1, parseInt(day));
  return date.toLocaleString('default', { month: 'long', day: 'numeric' });
}

// Validate date format (DD-MM)
function isValidDate(dateStr) {
  if (!/^\d{2}-\d{2}$/.test(dateStr)) return false;
  
  const [day, month] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  
  const daysInMonth = new Date(2000, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
}

// Helper to find a user by ID from a mention
async function findUserFromMention(client, userMention) {
    const userId = userMention.replace(/[<@>]/g, '');
    try {
        const result = await client.users.info({ user: userId });
        if (result.ok) {
            return result.user;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
}


function registerCommands(app) {
  // Command to set birthday (DD-MM)
  app.command('/set-birthday', async ({ command, ack, say, client }) => {
    try {
      await ack();
      
      const parts = command.text.trim().split(' ');
      
      if (parts.length !== 2) {
        await say("Please use the format: `/set-birthday @user DD-MM`");
        return;
      }

      let [userMention, birthDate] = parts;

      if (!isValidDate(birthDate)) {
        await say("Please provide a valid date in DD-MM format (e.g., 11-02 for February 11th)");
        return;
      }

      const userId = userMention.replace(/[<@>]/g, '');
      const user = await findUserFromMention(client, userId);
        
      if (!user) {
        await say(`Could not find user ${userMention}. Please make sure it's a valid user mention.`);
        return;
      }
      // Save to database
      statements.insertBirthday.run(user.id, birthDate);

      // Format date for display
      const formattedDate = formatDate(birthDate);
      const firstName = user.profile.first_name || (user.real_name).split(' ')[0];

      await say({
        text: `Birthday set for ${firstName}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ ${firstName}'s birthday set for *${formattedDate}*`
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error in /set-birthday command:', error);
      await say("Sorry, there was an error setting the birthday. Please try again.");
    }
  });

  // Command to list all birthdays
  app.command('/see-birthdays', async ({ command, ack, say, client }) => {
    try {
      await ack();
      
      const birthdays = statements.getAllBirthdays.all();
      
      if (birthdays.length === 0) {
        await say("No birthdays have been set yet!");
        return;
      }

      // We need user info to display names
      const userInfos = await Promise.all(
        birthdays.map(b => findUserFromMention(client, b.user_id).catch(() => null))
      );
      
      const birthdaysWithNames = birthdays.map((birthday, index) => {
        const user = userInfos[index];
        const slackName = user ? (user.real_name || user.name) : `<@${birthday.user_id}>`;
        return { ...birthday, slackName };
      }).filter(b => b.birth_date !== '1900-01-01');

      const birthdaysByMonth = birthdaysWithNames.reduce((acc, birthday) => {
        const [day, month] = birthday.birth_date.split('-');
        const date = new Date(2000, parseInt(month) - 1, parseInt(day));
        const monthName = date.toLocaleString('default', { month: 'long' });

        if (!acc[monthName]) {
          acc[monthName] = [];
        }
        acc[monthName].push({
          day: parseInt(day),
          slackName: birthday.slackName
        });
        return acc;
      }, {});

      let message = "*🎂 Birthday Calendar*\n\n";
      
      // Sort months correctly
      const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      monthOrder.forEach(month => {
        if (birthdaysByMonth[month]) {
            message += `*${month}*\n`;
            const sortedBirthdays = birthdaysByMonth[month].sort((a, b) => a.day - b.day);
            for (const bday of sortedBirthdays) {
              message += `• ${bday.day} - ${bday.slackName}\n`;
            }
            message += "\n";
        }
      });

      await say({
        text: "Birthday Calendar",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error listing birthdays:', error);
      await say("Sorry, there was an error listing the birthdays.");
    }
  });

  // Command to manually trigger message collection
  app.command('/collect-birthday-messages', async ({ command, ack, client, say }) => {
    try {
      await ack();
      const userMention = command.text.trim();
      
      if (!userMention) {
        await say("Please provide a user mention, e.g., `/collect-birthday-messages @user`");
        return;
      }

      const user = await findUserFromMention(client, userMention);
      
      if (!user) {
        await say(`Could not find user ${userMention}.`);
        return;
      }

      await triggerBirthdayCollection(client, user.id);
      await say({
        text: "Birthday message collection started",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:mailbox_with_mail: Birthday message collection for <@${user.id}> has been initiated!`
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error handling collect command:', error);
      await say("An error occurred while starting the birthday message collection.");
    }
  });

  // Action handler for the "Submit" button
  app.action('submit_birthday_content', async ({ body, ack, client, action }) => {
    try {
      await ack();
      
      // Get celebrant ID reliably from the action's value
      const celebrantId = action.value;
      if (!celebrantId) {
          console.error('Could not find celebrant ID in action value');
          // Optionally send an error message to the user
          await client.chat.postMessage({
              channel: body.user.id,
              text: "Sorry, there was an error submitting your content. The celebrant ID was missing. Please contact the administrator."
          });
          return;
      }

      const senderId = body.user.id;

      // Ensure the celebrant exists in the birthdays table
      const exists = statements.checkUserExists.get(celebrantId);
      if (!exists.count) {
        // This case should be rare, but good to handle
        throw new Error('User does not exist in birthdays table');
      }

      // Get sender's user info
      const userResult = await client.users.info({ user: senderId });
      const senderName = userResult.user.real_name || userResult.user.name;

      // Extract values from the view submission
      const values = body.state.values;
      const messageText = values.message_input_block?.message_input?.value || null;
      const descriptionText = values.description_input_block?.description_input?.value || null;
      const mediaUrl = values.media_input_block?.media_input?.value || null;

      if (!messageText && !descriptionText) {
        await client.chat.postMessage({
          channel: senderId,
          text: "Please enter either a birthday message or a description before submitting!"
        });
        return;
      }
      
      if (messageText) {
        statements.insertBirthdayMessage.run(celebrantId, senderId, senderName, messageText, mediaUrl);
      }
      if (descriptionText) {
        statements.insertDescriptionMessage.run(celebrantId, senderId, senderName, descriptionText);
      }

      let confirmationMessage = "Thanks for submitting your ";
      if (messageText && descriptionText) {
        confirmationMessage += "birthday message and description";
      } else if (messageText) {
        confirmationMessage += "birthday message";
      } else {
        confirmationMessage += "description";
      }
      confirmationMessage += ` for <@${celebrantId}>! 🎉`;

      // Delete the original message containing the form
      await client.chat.delete({
        channel: body.channel.id,
        ts: body.message.ts
      });

      // Confirm receipt to the sender
      await client.chat.postMessage({
        channel: senderId,
        text: confirmationMessage
      });

      console.log(`Stored birthday content from ${senderId} for ${celebrantId}`);

    } catch (error) {
      console.error('Error handling content submission:', error);
      try {
        await client.chat.postMessage({
          channel: body.user.id,
          text: "Sorry, there was an error submitting your content. Please contact the administrator."
        });
      } catch (msgError) {
        console.error('Error sending error message:', msgError);
      }
    }
  });

  // Command to manually post the birthday thread
  app.command('/post-birthday-thread', async ({ command, ack, client, say }) => {
    try {
      await ack();
      const userMention = command.text.trim();
      
      if (!userMention) {
        await say("Please provide a user mention, e.g., `/post-birthday-thread @user`");
        return;
      }

      const user = await findUserFromMention(client, userMention);
      
      if (!user) {
        await say(`Could not find user ${userMention}.`);
        return;
      }

      await postBirthdayThread(client, user.id);
      await say({
        text: "Birthday thread posted",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:tada: Birthday thread for <@${user.id}> has been posted!`
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error handling post command:', error);
      await say("An error occurred while posting the birthday thread.");
    }
  });
}

module.exports = registerCommands;
