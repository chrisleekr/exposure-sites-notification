const _ = require('lodash');
const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const { getSubscriber, insertSubscriber } = require('./database');
const logger = require('./logger');

const token = config.get('telegram.token');

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg, _match) => {
  logger.info({ msg }, '/start detected');

  const chatId = msg.from.id;

  const subscriber = getSubscriber(chatId);
  if (subscriber === undefined) {
    logger.info({ msg }, 'Subscriber does not exist in the database. Insert.');
    insertSubscriber({
      id: _.get(msg, ['from', 'id']),
      isBot: _.get(msg, ['from', 'is_bot'], '') ? 1 : 0,
      firstName: _.get(msg, ['from', 'first_name'], ''),
      username: _.get(msg, ['from', 'username'], ''),
      languageCode: _.get(msg, ['from', 'language_code'], ''),
      region: ''
    });
  } else {
    logger.info({ subscriber }, 'Subscriber already exists in the database.');
  }

  const resp =
    `Please subscribe a channel for the notification. ` +
    `Refer https://github.com/chrisleekr/exposure-sites-notification`;

  bot.sendMessage(chatId, resp);
});

const sendMessage = async (chatId, message, options = { parse_mode: 'html' }) =>
  bot.sendMessage(chatId, message, options);

module.exports = { sendMessage };
