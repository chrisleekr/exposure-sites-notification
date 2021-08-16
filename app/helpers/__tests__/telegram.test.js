/* eslint-disable global-require */
const fs = require('fs');

const path = `${__dirname}/../../../database/exposure-sites.db`;

describe('telegram', () => {
  let telegram;
  let db;
  let result;

  let telegramMsg;
  let mockTelegramBotOnText;
  let mockTelegramBotSendMessage;

  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    try {
      fs.unlinkSync(path);
    } catch (err) {
      // eslint-disable-next-line no-empty
    }

    jest.mock('config');

    db = require('../database');
    db.initialise();

    mockTelegramBotOnText = jest.fn((_text, fn) => fn(telegramMsg, null));
    mockTelegramBotSendMessage = jest.fn().mockReturnValue(true);

    jest.mock('node-telegram-bot-api', () =>
      jest.fn().mockImplementation(() => ({
        onText: mockTelegramBotOnText,
        sendMessage: mockTelegramBotSendMessage
      }))
    );
  });

  describe('onText', () => {
    describe('subscriber does not exist in the database and is not bot', () => {
      beforeEach(() => {
        telegramMsg = {
          message_id: 1,
          from: {
            id: 100,
            is_bot: false,
            first_name: 'Chris',
            username: '123456',
            language_code: 'en'
          }
        };

        telegram = require('../telegram');
        result = db.getSubscriber(100);
      });

      it('inserted expected subscriber', () => {
        expect(result).toMatchObject({
          id: 100,
          isBot: 0,
          firstName: 'Chris',
          username: '123456',
          languageCode: 'en',
          region: '' // Country/City, not timezone
        });
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          100,
          expect.any(String)
        );
      });
    });

    describe('subscriber does not exist in the database and is  bot', () => {
      beforeEach(() => {
        telegramMsg = {
          message_id: 1,
          from: {
            id: 100,
            is_bot: true,
            first_name: 'Chris',
            username: '123456',
            language_code: 'en'
          }
        };

        telegram = require('../telegram');
        result = db.getSubscriber(100);
      });

      it('inserted expected subscriber', () => {
        expect(result).toMatchObject({
          id: 100,
          isBot: 1,
          firstName: 'Chris',
          username: '123456',
          languageCode: 'en',
          region: '' // Country/City, not timezone
        });
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          100,
          expect.any(String)
        );
      });
    });

    describe('subscriber does not exist in the database and invalid message', () => {
      beforeEach(() => {
        telegramMsg = {
          message_id: 1,
          from: {
            id: 100
          }
        };

        telegram = require('../telegram');
        result = db.getSubscriber(100);
      });

      it('inserted expected subscriber', () => {
        expect(result).toMatchObject({
          id: 100,
          isBot: 0,
          firstName: '',
          username: '',
          languageCode: '',
          region: '' // Country/City, not timezone
        });
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          100,
          expect.any(String)
        );
      });
    });

    describe('subscriber exists in the database', () => {
      beforeEach(() => {
        db.insertSubscriber({
          id: 101,
          isBot: 0,
          firstName: 'Chris1',
          username: '123457',
          languageCode: 'en',
          region: ''
        });

        telegramMsg = {
          message_id: 1,
          from: {
            id: 101,
            is_bot: false,
            first_name: 'Chris1',
            username: '123457',
            language_code: 'en'
          }
        };

        telegram = require('../telegram');

        result = db.getSubscriber(101);
      });

      it('inserted expected subscriber', () => {
        expect(result).toMatchObject({
          id: 101,
          isBot: 0,
          firstName: 'Chris1',
          username: '123457',
          languageCode: 'en',
          region: ''
        });
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          101,
          expect.any(String)
        );
      });
    });
  });

  describe('sendMessage', () => {
    describe('without options', () => {
      beforeEach(() => {
        telegram = require('../telegram');

        telegram.sendMessage(100, 'My message');
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          100,
          'My message',
          { parse_mode: 'html' }
        );
      });
    });

    describe('with options', () => {
      beforeEach(() => {
        telegram = require('../telegram');

        telegram.sendMessage(100, 'My message', { another: 'option' });
      });

      it('triggers sendMessage', () => {
        expect(mockTelegramBotSendMessage).toHaveBeenCalledWith(
          100,
          'My message',
          { another: 'option' }
        );
      });
    });
  });
});
