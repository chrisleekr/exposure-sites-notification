/* eslint-disable global-require */
const fs = require('fs');

const path = `${__dirname}/../../../database/exposure-sites.db`;

describe('database', () => {
  let db;
  let result;

  const testSubscribers = [
    {
      id: 1,
      isBot: 0,
      firstName: 'Chris',
      username: 'chris',
      languageCode: 'en',
      region: 'Australia/Melbourne',
      lastNotifiedAt: null
    },
    {
      id: 2,
      isBot: 0,
      firstName: 'Emma',
      username: 'emma',
      languageCode: 'en',
      region: 'Australia/Sydney',
      lastNotifiedAt: '2021-08-08T00:00:00+00:00'
    }
  ];

  const testNotifiedSites = [
    {
      subscriberId: 1,
      hash: 'hash-string1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks().resetModules();
    // Remove database file if exists

    try {
      fs.unlinkSync(path);
      // eslint-disable-next-line no-empty
    } catch (err) {}

    db = require('../database');

    // Initialise DB
    db.initialise();

    // Add some test data
    testSubscribers.forEach(s => {
      db.insertSubscriber(s);
    });

    testNotifiedSites.forEach(s => {
      db.insertNotifiedSite(s);
    });
  });

  describe('getSubscribersByRegion', () => {
    beforeEach(() => {
      result = db.getSubscribersByRegion('Australia/Melbourne');
    });

    it('returns expected result', () => {
      expect(result).toMatchObject([testSubscribers[0]]);
    });
  });

  describe('getSubscriber', () => {
    beforeEach(() => {
      result = db.getSubscriber(2);
    });

    it('returns expected result', () => {
      expect(result).toMatchObject({
        ...testSubscribers[1],
        lastNotifiedAt: null
      });
    });
  });

  describe('getNotifiedSiteBySubscriberIdAndHash', () => {
    describe('existing row', () => {
      beforeEach(() => {
        result = db.getNotifiedSiteBySubscriberIdAndHash(1, 'hash-string1');
      });

      it('returns expected result', () => {
        expect(result).toMatchObject({
          subscriberId: 1,
          hash: 'hash-string1'
        });
      });
    });

    describe('non-existing row', () => {
      beforeEach(() => {
        result = db.getNotifiedSiteBySubscriberIdAndHash(1, 'hash-string2');
      });

      it('returns expected result', () => {
        expect(result).toBeUndefined();
      });
    });
  });

  describe('updateSubscriberLastNotifiedAt', () => {
    beforeEach(() => {
      result = db.updateSubscriberLastNotifiedAt(
        2,
        '2021-08-09T12:33:00+00:00'
      );
    });

    it('returns expected result', () => {
      expect(result).toMatchObject({
        changes: 1,
        lastInsertRowid: 1
      });
    });
  });
});
