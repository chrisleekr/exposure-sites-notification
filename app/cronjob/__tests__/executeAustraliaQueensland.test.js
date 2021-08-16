/* eslint-disable global-require */
const fs = require('fs');
const moment = require('moment-timezone');

describe('executeAustraliaQueensland', () => {
  let mockConfigGet;

  let mockLoggerInfo;
  let mockLoggerError;

  let mockGetNotifiedSiteBySubscriberIdAndHash;
  let mockInsertNotifiedSite;

  let mockSendMessage;

  let mockAxiosGet;

  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    jest.mock('node-telegram-bot-api');
    jest.mock('better-sqlite3');

    jest.useFakeTimers('modern');
    jest.setSystemTime(
      moment('2021-08-15 15:31:00').tz('Australia/Brisbane').valueOf()
    );

    mockLoggerInfo = jest.fn();
    mockLoggerError = jest.fn();

    mockConfigGet = jest.fn(key => {
      if (key === 'jobs.executeAustraliaQueensland.dataURL') {
        return 'https://some.gov.au/some-url';
      }
      if (key === 'telegram.adminChatId') {
        return '987654';
      }
      return null;
    });

    jest.mock('config', () => ({
      get: mockConfigGet
    }));

    mockGetNotifiedSiteBySubscriberIdAndHash = jest.fn();
    mockInsertNotifiedSite = jest.fn();

    mockSendMessage = jest.fn();

    jest.mock('../../helpers', () => ({
      logger: {
        info: mockLoggerInfo,
        error: mockLoggerError
      },
      telegram: {
        sendMessage: mockSendMessage
      },
      database: {
        getNotifiedSiteBySubscriberIdAndHash:
          mockGetNotifiedSiteBySubscriberIdAndHash,
        insertNotifiedSite: mockInsertNotifiedSite
      }
    }));

    mockAxiosGet = jest.fn();

    jest.mock('axios', () => ({
      get: mockAxiosGet
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('success', () => {
    describe('when channel id is configured', () => {
      beforeEach(async () => {
        mockConfigGet = jest.fn(key => {
          if (key === 'jobs.executeAustraliaQueensland.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaQueensland.channelChatId') {
            return '@channelId';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: fs.readFileSync(`${__dirname}/fixtures/queensland.html`)
        });
      });

      describe('site has not been notified before', () => {
        beforeEach(async () => {
          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaQueensland
          } = require('../executeAustraliaQueensland');

          executeAustraliaQueensland(logger);
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '1e6b00e04632a515b44bb3443a9d1514'
          );
        });

        it('triggers sendMessage', () => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            '@channelId',
            `<b>Smithfield: Smithfield Shopping Centre</b>\n` +
              `- Address: Kennedy Hwy &, Captain Cook Hwy\n` +
              `- Exposure Date/Time: 23 days ago, Friday 23 July 2021 11.10am - 12pm\n` +
              `- Advice: Low risk`
          );
        });
      });

      describe('site has been notified before', () => {
        beforeEach(async () => {
          mockGetNotifiedSiteBySubscriberIdAndHash = jest.fn().mockReturnValue({
            id: 1,
            subscriberId: '@channelId',
            hash: '55cc1ac1be3b400bda7f53b497e57580'
          });

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaQueensland
          } = require('../executeAustraliaQueensland');

          executeAustraliaQueensland(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '55cc1ac1be3b400bda7f53b497e57580'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });
      });
    });

    describe('when channel id is not configured', () => {
      beforeEach(async () => {
        mockConfigGet = jest.fn(key => {
          if (key === 'jobs.executeAustraliaQueensland.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaQueensland.channelChatId') {
            return '';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: fs.readFileSync(`${__dirname}/fixtures/queensland.html`)
        });

        mockGetNotifiedSiteBySubscriberIdAndHash = jest
          .fn()
          .mockReturnValue(undefined);

        const { logger } = require('../../helpers');

        const {
          execute: executeAustraliaQueensland
        } = require('../executeAustraliaQueensland');

        executeAustraliaQueensland(logger);

        // Fast-forward until all timers have been executed
        jest.runAllTimers();
      });

      it('does not trigger getNotifiedSiteBySubscriberIdAndHash', () => {
        expect(mockGetNotifiedSiteBySubscriberIdAndHash).not.toHaveBeenCalled();
      });

      it('does not trigger sendMessage', () => {
        expect(mockSendMessage).not.toHaveBeenCalled();
      });
    });

    describe('when result is invalid', () => {
      beforeEach(async () => {
        mockConfigGet = jest.fn(key => {
          if (key === 'jobs.executeAustraliaQueensland.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaQueensland.channelChatId') {
            return '@channelId';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });
      });

      describe('when location is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: fs.readFileSync(
              `${__dirname}/fixtures/queensland-invalid-location.html`
            )
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaQueensland
          } = require('../executeAustraliaQueensland');

          executeAustraliaQueensland(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '98a324d29d6bc40b60fdcdac488a967e'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });
      });

      describe('when date is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: fs.readFileSync(
              `${__dirname}/fixtures/queensland-invalid-date.html`
            )
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaQueensland
          } = require('../executeAustraliaQueensland');

          executeAustraliaQueensland(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '547b5b4b708d9e7142b6a298e0d8dbff'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });
      });

      describe('when suburb is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: fs.readFileSync(
              `${__dirname}/fixtures/queensland-invalid-suburb.html`
            )
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaQueensland
          } = require('../executeAustraliaQueensland');

          executeAustraliaQueensland(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '0049c359d32dad994040144d899968c8'
          );
        });

        it('triggers sendMessage', () => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            '@channelId',
            `<b>Bluewater Village Early Learning</b>\n` +
              `- Address: 1 Maritime Way\n` +
              `- Exposure Date/Time: 23 days ago, Friday 23 July 2021 8.30am - 8.45am\n` +
              `- Advice: Low risk`
          );
        });
      });
    });
  });

  describe('error', () => {
    beforeEach(async () => {
      mockAxiosGet = jest
        .fn()
        .mockRejectedValue(new Error('something happened'));

      const { logger } = require('../../helpers');

      const {
        execute: executeAustraliaQueensland
      } = require('../executeAustraliaQueensland');

      executeAustraliaQueensland(logger);

      // Fast-forward until all timers have been executed
      jest.runAllTimers();
    });

    it('triggers error', () => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        '987654',
        expect.any(String)
      );
    });
  });
});
