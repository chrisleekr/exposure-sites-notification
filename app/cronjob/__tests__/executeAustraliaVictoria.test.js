/* eslint-disable global-require */
describe('executeAustraliaVictoria', () => {
  let result;

  let mockConfigGet;

  let mockLoggerInfo;
  let mockLoggerError;

  let mockGetSubscribersByRegion;
  let mockGetNotifiedSiteBySubscriberIdAndHash;
  let mockInsertNotifiedSite;
  let mockUpdateSubscriberLastNotifiedAt;

  let mockSendMessage;

  let mockAxiosGet;

  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    jest.mock('node-telegram-bot-api');
    jest.mock('better-sqlite3');

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

    mockGetSubscribersByRegion = jest.fn();
    mockGetNotifiedSiteBySubscriberIdAndHash = jest.fn();
    mockInsertNotifiedSite = jest.fn();
    mockUpdateSubscriberLastNotifiedAt = jest.fn();

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
        getSubscribersByRegion: mockGetSubscribersByRegion,
        getNotifiedSiteBySubscriberIdAndHash:
          mockGetNotifiedSiteBySubscriberIdAndHash,
        insertNotifiedSite: mockInsertNotifiedSite,
        updateSubscriberLastNotifiedAt: mockUpdateSubscriberLastNotifiedAt
      }
    }));

    mockAxiosGet = jest.fn();

    jest.mock('axios', () => ({
      get: mockAxiosGet
    }));
  });

  describe('success', () => {
    describe('when subscriber is never notified', () => {
      beforeEach(async () => {
        mockGetSubscribersByRegion = jest.fn().mockReturnValue([
          {
            id: 1,
            lastNotifiedAt: null
          }
        ]);

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: {
            result: {
              records: [
                {
                  Site_title: 'Some site',
                  Site_postcode: '1234',
                  Exposure_date: '2021-08-08',
                  Exposure_time: '00:00:00',
                  Advice_title: 'Tier 1',
                  Advice_instruction: 'Get isolated',
                  Notes: 'Some note'
                }
              ]
            }
          }
        });

        const { logger } = require('../../helpers');

        const {
          execute: executeAustraliaVictoria
        } = require('../executeAustraliaVictoria');

        result = await executeAustraliaVictoria(logger);
      });

      it('triggers axios.get', () => {
        expect(mockAxiosGet).toHaveBeenCalledWith(
          'https://some.gov.au/some-url'
        );
      });

      it('triggers getSubscribersByRegion', () => {
        expect(mockGetSubscribersByRegion).toHaveBeenCalledWith(
          'Australia/Melbourne'
        );
      });

      it('triggers insertNotifiedSite', () => {
        expect(mockInsertNotifiedSite).toHaveBeenCalledWith({
          subscriberId: 1,
          hash: '527b0a6e35f4d2ee7ce07fab36ba7ac2'
        });
      });

      it('does not trigger getNotifiedSiteBySubscriberIdAndHash', () => {
        expect(mockGetNotifiedSiteBySubscriberIdAndHash).not.toHaveBeenCalled();
      });

      it('does not trigger sendMessage', () => {
        expect(mockSendMessage).not.toHaveBeenCalled();
      });

      it('triggers updateSubscriberLastNotifiedAt', () => {
        expect(mockUpdateSubscriberLastNotifiedAt).toHaveBeenCalledWith(
          1,
          expect.any(String)
        );
      });

      it('returns result', () => {
        expect(result).toBeTruthy();
      });
    });

    describe('when subscriber is already notified before', () => {
      beforeEach(() => {
        mockGetSubscribersByRegion = jest.fn().mockReturnValue([
          {
            id: 1,
            lastNotifiedAt: '2021-08-08T00:00:00+00:00:00'
          }
        ]);

        mockAxiosGet = jest.fn().mockResolvedValue({
          data: {
            result: {
              records: [
                {
                  Site_title: 'Some site',
                  Site_postcode: '1234',
                  Exposure_date: '2021-08-08',
                  Exposure_time: '00:00:00',
                  Advice_title: 'Tier 1',
                  Advice_instruction: 'Get isolated',
                  Notes: 'Some note'
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

          result = await executeAustraliaVictoria(logger);
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            1,
            '527b0a6e35f4d2ee7ce07fab36ba7ac2'
          );
        });

        it('triggers sendMessage', () => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('Some site')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('1234')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('2021-08-08')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('00:00:00')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('Tier 1')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('Get isolated')
          );
          expect(mockSendMessage).toHaveBeenCalledWith(
            1,
            expect.stringContaining('Some note')
          );
        });

        it('triggers updateSubscriberLastNotifiedAt', () => {
          expect(mockUpdateSubscriberLastNotifiedAt).toHaveBeenCalledWith(
            1,
            expect.any(String)
          );
        });

        it('returns result', () => {
          expect(result).toBeTruthy();
        });
      });

      describe('site has been notified before', () => {
        beforeEach(async () => {
          mockGetNotifiedSiteBySubscriberIdAndHash = jest.fn().mockReturnValue({
            id: 1,
            subscriberId: 1,
            hash: '527b0a6e35f4d2ee7ce07fab36ba7ac2'
          });

          const { logger } = require('../../helpers');

          const {
            execute: executeAustraliaVictoria
          } = require('../executeAustraliaVictoria');

          result = await executeAustraliaVictoria(logger);
        });

        it('triggers getNotifiedSiteBySubscriberIdAndHash', () => {
          expect(mockGetNotifiedSiteBySubscriberIdAndHash).toHaveBeenCalledWith(
            1,
            '527b0a6e35f4d2ee7ce07fab36ba7ac2'
          );
        });

        it('does not trigger sendMessage', () => {
          expect(mockSendMessage).not.toHaveBeenCalled();
        });

        it('triggers updateSubscriberLastNotifiedAt', () => {
          expect(mockUpdateSubscriberLastNotifiedAt).toHaveBeenCalledWith(
            1,
            expect.any(String)
          );
        });

        it('returns result', () => {
          expect(result).toBeTruthy();
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

      result = await executeAustraliaVictoria(logger);
    });

    it('triggers error', () => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        '987654',
        expect.any(String)
      );
    });
  });
});
