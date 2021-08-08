/* eslint-disable global-require */
describe('server', () => {
  let mockDatabase;
  let mockDatabaseInitialise;
  let mockRunCronJob;

  let mockLoggerChild;

  beforeEach(async () => {
    jest.clearAllMocks().resetModules();

    mockDatabaseInitialise = jest.fn().mockResolvedValue(true);
    mockDatabase = {
      initialise: mockDatabaseInitialise
    };

    mockRunCronJob = jest.fn().mockResolvedValue(true);

    mockLoggerChild = jest.fn().mockResolvedValue({ child: 'logger' });
    jest.mock('../helpers', () => ({
      logger: { me: 'logger', child: mockLoggerChild },
      database: mockDatabase
    }));

    jest.mock('../server-cronjob', () => ({ runCronjob: mockRunCronJob }));

    require('../server');
  });

  it('triggers database.initialise', () => {
    expect(mockDatabaseInitialise).toHaveBeenCalled();
  });

  it('triggers runCronjob', () => {
    expect(mockRunCronJob).toHaveBeenCalled();
  });
});
