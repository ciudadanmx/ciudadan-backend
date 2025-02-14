const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const aaccept = `${process.env.SOCKET_HOST}:${process.env.SOCKET_HOST}`;
const accept = process.env.CORS_ORIGIN;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: accept,
    methods: ["GET", "POST"],
  },
});

// Guardar `io` en `app` para que las rutas lo usen
app.set('io', io);

// Middleware para parsear JSON
app.use(express.json());

// Importar rutas
const priceCalculatingRoute = require('./routes/priceCalculating');
const sendMessageRoute = require('./routes/trip-request');

app.use('/', priceCalculatingRoute);
app.use('/', sendMessageRoute);

// Manejo de WebSocket
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado a WebSocket');

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado de WebSocket');
  });
});

// Iniciar servidor
const PORT = process.env.SOCKET_PORT;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
