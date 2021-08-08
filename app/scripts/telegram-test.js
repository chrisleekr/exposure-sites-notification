/* istanbul ignore file */
const config = require('config');
const { logger, telegram } = require('../helpers');

(async () => {
  logger.info('Test telegram');
  const chatId = config.get('telegram.adminChatId');

  await telegram.sendMessage(chatId, '*Test Message*\nMy message');
  process.exit(0);
})();
