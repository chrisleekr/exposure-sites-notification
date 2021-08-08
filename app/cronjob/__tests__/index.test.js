/* eslint-disable global-require */
describe('index.js', () => {
  let index;
  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    jest.mock('node-telegram-bot-api');
    jest.mock('better-sqlite3');

    index = require('../index');
  });

  it('defines expected', () => {
    expect(index).toStrictEqual({
      executeAustraliaVictoria: expect.any(Function)
    });
  });
});
