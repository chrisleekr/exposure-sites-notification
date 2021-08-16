/* eslint-disable global-require */
const moment = require('moment-timezone');

describe('executeAustraliaVictoria', () => {
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
      moment('2021-08-15 15:31:00').tz('Australia/Melbourne').valueOf()
    );

    mockLoggerInfo = jest.fn();
    mockLoggerError = jest.fn();

    mockConfigGet = jest.fn(key => {
      if (key === 'jobs.executeAustraliaVictoria.dataURL') {
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
          if (key === 'jobs.executeAustraliaVictoria.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaVictoria.channelChatId') {
            return '@channelId';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: {
            result: {
              records: [
                {
                  Suburb: 'Melbourne',
                  Site_title: 'Some site',
                  Site_postcode: '1234',
                  Exposure_date: '12/08/2021',
                  Exposure_time: '15:31:00',
                  Advice_title: 'Tier 1',
                  Advice_instruction: 'Get isolated',
                  Notes: 'Some note',
                  Exposure_time_start_24: '15:31:00'
                }
              ]
            }
          }
        });
      });

      describe('site has not been notified before', () => {
        beforeEach(async () => {
          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          executeAustraliaVictoria(logger);

          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            'cd48e63c10f7af1dbe2ddb00caee40fb'
          );
        });

        it('triggers sendMessage', () => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            '@channelId',
            `<b>Melbourne: Some site</b>\n` +
              `- Exposure Date/Time: 3 days ago, 12/08/2021 15:31:00\n` +
              `- Suburb/Postcode: Melbourne 1234\n` +
              `- Advice: Tier 1\n` +
              `- Instruction: Get isolated\n` +
              `- Note: Some note`
          );
        });
      });

      describe('site has been notified before', () => {
        beforeEach(async () => {
          mockGetNotifiedSiteBySubscriberIdAndHash = jest.fn().mockReturnValue({
            id: 1,
            subscriberId: '@channelId',
            hash: 'cd48e63c10f7af1dbe2ddb00caee40fb'
          });

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          executeAustraliaVictoria(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            'cd48e63c10f7af1dbe2ddb00caee40fb'
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
          if (key === 'jobs.executeAustraliaVictoria.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaVictoria.channelChatId') {
            return '';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: {
            result: {
              records: [
                {
                  Suburb: 'Melbourne',
                  Site_title: 'Some site',
                  Site_postcode: '1234',
                  Exposure_date: '12/08/2021',
                  Exposure_time: '15:31:00',
                  Advice_title: 'Tier 1',
                  Advice_instruction: 'Get isolated',
                  Notes: 'Some note',
                  Exposure_time_start_24: '15:31:00'
                }
              ]
            }
          }
        });

        mockGetNotifiedSiteBySubscriberIdAndHash = jest
          .fn()
          .mockReturnValue(undefined);

        const { logger } = require('../../helpers');

        const {
          execute: executeAustraliaVictoria
        } = require('../executeAustraliaVictoria');

        executeAustraliaVictoria(logger);

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
          if (key === 'jobs.executeAustraliaVictoria.dataURL') {
            return 'https://some.gov.au/some-url';
          }
          if (key === 'jobs.executeAustraliaVictoria.channelChatId') {
            return '@channelId';
          }
          if (key === 'telegram.adminChatId') {
            return '987654';
          }
          return null;
        });
      });

      describe('when site title is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: {
              result: {
                records: [
                  {
                    Suburb: 'Melbourne',
                    Site_postcode: '1234',
                    Exposure_date: '12/08/2021',
                    Exposure_time: '15:31:00',
                    Advice_title: 'Tier 1',
                    Advice_instruction: 'Get isolated',
                    Notes: 'Some note',
                    Exposure_time_start_24: '15:31:00'
                  }
                ]
              }
            }
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          executeAustraliaVictoria(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '2f3ebb26e51c02d87ea3ecc54e68cf79'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });
      });

      describe('when exposure date is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: {
              result: {
                records: [
                  {
                    Suburb: 'Melbourne',
                    Site_title: 'Some site',
                    Site_postcode: '1234',
                    Exposure_time: '15:31:00',
                    Advice_title: 'Tier 1',
                    Advice_instruction: 'Get isolated',
                    Notes: 'Some note',
                    Exposure_time_start_24: '15:31:00'
                  }
                ]
              }
            }
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          executeAustraliaVictoria(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '3e4d8a288b57c6456131746280fe2a0b'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });
      });

      describe('when suburb is not provided', () => {
        beforeEach(async () => {
          mockAxiosGet = jest.fn().mockResolvedValue({
            data: {
              result: {
                records: [
                  {
                    Site_title: 'Some site',
                    Site_postcode: '1234',
                    Exposure_date: '2021-08-08',
                    Exposure_time: '15:31:00',
                    Advice_title: 'Tier 1',
                    Advice_instruction: 'Get isolated',
                    Notes: 'Some note',
                    Exposure_time_start_24: '15:31:00'
                  }
                ]
              }
            }
          });

          mockGetNotifiedSiteBySubscriberIdAndHash = jest
            .fn()
            .mockReturnValue(undefined);

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          executeAustraliaVictoria(logger);
          // Fast-forward until all timers have been executed
          jest.runAllTimers();
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            '@channelId',
            '8f797e783edb059045c378f54401d3f2'
          );
        });

        it('triggers sendMessage', () => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            '@channelId',
            `<b>Some site</b>\n` +
              `- Exposure Date/Time: Invalid date, 2021-08-08 15:31:00\n` +
              `- Suburb/Postcode: N/A 1234\n` +
              `- Advice: Tier 1\n` +
              `- Instruction: Get isolated\n` +
              `- Note: Some note`
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
        execute: executeAustraliaVictoria
      } = require('../executeAustraliaVictoria');

      executeAustraliaVictoria(logger);

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
