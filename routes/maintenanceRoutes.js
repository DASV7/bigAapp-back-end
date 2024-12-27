const express = require('express');
const router = express.Router();
const MaintenanceRequest = require('../models/maintenance');

// Obtener todas las solicitudes de mantenimiento
router.get('/', async (req, res) => {
    try {
        const { status, priority, property, assignedTo } = req.query;
        let query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (property) query.property = property;
        if (assignedTo) query.assignedTo = assignedTo;

        const maintenanceRequests = await MaintenanceRequest.find(query)
            .populate('property', 'name location')
            .populate('requestedBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json(maintenanceRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Crear nueva solicitud de mantenimiento
router.post('/', async (req, res) => {
    try {
        const maintenanceRequest = new MaintenanceRequest({
            ...req.body,
            status: 'pending'
        });

        const newRequest = await maintenanceRequest.save();
        await newRequest.populate([
            { path: 'property', select: 'name location' },
            { path: 'requestedBy', select: 'name email' }
        ]);

        res.status(201).json(newRequest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Obtener una solicitud específica
router.get('/:id', async (req, res) => {
    try {
        const maintenanceRequest = await MaintenanceRequest.findById(req.params.id)
            .populate('property', 'name location')
            .populate('requestedBy', 'name email')
            .populate('assignedTo', 'name email');

        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        res.json(maintenanceRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Actualizar una solicitud
router.put('/:id', async (req, res) => {
    try {
        const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        // Si se está completando la solicitud, agregar la fecha de completado
        if (req.body.status === 'completed' && maintenanceRequest.status !== 'completed') {
            req.body.completedDate = new Date();
        }

        Object.assign(maintenanceRequest, req.body);
        const updatedRequest = await maintenanceRequest.save();
        await updatedRequest.populate([
            { path: 'property', select: 'name location' },
            { path: 'requestedBy', select: 'name email' },
            { path: 'assignedTo', select: 'name email' }
        ]);

        res.json(updatedRequest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Agregar una nota a la solicitud
router.post('/:id/notes', async (req, res) => {
    try {
        const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        maintenanceRequest.notes.push({
            text: req.body.text,
            createdBy: req.body.userId
        });

        const updatedRequest = await maintenanceRequest.save();
        res.json(updatedRequest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Agregar imágenes a la solicitud
router.post('/:id/images', async (req, res) => {
    try {
        const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        maintenanceRequest.images.push({
            url: req.body.url,
            description: req.body.description
        });

        const updatedRequest = await maintenanceRequest.save();
        res.json(updatedRequest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Eliminar una solicitud
router.delete('/:id', async (req, res) => {
    try {
        const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        await maintenanceRequest.remove();
        res.json({ message: 'Solicitud eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
