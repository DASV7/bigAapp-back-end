const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Crear pago
router.post('/', paymentController.createPayment);

// Obtener todos los pagos
router.get('/', paymentController.getPayments);

// Obtener pago por ID
router.get('/:id', paymentController.getPaymentById);

// Actualizar pago
router.put('/:id', paymentController.updatePayment);

// Eliminar pago
router.delete('/:id', paymentController.deletePayment);

// Marcar pago como realizado
router.post('/:id/mark-paid', paymentController.markAsPaid);

// Obtener estadísticas de pagos
router.get('/stats/overview', paymentController.getPaymentStats);

// Obtener pagos próximos a vencer
router.get('/upcoming/overview', paymentController.getUpcomingPayments);

module.exports = router;