const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

console.log('Configurando rutas del dashboard');

// Middleware específico para las rutas del dashboard
router.use((req, res, next) => {
    console.log('Dashboard Route:', req.method, req.url);
    next();
});

// Ruta para obtener estadísticas del dashboard
router.get('/', getDashboardStats);

console.log('Rutas del dashboard configuradas');

module.exports = router;
