'use strict';

const axios = require('axios');
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  async findNearbyDrivers(ctx) {
    try {
      return ctx.send({
        message: 'Prueba exitosa',
        drivers: [
          {
            driverId: 1,
            name: 'Conductor de prueba',
            coords: { lat: 19.432608, lng: -99.133209 },
            route: {
              distance: '2000m',
              duration: '5min',
              steps: ['Inicio', 'Recoger pasajero', 'Destino']
            }
          }
        ]
      });
    } catch (error) {
      console.error(error);
      return ctx.internalServerError('Error en la prueba de la API');
    }
  }
};

// Definir la ruta en Strapi
module.exports.routes = [
  {
    method: "POST",
    path: "/find-nearby-drivers",
    handler: "driver.findNearbyDrivers",
    config: {
      policies: [],
      auth: false, // Cambia a true si necesitas autenticación
    },
  },
];
