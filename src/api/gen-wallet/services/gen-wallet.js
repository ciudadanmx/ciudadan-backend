'use strict';

/**
 * gen-wallet service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::gen-wallet.gen-wallet');
