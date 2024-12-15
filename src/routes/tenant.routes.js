const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');

// Create a new tenant
router.post('/', tenantController.createTenant);

// Get all tenants
router.get('/', tenantController.getTenants);

// Get a single tenant by ID
router.get('/:id', tenantController.getTenantById);

// Update a tenant
router.put('/:id', tenantController.updateTenant);

// Delete a tenant
router.delete('/:id', tenantController.deleteTenant);

module.exports = router;
