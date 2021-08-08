/* eslint-disable no-console */
const db = require('better-sqlite3')('./database/exposure-sites.db', {});

const initialise = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY,
      isBot INTEGER NOT NULL,
      firstName TEXT NULL,
      username TEXT NULL,
      languageCode TEXT NULL,
      region TEXT NULL,
      lastNotifiedAt TEXT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notified_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscriberId INTEGER NOT NULL,
      hash TEXT NULL
    )
  `);
};

const getSubscribersByRegion = region => {
  const stmt = db.prepare(`
  SELECT
    id,
    isBot,
    firstName,
    username,
    languageCode,
    region,
    lastNotifiedAt
  FROM subscribers
  WHERE
    region = ?
 `);

  return stmt.all(region);
};

const getSubscriber = id => {
  const stmt = db.prepare(`
  SELECT
    id,
    isBot,
    firstName,
    username,
    languageCode,
    region,
    lastNotifiedAt
  FROM subscribers
  WHERE
    id = ?
 `);

  return stmt.get(id);
};

const insertSubscriber = subscriber => {
  const stmt = db.prepare(`
      INSERT INTO subscribers
      (
        id,
        isBot,
        firstName,
        username,
        languageCode,
        region
      )
      VALUES (
        :id,
        :isBot,
        :firstName,
        :username,
        :languageCode,
        :region
      )
    `);

  return stmt.run(subscriber);
};

const getNotifiedSiteBySubscriberIdAndHash = (subscriberId, hash) => {
  const stmt = db.prepare(`
    SELECT
      id,
      subscriberId,
      hash
    FROM notified_sites
    WHERE
      subscriberId =? AND
      hash = ?
  `);

  return stmt.get(subscriberId, hash);
};

const updateSubscriberLastNotifiedAt = (subscriberId, lastNotifiedAt) => {
  const stmt = db.prepare(`
    UPDATE subscribers SET lastNotifiedAt = :lastNotifiedAt WHERE id = :subscriberId
  `);

  return stmt.run({ subscriberId, lastNotifiedAt });
};

const insertNotifiedSite = notifiedSite => {
  const stmt = db.prepare(`
  INSERT INTO notified_sites (subscriberId, hash) VALUES (
    :subscriberId,
    :hash
  )
`);

  return stmt.run(notifiedSite);
};

module.exports = {
  initialise,
  getSubscribersByRegion,
  getSubscriber,
  getNotifiedSiteBySubscriberIdAndHash,
  insertSubscriber,
  insertNotifiedSite,
  updateSubscriberLastNotifiedAt
};
