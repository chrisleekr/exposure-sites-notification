const crypto = require('crypto');
const _ = require('lodash');
const axios = require('axios');
const config = require('config');
const moment = require('moment');

const { telegram, database } = require('../helpers');

const {
  getSubscribersByRegion,
  getNotifiedSiteBySubscriberIdAndHash,
  insertNotifiedSite,
  updateSubscriberLastNotifiedAt
} = database;

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

    // Notify to Telegram bot
    const subscribers = getSubscribersByRegion('Australia/Melbourne');

    await Promise.all(
      _.map(subscribers, async subscriber => {
        logger.info({ subscriber }, 'Process subscriber');

        await Promise.all(
          _.map(sites, async site => {
            if (subscriber.lastNotifiedAt === null) {
              // Never notified before, to avoid massive notifications, just mark as notified at this point.
              // Notify only new sites after this tick.
              logger.info(
                'Subscriber never be notified before. Mark as notified for this time.'
              );
              insertNotifiedSite({
                subscriberId: subscriber.id,
                hash: site.hash
              });
              return;
            }

            const isNotifiedToSubscriber = getNotifiedSiteBySubscriberIdAndHash(
              subscriber.id,
              site.hash
            );

            if (isNotifiedToSubscriber === undefined) {
              logger.info(
                { subscriber, isNotifiedToSubscriber, site },
                'The site has not been notified to the subscriber. Notify now.'
              );
              insertNotifiedSite({
                subscriberId: subscriber.id,
                hash: site.hash
              });

              telegram.sendMessage(
                subscriber.id,
                `<b>Site: ${_.get(site, ['Site_title'], 'N/A')}</b>\n` +
                  `- Postcode: ${_.get(site, ['Site_postcode'], 'N/A')}\n` +
                  `- Exposure Date/Time: ${_.get(
                    site,
                    ['Exposure_date'],
                    'N/A'
                  )} ${_.get(site, ['Exposure_time'], 'N/A')}\n` +
                  `- Advice: ${_.get(site, ['Advice_title'], 'N/A')}\n` +
                  `- Instruction: ${_.get(
                    site,
                    ['Advice_instruction'],
                    'N/A'
                  )}\n` +
                  `- Note: ${_.get(site, ['Notes'], 'N/A')}`
              );
            }
          })
        );

        logger.info('Update subscriber last notified at');
        updateSubscriberLastNotifiedAt(subscriber.id, moment().format());
      })
    );
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
