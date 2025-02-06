'use strict';

/**
 * a service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::a.a');
