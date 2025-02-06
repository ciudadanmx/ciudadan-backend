'use strict';

/**
 * driver-location service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::driver-location.driver-location');
