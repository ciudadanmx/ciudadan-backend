'use strict';

const axios = require('axios');
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  async findNearbyDrivers(ctx) {
    try {
      const { origin, destination } = ctx.request.body;
      if (!origin || !destination) {
        return ctx.badRequest('Faltan coordenadas de origen y destino');
      }

      const latMin = origin.lat - 0.018;
      const latMax = origin.lat + 0.018;
      const lonMin = origin.lng - 0.018;
      const lonMax = origin.lng + 0.018;

      const drivers = await strapi.db.query('api::driver-position.driver-position').findMany({
        where: {
          'coords.latitude': { $between: [latMin, latMax] },
          'coords.longitude': { $between: [lonMin, lonMax] }
        }
      });

      if (!drivers.length) {
        return ctx.send({ message: 'No se encontraron conductores cercanos' });
      }

      const driverRoutes = await Promise.all(drivers.map(async (driver) => {
        const waypoints = `${origin.lat},${origin.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driver.coords.latitude},${driver.coords.longitude}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(url);
        const routeData = response.data;

        return {
          driverId: driver.id,
          route: routeData.routes[0],
          distance: routeData.routes[0]?.legs.reduce((acc, leg) => acc + leg.distance.value, 0),
        };
      }));

      return ctx.send(driverRoutes);
    } catch (error) {
      console.error(error);
      return ctx.internalServerError('Error obteniendo los conductores y rutas');
    }
  }
};
