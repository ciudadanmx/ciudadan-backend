'use strict';

const axios = require('axios');
const driver = require('../../trip/controllers/driver');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MESSAGE_SERVICE_URL = `${process.env.SOCKET_HOST}:${process.env.SOCKET_PORT}/trip-request`; // URL del microservicio que enviará el mensaje
const PRICE_SERVICE_URL = `${process.env.SOCKET_HOST}:${process.env.SOCKET_PORT}/price-calculating`;

let desde;
let hasta;
let direccionDesde;
let direccionHasta;
let ruta;
let price;

function obtenerRectanguloCobertura(km, lat, lng) {
  // Aproximación de 1° ≈ 111.32 km en latitud
  const KM_POR_GRADO_LAT = 111.32;
  
  // Calcular el desplazamiento en grados para la latitud
  const latDelta = km / KM_POR_GRADO_LAT;
  
  // Calcular el desplazamiento en grados para la longitud, ajustando por latitud
  const lonDelta = km / (KM_POR_GRADO_LAT * Math.cos(lat * Math.PI / 180));  // Ajuste por latitud
  
  // Calcular las coordenadas mínimas y máximas
  const latMin = lat - latDelta;
  const latMax = lat + latDelta;
  const lonMin = lng - lonDelta;
  const lonMax = lng + lonDelta;

  // Devolver el resultado
  return { latMin, latMax, lonMin, lonMax };
}

// Ejemplo de uso: 
/* const origin = { lat: 19.4326, lng: -99.1332 };  // Latitud y longitud del centro
const km = 2;  // Radio en kilómetros

const rect = obtenerRectanguloCobertura(km, origin.lat, origin.lng);
console.log(rect); */

module.exports = {
  async conductoresCercanos(ctx) {
    try {
      //console.log("✅ Petición recibida:", ctx.request.body);

      const { origin, destination, originAdress, destinationAdress } = ctx.request.body;
      if (!origin || !destination) {
        //console.log("❌ Error: Faltan coordenadas de origen y destino");
        return ctx.badRequest('Faltan coordenadas de origen y destino');
      }

      //crea una zona de 2 km para realizar la petición a la api de strapi 
      const zona = obtenerRectanguloCobertura(2, origin.lat, origin.lng);

      //pasa a las variables globales los datos obtenidos
      desde = origin;
      hasta = destination;
      direccionDesde = originAdress;
      direccionHasta = destinationAdress;

      //envía la solicitud de conductores cercanos a strapi
      const drivers = await strapi.db.connection('driver_locations')
        .whereRaw('CAST(JSON_EXTRACT(coords, "$.lat") AS DECIMAL(10,6)) BETWEEN ? AND ?', [zona.latMin, zona.latMax])
        .whereRaw('CAST(JSON_EXTRACT(coords, "$.lng") AS DECIMAL(10,6)) BETWEEN ? AND ?', [zona.lonMin, zona.lonMax]);

      if (!drivers.length) {
        return ctx.send({ message: 'No se encontraron conductores cercanos' });
      }

      const driverRoutes = await Promise.all(drivers.map(async (driver) => {
        let driverCoords;

        try {
          driverCoords = JSON.parse(driver.coords);
        } catch (err) {
          return {
            driverId: driver.id,
            driverCoords: null,
            route: null,
            totalDistance: null,
            totalTime: null,  // Tiempo añadido
            error: "Error parseando coordenadas",
          };
        }

        const waypoints = `${origin.lat},${origin.lng}`;
        const waypointsFormatted = Array.isArray(waypoints) 
          ? waypoints.map(point => `${point.lat},${point.lng}`).join('|') 
          : `${origin.lat},${origin.lng}`;

        // URL para llamar a la API de Directions de Google Maps con los parámetros necesarios
        const gmapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypointsFormatted}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

        try {
          const response = await axios.get(gmapsUrl);
          const routeData = response.data;

          // Verificamos que haya rutas
          if (!routeData.routes || routeData.routes.length === 0) {
            console.log(`⚠️ No se encontró ruta para el conductor ${driver.id}`);
            return {
              driverId: driver.id,
              driverCoords,
              route: null,
              totalDistance: 0,
              totalTime: 0,  // Tiempo añadido
              error: "No se encontró una ruta válida",
            };
          }

          // Aquí estamos tomando la primera ruta y sus tramos
          const route = routeData.routes[0];  // Primera ruta encontrada
          const totalDistance = route.legs.reduce((acc, leg) => acc + leg.distance.value, 0);  // Distancia total de la ruta
          const totalTime = route.legs.reduce((acc, leg) => acc + leg.duration.value, 0);  // Tiempo total de la ruta (en segundos)

          // Para mostrar la ruta en el mapa, necesitamos los pasos con coordenadas
          const steps = route.legs[0].steps.map(step => ({
            startLocation: step.start_location,  // Coordenada de inicio del paso
            endLocation: step.end_location,      // Coordenada de finalización del paso
            instructions: step.html_instructions // Instrucciones del paso
          }));

          console.log(`✅ Ruta encontrada para conductor ${driver.id}:`, route);

          
          ruta = route;
          // Preparamos la respuesta para enviar
          try {
            const messageData = {
              driverId: driver.id,
              totalDistance: totalDistance,
              totalTime: totalTime,  // Tiempo añadido
              route: ruta,
              steps: steps,  // Pasos con las coordenadas de la ruta
              driverCoords: driverCoords,
              destination: hasta,
              origin: desde,
              destinationAdress: direccionHasta,
              originAdress: direccionDesde,
              message: `¡Nuevo viaje! Distancia estimada: ${totalDistance / 1000} km, Tiempo estimado: ${totalTime / 60} minutos.`,  // Tiempo añadido al mensaje
            };

            try{
              const calculate = { distance: totalDistance };
              const priceCalculate = await axios.post(PRICE_SERVICE_URL, calculate);
              price = priceCalculate.data.price;
              messageData.price = price;
            } catch (priceError) {
              //console.error(`❌ Error al solicitar el precio para  ${totalDistance} km`, priceError);
            }
            const messageResponse = await axios.post(MESSAGE_SERVICE_URL, messageData);
            //console.log(`✅ Respuesta del microservicio de mensajes para conductor ${driver.id}:`, messageResponse.data);
          } catch (messageError) {
            //console.error(`❌ Error al enviar mensaje al conductor ${driver.id}:`, messageError);
          }

      return {
        driverId: driver.id,
        driverCoords: driverCoords,
        route: route,
        totalDistance: totalDistance,
        totalTime: totalTime,  // Tiempo añadido
        steps: steps,  // Incluimos los pasos
      };
    } catch (error) {
      console.error(`❌ Error obteniendo ruta para el conductor ${driver.id}:`, error);
      return {
        driverId: driver.id,
        driverCoords,
        route: null,
        totalDistance: null,
        totalTime: null,  // Tiempo añadido
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
