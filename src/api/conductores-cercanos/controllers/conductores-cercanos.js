'use strict';

const axios = require('axios');
const GOOGLE_MAPS_API_KEY = 'AIzaSyCmHB2NJInaM1bAEL8xTIJmatDbwyao3yA';

module.exports = {
  async conductoresCercanos(ctx) {
    try {
      console.log("✅ Petición recibida:", ctx.request.body);

      // Extraer directamente origin y destination
      const { origin, destination } = ctx.request.body;
      if (!origin || !destination) {
        console.log("❌ Error: Faltan coordenadas de origen y destino");
        return ctx.badRequest('Faltan coordenadas de origen y destino');
      }

      const latMin = origin.lat - 0.018;
      const latMax = origin.lat + 0.018;
      const lonMin = origin.lng - 0.018;
      const lonMax = origin.lng + 0.018;

      console.log(`🔎 Buscando conductores entre: lat(${latMin} - ${latMax}), lng(${lonMin} - ${lonMax})`);

      // Consulta usando JSON_EXTRACT para extraer lat y lng desde el JSON en MySQL
      const drivers = await strapi.db.connection('driver_locations')
        .whereRaw('JSON_EXTRACT(coords, "$.lat") BETWEEN ? AND ?', [latMin, latMax])
        .whereRaw('JSON_EXTRACT(coords, "$.lng") BETWEEN ? AND ?', [lonMin, lonMax]);

      console.log("🚕 Conductores encontrados:", drivers);

      if (!drivers.length) {
        console.log("⚠️ No se encontraron conductores cercanos");
        return ctx.send({ message: 'No se encontraron conductores cercanos' });
      }

      // Obtener rutas para cada conductor
      const driverRoutes = await Promise.all(drivers.map(async (driver) => {
        console.log(`📍 Procesando conductor ID ${driver.id}...`);
        let driverCoords;

        try {
          driverCoords = JSON.parse(driver.coords);
        } catch (err) {
          console.error(`❌ Error parseando coords para el conductor ${driver.id}:`, driver.coords, err);
          return {
            driverId: driver.id,
            driverCoords: null,
            route: null,
            totalDistance: null,
            error: "Error parseando coordenadas",
          };
        }

        console.log(`🛣️ Calculando ruta desde conductor (${driverCoords.lat}, ${driverCoords.lng}) hasta destino (${destination.lat}, ${destination.lng}) pasando por origen (${origin.lat}, ${origin.lng})`);

        // Construir la URL de Google Maps Directions API
        const waypoints = `${origin.lat},${origin.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverCoords.lat},${driverCoords.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}&key=AIzaSyCmHB2NJInaM1bAEL8xTIJmatDbwyao3yA`;

        console.log("🌍 Llamando a Google Maps API con URL:", url);

        try {
          const response = await axios.get(url);
          const routeData = response.data;

          console.log(`✅ Respuesta de Google Maps para conductor ${driver.id}:`, JSON.stringify(routeData, null, 2));

          if (!routeData.routes || routeData.routes.length === 0) {
            console.log(`⚠️ No se encontró ruta para el conductor ${driver.id}`);
            return {
              driverId: driver.id,
              driverCoords,
              route: null,
              totalDistance: 0,
              error: "No se encontró una ruta válida",
            };
          }

          // Calcular la distancia total sumando todas las distancias de los tramos de la ruta
          const totalDistance = routeData.routes[0].legs.reduce((acc, leg) => acc + leg.distance.value, 0);

          console.log(`📏 Distancia total para conductor ${driver.id}: ${totalDistance} metros`);

          return {
            driverId: driver.id,
            driverCoords,
            route: routeData.routes[0],
            totalDistance,
          };
        } catch (error) {
          console.error(`❌ Error obteniendo ruta para el conductor ${driver.id}:`, error);
          return {
            driverId: driver.id,
            driverCoords,
            route: null,
            totalDistance: null,
            error: "Error obteniendo ruta",
          };
        }
      }));

      console.log("🔄 Respuesta final enviada al cliente:", JSON.stringify(driverRoutes, null, 2));
      return ctx.send(driverRoutes);
    } catch (error) {
      console.error("🔥 Error en conductoresCercanos:", error);
      return ctx.internalServerError('Error obteniendo los conductores y rutas');
    }
  }
};
