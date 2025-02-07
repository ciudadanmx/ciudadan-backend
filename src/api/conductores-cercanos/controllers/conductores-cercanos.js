'use strict';

const axios = require('axios');
const driver = require('../../trip/controllers/driver');

const GOOGLE_MAPS_API_KEY = 'AIzaSyCmHB2NJInaM1bAEL8xTIJmatDbwyao3yA';
const MESSAGE_SERVICE_URL = 'http://localhost:3001/send-message'; // URL del microservicio que enviará el mensaje

let desde;
let hasta;
let direccionDesde;
let direccionHasta;


module.exports = {
  async conductoresCercanos(ctx) {
    try {
      console.log("✅ Petición recibida:", ctx.request.body);

      const { origin, destination, originAdress, destinationAdress } = ctx.request.body;
      if (!origin || !destination) {
        console.log("❌ Error: Faltan coordenadas de origen y destino");
        return ctx.badRequest('Faltan coordenadas de origen y destino');
      }

      const latMin = origin.lat - 0.018;
      const latMax = origin.lat + 0.018;
      const lonMin = origin.lng - 0.018;
      const lonMax = origin.lng + 0.018;

      desde = origin;
      hasta = destination;
      direccionDesde = originAdress;
      direccionHasta = destinationAdress;

      console.log(`🔎 Buscando conductores entre: lat(${latMin} - ${latMax}), lng(${lonMin} - ${lonMax})`);

      const drivers = await strapi.db.connection('driver_locations')
        .whereRaw('CAST(JSON_EXTRACT(coords, "$.lat") AS DECIMAL(10,6)) BETWEEN ? AND ?', [latMin, latMax])
        .whereRaw('CAST(JSON_EXTRACT(coords, "$.lng") AS DECIMAL(10,6)) BETWEEN ? AND ?', [lonMin, lonMax]);

      console.log("🚕 Conductores encontrados:", drivers);

      if (!drivers.length) {
        console.log("⚠️ No se encontraron conductores cercanos");
        return ctx.send({ message: 'No se encontraron conductores cercanos' });
      }

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

        const waypoints = `${origin.lat},${origin.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverCoords.lat},${driverCoords.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}&key=${GOOGLE_MAPS_API_KEY}`;

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

          const totalDistance = routeData.routes[0].legs.reduce((acc, leg) => acc + leg.distance.value, 0);
          const origen = driverCoords;

          console.log(`📏 Distancia total para conductor ${driver.id}: ${totalDistance} metros`);

          try {
            console.log(`📲 Enviando mensaje al conductor ${driver.id} para avisar sobre la ruta...`);

            const messageData = {
              driverId: driver.id,
              totalDistance: totalDistance,
              route: routeData.routes[0],
              driverCoords: driverCoords,
              destination: hasta,
              origin: desde,
              destinationAdress: direccionHasta,
              originAdress: direccionDesde,
              message: `¡Nuevo viaje! Distancia estimada: ${totalDistance / 1000} km.`,
              prueba: `test`,
            };

            const messageResponse = await axios.post(MESSAGE_SERVICE_URL, messageData);

            console.log(`✅ Respuesta del microservicio de mensajes para conductor ${driver.id}:`, messageResponse.data);

          } catch (messageError) {
            console.error(`❌ Error al enviar mensaje al conductor ${driver.id}:`, messageError);
          }

          return {
            driverId: driver.id,
            driverCoords: driverCoords,
            route: routeData.routes[0],
            totalDistance: totalDistance,
            origen: 'Origen corregido',
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
