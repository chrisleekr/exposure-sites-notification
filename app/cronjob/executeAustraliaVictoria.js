const crypto = require('crypto');
const _ = require('lodash');
const axios = require('axios');
const config = require('config');
const moment = require('moment-timezone');

const { telegram, database } = require('../helpers');

const { getNotifiedSiteBySubscriberIdAndHash, insertNotifiedSite } = database;

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

    const suburb = _.get(site, ['Suburb'], 'N/A');
    const siteTitle = _.get(site, ['Site_title'], 'N/A');
    const postCode = _.get(site, ['Site_postcode'], 'N/A');

    const exposureDate = _.get(site, ['Exposure_date'], 'N/A');

    const exposureDateAgo = moment(
      `${_.get(site, ['Exposure_date'])} ${_.get(site, [
        'Exposure_time_start_24'
      ])}`,
      'DD/MM/YYYY HH:mm:ss'
    )
      .tz('Australia/Melbourne')
      .fromNow();

    if (siteTitle === 'N/A' || exposureDate === 'N/A') {
      // If site title is N/A, it's not valid.
      return;
    }

    const exposureTime = _.get(site, ['Exposure_time'], 'N/A');
    const adviceTitle = _.get(site, ['Advice_title'], 'N/A');
    const adviceInstruction = _.get(site, ['Advice_instruction'], 'N/A');
    const note = _.get(site, ['Notes'], 'N/A');

    telegram.sendMessage(
      subscriberId,
      `<b>${suburb !== 'N/A' ? `${suburb}: ` : ''}${siteTitle}</b>\n` +
        `- Exposure Date/Time: ${exposureDateAgo}, ${exposureDate} ${exposureTime}\n` +
        `- Suburb/Postcode: ${suburb} ${postCode}\n` +
        `- Advice: ${adviceTitle}\n` +
        `- Instruction: ${adviceInstruction}\n` +
        `- Note: ${note}`
    );

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

const execute = async logger => {
  const configPrefix = 'jobs.executeAustraliaVictoria';

  const dataURL = config.get(`${configPrefix}.dataURL`);

  logger.info({ dataURL }, 'Got data url');

  try {
    // Get json
    const response = await axios
      .get(dataURL)
      .then(rawResponse => rawResponse.data);

    const orgRecords = _.get(response, ['result', 'records'], []);

    // Get all records md5
    const sites = _.map(orgRecords, orgRecord => {
      const record = orgRecord;
      record.hash = crypto
        .createHash('md5')
        .update(
          JSON.stringify(
            _.pick(
              record,
              'Site_title',
              'Site_postcode',
              'Exposure_date',
              'Exposure_time',
              'Advice_title',
              'Advice_instruction',
              'Notes'
            )
          )
        )
        .digest('hex');

      return record;
    });

    // Notify to Channel if configured
    const channelChatID = config.get(
      'jobs.executeAustraliaVictoria.channelChatId'
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

  return true;
};

module.exports = { execute };
