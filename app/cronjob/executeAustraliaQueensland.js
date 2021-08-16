const crypto = require('crypto');
const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('config');
const moment = require('moment-timezone');

const { telegram, database } = require('../helpers');

const { getNotifiedSiteBySubscriberIdAndHash, insertNotifiedSite } = database;

const parseSite = (logger, $) => {
  const rows = $('#newrows-202041 tbody tr');

  const sites = [];
  $(rows).each((_index, row) => {
    const site = {
      date: $(row).attr('data-date') || undefined,
      advice: $(row).attr('data-advice'),
      location: $(row).attr('data-location') || undefined,
      address: $(row).attr('data-address'),
      suburb: $(row).attr('data-suburb') || undefined,
      dateText: $(row).attr('data-datetext'),
      timeText: $(row).attr('data-timetext'),
      added: $(row).attr('data-added')
    };
    sites.push(site);
  });

  logger.info(`${sites.length} Sites are extracted.`);
  return sites
    .map(site =>
      _.mapValues(site, v => (v ? decodeURIComponent(v) : undefined))
    )
    .sort(site => moment(site.added, 'YYYY-MM-DDTHH:mm').valueOf() * -1);
};

const processSite = async (logger, subscriberId, site) => {
  const isNotifiedToSubscriber = getNotifiedSiteBySubscriberIdAndHash(
    subscriberId,
    site.hash
  );

  if (isNotifiedToSubscriber === undefined) {
    logger.info(
      { subscriberId, isNotifiedToSubscriber, site },
      'The site has not been notified to the channel. Notify now.'
    );
    insertNotifiedSite({
      subscriberId,
      hash: site.hash
    });

    const date = _.get(site, ['date'], 'N/A');
    const advice = _.get(site, ['advice'], 'N/A');
    const location = _.get(site, ['location'], 'N/A');
    const address = _.get(site, ['address'], 'N/A');
    const suburb = _.get(site, ['suburb'], 'N/A');
    const dateText = _.get(site, ['dateText'], 'N/A');
    const timeText = _.get(site, ['timeText'], 'N/A');

    if (location === 'N/A' || date === 'N/A') {
      // If location or date is N/A, it's not valid.
      return;
    }

    const exposureDateAgo = moment(
      `${_.get(site, ['date'])}`,
      'YYYY-MM-DDTHH:mm'
    )
      .tz('Australia/Brisbane')
      .fromNow();

    telegram.sendMessage(
      subscriberId,
      `<b>${suburb !== 'N/A' ? `${suburb}: ` : ''}${location}</b>\n` +
        `- Address: ${address}\n` +
        `- Exposure Date/Time: ${exposureDateAgo}, ${dateText} ${timeText}\n` +
        `- Advice: ${advice}`
    );

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

const execute = async logger => {
  logger.info('Job execution started.');
  const configPrefix = 'jobs.executeAustraliaQueensland';

  const dataURL = config.get(`${configPrefix}.dataURL`);

  logger.info({ dataURL }, 'Got data url');

  try {
    // Get json
    const html = await axios.get(dataURL).then(rawResponse => rawResponse.data);

    const $ = cheerio.load(html);

    // Get all records md5
    const sites = _.map(parseSite(logger, $), orgRecord => {
      const record = orgRecord;
      record.hash = crypto
        .createHash('md5')
        .update(
          JSON.stringify(
            _.pick(
              record,
              'date',
              'advice',
              'location',
              'address',
              'suburb',
              'timeText'
            )
          )
        )
        .digest('hex');

      return record;
    });

    // Notify to Channel if configured
    const channelChatID = config.get(
      'jobs.executeAustraliaQueensland.channelChatId'
    );
    if (channelChatID) {
      let promise = Promise.resolve();
      sites.forEach(site => {
        promise = promise.then(async () => {
          logger.info({ site }, 'Process site');
          await processSite(logger, channelChatID, site);
        });
      });

      await promise.then(() => logger.info('All sites processed'));
    }
  } catch (err) {
    logger.error({ err }, 'Error occurred');
    telegram.sendMessage(
      config.get('telegram.adminChatId'),
      `<b>Error occurred</b>\n` +
        `Code: ${err.code}\n` +
        `Message:\`\`\`${err.message}\`\`\`\n` +
        `Stack:\`\`\`${err.stack}\`\`\`\n`
    );
  }

  logger.info('Job execution finished.');
  return true;
};

module.exports = { execute };
