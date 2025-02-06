'use strict';

/**
 * cartera service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cartera.cartera');
