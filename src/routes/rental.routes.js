const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rental.controller');

// Rutas básicas CRUD
router.post('/', rentalController.createRental);
router.get('/', rentalController.getRentals);
router.get('/:id', rentalController.getRentalById);
router.put('/:id', rentalController.updateRental);
router.delete('/:id', rentalController.deleteRental);

// Rutas para jerarquía de propiedades
router.post('/building', rentalController.createBuilding);
router.post('/unit', rentalController.createUnit);

// Rutas para gestión de jerarquía
router.get('/building/:buildingId/units', rentalController.getBuildingUnits);
router.get('/hierarchy/project', rentalController.getPropertyHierarchy);
router.get('/available/contract', rentalController.getAvailableForContract);

module.exports = router;
