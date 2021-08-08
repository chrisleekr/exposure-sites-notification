const { logger: rootLogger, database } = require('./helpers');
const { runCronjob } = require('./server-cronjob');

(async () => {
  const logger = rootLogger.child({
    gitHash: process.env.GIT_HASH || 'unspecified'
  });

  database.initialise();

  await runCronjob(logger);
})();
