const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

// Crea una aplicación express
const app = express();

// Configura Express para manejar JSON en las solicitudes
app.use(express.json()); // Para parsear cuerpos JSON en las peticiones

// Crea el servidor HTTP usando Express
const server = http.createServer(app);

// Inicializa socket.io con el servidor HTTP
const io = socketIo(server, {
    cors: {
      origin: "http://localhost:3000", // Permite el frontend en localhost:3000
      methods: ["GET", "POST"],
    },
  });

// Define la clave de Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyCmHB2NJInaM1bAEL8xTIJmatDbwyao3yA';

// Ruta para manejar el envío de mensajes a los conductores
app.post('/send-message', async (req, res) => {
  const { driverId, message, prueba, totalDistance, origin, driverCoords, destination, destinationAdress, originAdress } = req.body;

  if (!driverId || !message) {
    return res.status(400).json({ error: 'Faltan los datos requeridos (driverId, message)' });
  }

  try {
    // Aquí va la lógica para enviar el mensaje al conductor usando Socket.io o cualquier otro servicio
    // Emite el mensaje al conductor con el driverId correspondiente
    io.emit('mensajeConductor', { driverId, message, prueba, origin, totalDistance, driverCoords, destination, destinationAdress, originAdress });

    console.log(`Mensaje enviado al conductor ${driverId}: ${message} ${prueba}`);

    // Responde con éxito
    return res.status(200).json({ message: 'Mensaje enviado al conductor' });
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
    return res.status(500).json({ error: 'Hubo un problema al enviar el mensaje' });
  }
});

// Maneja las conexiones de los clientes a WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Este es el evento que escucha el cliente para pedir información de rutas
  socket.on('obtenerRuta', async (data) => {
    if (!data.origin || !data.destination) {
      console.log("❌ Faltan las coordenadas de origen o destino");
      socket.emit('error', 'Faltan las coordenadas de origen y destino');
      return;
    }

    const { origin, destination } = data;

    try {
      const waypoints = `${origin.lat},${origin.lng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}&key=${GOOGLE_MAPS_API_KEY}`;

      console.log(`🌍 Llamando a Google Maps API con URL: ${url}`);

      const response = await axios.get(url);
      const routeData = response.data;

      if (!routeData.routes || routeData.routes.length === 0) {
        console.log("❌ No se encontraron rutas disponibles");
        socket.emit('error', 'No se encontraron rutas disponibles');
        return;
      }

      const totalDistance = routeData.routes[0].legs.reduce((acc, leg) => acc + leg.distance.value, 0);

      console.log(`📏 Distancia total: ${totalDistance} metros`);

      socket.emit('rutaRecibida', {
        route: routeData.routes[0],
        totalDistance,
      });
    } catch (error) {
      console.error("❌ Error obteniendo ruta:", error);
      socket.emit('error', 'Hubo un problema al obtener la ruta');
    }
  });

  // Escucha cuando un cliente se desconecta
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Configura el puerto del servidor
server.listen(3001, () => {
  console.log('Servidor de sockets y microservicio de mensajes escuchando en el puerto 3001');
});
