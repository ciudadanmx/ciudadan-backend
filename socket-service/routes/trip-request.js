const express = require('express');
const router = express.Router();
const axios = require('axios');

// Definir la clave de Google Maps
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

router.post('/trip-request', async (req, res) => {
    const { driverId, message, prueba, totalDistance, totalTime, price, origin, driverCoords, destination, destinationAdress, originAdress, requestTime, route } = req.body;

    if (!driverId || !message) {
        return res.status(400).json({ error: 'Faltan los datos requeridos (driverId, message)' });
    }

    try {
        // Obtener `io` desde el `app` principal
        const io = req.app.get('io');
        io.emit('trip-request', { driverId, message, prueba, price, origin, totalDistance, totalTime, driverCoords, destination, destinationAdress, originAdress, requestTime, route });

        console.log(`✅ Mensaje enviado al conductor ${driverId}: ${message} ${prueba}`);
        return res.status(200).json({ message: 'Mensaje enviado al conductor' });
    } catch (error) {
        console.error('❌ Error al enviar el mensaje:', error);
        return res.status(500).json({ error: 'Hubo un problema al enviar el mensaje' });
    }
});

// Exportar solo las rutas
module.exports = router;
