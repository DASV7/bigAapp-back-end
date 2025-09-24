const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');

// Crear nuevo contrato
router.post('/', contractController.createContract);

// Obtener todos los contratos
router.get('/', contractController.getContracts);

// Obtener contrato por ID
router.get('/:id', contractController.getContractById);

// Actualizar contrato
router.put('/:id', contractController.updateContract);

// Eliminar contrato
router.delete('/:id', contractController.deleteContract);

// Firmar contrato
router.post('/:id/sign', contractController.signContract);

// Renovar contrato
router.post('/:id/renew', contractController.renewContract);

// Auto-renovar contrato
router.post('/:id/auto-renew', contractController.autoRenewContract);

// Terminar contrato
router.post('/:id/terminate', contractController.terminateContract);

// Marcar pago como realizado
router.post('/:id/payments/:paymentId/pay', contractController.markPaymentPaid);

// Generar calendario de pagos
router.post('/:id/payments/generate', contractController.generatePaymentSchedule);

// Obtener estadísticas del contrato
router.get('/:id/statistics', contractController.getContractStatistics);

// Agregar nota al contrato
router.post('/:id/notes', contractController.addContractNote);

// Dashboard de contratos
router.get('/dashboard/overview', contractController.getContractDashboard);

// Alertas de contratos próximos a vencer
router.get('/alerts/expiring', contractController.getExpiringContracts);

// Alertas de contratos con pagos pendientes
router.get('/alerts/pending-payments', contractController.getContractsWithPendingPayments);

module.exports = router;