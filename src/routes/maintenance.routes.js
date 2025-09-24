const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

// Crear solicitud de mantenimiento
router.post('/', maintenanceController.createMaintenance);

// Obtener todas las solicitudes
router.get('/', maintenanceController.getMaintenances);

// Obtener solicitud por ID
router.get('/:id', maintenanceController.getMaintenanceById);

// Actualizar solicitud
router.put('/:id', maintenanceController.updateMaintenance);

// Eliminar solicitud
router.delete('/:id', maintenanceController.deleteMaintenance);

// Aprobar solicitud
router.post('/:id/approve', maintenanceController.approveMaintenance);

// Rechazar solicitud
router.post('/:id/reject', maintenanceController.rejectMaintenance);

// Asignar contratista
router.post('/:id/assign-contractor', maintenanceController.assignContractor);

// Completar mantenimiento
router.post('/:id/complete', maintenanceController.completeMaintenance);

// Obtener estadísticas
router.get('/stats/overview', maintenanceController.getMaintenanceStats);

// Obtener mantenimientos próximos
router.get('/upcoming/overview', maintenanceController.getUpcomingMaintenance);

module.exports = router;