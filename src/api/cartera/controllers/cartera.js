'use strict';

/**
 * cartera controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::cartera.cartera', ({ strapi }) => ({
  async find(ctx) {
    try {
      const { email } = ctx.query;

      if (!email) {
        return ctx.badRequest('No email provided');
      }

      // Buscar usuario por email
      const user = await strapi.db.query('api::cartera.cartera').findOne({
        where: { email }
      });

      // Si no existe, devolver un mensaje de error
      if (!user) {
        return ctx.notFound('User not found');
      }

      return ctx.send(user);
    } catch (error) {
      return ctx.internalServerError('An error occurred', error);
    }
  },

  async create(ctx) {
    try {
      const { email, username } = ctx.request.body;

      if (!email || !username) {
        return ctx.badRequest('Email and username are required');
      }

      // Verificar si el usuario ya existe
      const existingUser = await strapi.db.query('api::cartera.cartera').findOne({
        where: { email }
      });

      if (existingUser) {
        return ctx.send(existingUser);
      }

      // Crear un nuevo usuario si no existe
      const newUser = await strapi.db.query('api::cartera.cartera').create({
        data: {
          email,
          username
        }
      });

      return ctx.send(newUser);
    } catch (error) {
      return ctx.internalServerError('An error occurred', error);
    }
  }
}));
