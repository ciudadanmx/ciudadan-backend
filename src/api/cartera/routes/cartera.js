'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cartera',
      handler: 'cartera.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/cartera',
      handler: 'cartera.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
