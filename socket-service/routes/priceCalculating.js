const express = require('express');
const router = express.Router();

// Ruta para calcular el precio en base a la distancia
router.post('/price-calculating', async (req, res) => {
    try {
        const { distance } = req.body;

        if (!distance || typeof distance !== 'number' || distance < 0) {
            return res.status(400).json({ error: 'La distancia debe ser un número válido y mayor o igual a 0' });
        }

        const price = (distance/1000) * 10.1;

        return res.json({ price });
    } catch (error) {
        console.error('Error en /price-calculating:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
