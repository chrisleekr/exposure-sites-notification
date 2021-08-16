/* eslint-disable global-require */

describe('server-cronjob', () => {
  let logger;
  let config;

  let mockCronJob;
  let mockTaskRunning = false;

  const mockExecuteAustraliaVictoria = jest.fn().mockResolvedValue(true);
  const mockExecuteAustraliaQueensland = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    jest.mock('config');

    jest.mock('../cronjob', () => ({
      executeAustraliaVictoria: mockExecuteAustraliaVictoria,
      executeAustraliaQueensland: mockExecuteAustraliaQueensland
    }));

    mockCronJob = jest
      .fn()
      .mockImplementation(
        (_cronTime, onTick, _onComplete, _start, _timeZone) => ({
          taskRunning: mockTaskRunning,
          start: jest.fn(() => onTick())
        })
      );

    jest.mock('cron', () => ({
      CronJob: mockCronJob
    }));

    config = require('config');
    logger = require('bunyan');
  });

  [
    {
      job: 'executeAustraliaVictoria',
      mockFunc: mockExecuteAustraliaVictoria
    },
    {
      job: 'executeAustraliaQueensland',
      mockFunc: mockExecuteAustraliaQueensland
    }
  ].forEach(t => {
    describe(`${t.job}`, () => {
      describe('when is enabled', () => {
        beforeEach(async () => {
          config.get = jest.fn(key => {
            switch (key) {
              case `jobs.${t.job}.enabled`:
                return true;
              case `jobs.${t.job}.cronTime`:
                return '0 */10 * * * *';
              case 'tz':
                return 'Australia/Melbourne';
              default:
                return `value-${key}`;
            }
          });
        });

        describe('when task is already running', () => {
          beforeEach(async () => {
            mockTaskRunning = true;
            const { runCronjob } = require('../server-cronjob');
            await runCronjob(logger);
          });

          it('initialise CronJob', () => {
            expect(mockCronJob).toHaveBeenCalledWith(
              '0 */10 * * * *',
              expect.any(Function),
              null,
              false,
              'Australia/Melbourne'
            );
          });

          it(`does not trigger ${t.job}`, () => {
            expect(t.mockFunc).not.toHaveBeenCalled();
          });
        });

        describe('when task is not running', () => {
          beforeEach(async () => {
            mockTaskRunning = false;
            const { runCronjob } = require('../server-cronjob');
            await runCronjob(logger);
          });

          it('initialise CronJob', () => {
            expect(mockCronJob).toHaveBeenCalledWith(
              '0 */10 * * * *',
              expect.any(Function),
              null,
              false,
              'Australia/Melbourne'
            );
          });

          it(`triggers ${t.job}`, () => {
            expect(t.mockFunc).toHaveBeenCalled();
          });
        });
      });

      describe('when is disabled', () => {
        beforeEach(async () => {
          config.get = jest.fn(key => {
            switch (key) {
              case `jobs.executeAustraliaVictoria.enabled`:
              case `jobs.executeAustraliaQueensland.enabled`:
                return false;
              default:
                return `value-${key}`;
            }
          });

          mockTaskRunning = false;
          const { runCronjob } = require('../server-cronjob');
          await runCronjob(logger);
        });

        it('does not initialise CronJob', () => {
          expect(mockCronJob).not.toHaveBeenCalled();
        });

        it(`does not trigger ${t.job}`, () => {
          expect(t.mockFunc).not.toHaveBeenCalled();
        });
      });
    });
  });
});
