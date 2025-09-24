const Maintenance = require('../models/maintenance.model');
const Rental = require('../models/rental.model');
const Tenant = require('../models/tenant.model');

// Crear solicitud de mantenimiento
const createMaintenance = async (req, res) => {
  try {
    const {
      rentalId,
      title,
      description,
      category,
      priority,
      urgency,
      location,
      photos,
      tags
    } = req.body;

    // Verificar que la propiedad existe
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({
        success: false,
        error: 'Propiedad no encontrada'
      });
    }

    // Para este ejemplo, asumimos que el tenant que reporta es el primero asociado
    // En un sistema real, esto vendría del JWT token
    const tenant = await Tenant.findOne({}); // Temporal

    const maintenance = new Maintenance({
      rentalId,
      tenantId: tenant._id,
      reportedBy: tenant._id,
      title,
      description,
      category,
      priority,
      urgency,
      location,
      photos,
      tags
    });

    await maintenance.save();

    res.status(201).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error creating maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener todas las solicitudes de mantenimiento
const getMaintenances = async (req, res) => {
  try {
    const {
      rentalId,
      tenantId,
      status,
      priority,
      category,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (rentalId) filter.rentalId = rentalId;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    const maintenances = await Maintenance.find(filter)
      .populate('rentalId', 'propertyName address')
      .populate('tenantId', 'firstName lastName email phone')
      .populate('reportedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Maintenance.countDocuments(filter);

    res.json({
      success: true,
      data: maintenances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching maintenances:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener solicitud de mantenimiento por ID
const getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('rentalId')
      .populate('tenantId')
      .populate('reportedBy');

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar solicitud de mantenimiento
const updateMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar solicitud de mantenimiento
const deleteMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    // Solo permitir eliminar solicitudes pendientes o canceladas
    if (!['pending', 'cancelled'].includes(maintenance.status)) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una solicitud en proceso o completada'
      });
    }

    await Maintenance.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Solicitud de mantenimiento eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Aprobar solicitud de mantenimiento
const approveMaintenance = async (req, res) => {
  try {
    const { estimatedCost, approvedBy } = req.body;

    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    if (maintenance.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'La solicitud ya ha sido procesada'
      });
    }

    await maintenance.approve(approvedBy, estimatedCost);

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error approving maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Rechazar solicitud de mantenimiento
const rejectMaintenance = async (req, res) => {
  try {
    const { reason, rejectedBy } = req.body;

    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    if (maintenance.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'La solicitud ya ha sido procesada'
      });
    }

    maintenance.status = 'cancelled';
    maintenance.notes.push({
      content: `Solicitud rechazada por ${rejectedBy}: ${reason}`,
      createdBy: 'landlord',
      createdAt: new Date()
    });

    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error rejecting maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Asignar contratista
const assignContractor = async (req, res) => {
  try {
    const contractorInfo = req.body;

    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    if (maintenance.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'La solicitud debe estar aprobada antes de asignar un contratista'
      });
    }

    await maintenance.assignContractor(contractorInfo);

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error assigning contractor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Completar mantenimiento
const completeMaintenance = async (req, res) => {
  try {
    const { actualCost, notes } = req.body;

    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de mantenimiento no encontrada'
      });
    }

    if (maintenance.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'La solicitud debe estar en progreso para completarla'
      });
    }

    if (actualCost !== undefined) {
      maintenance.actualCost = actualCost;
    }

    await maintenance.updateStatus('completed', notes);

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error completing maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de mantenimiento
const getMaintenanceStats = async (req, res) => {
  try {
    const { rentalId } = req.query;

    const stats = await Maintenance.getMaintenanceStats(rentalId);

    const result = stats[0] || {
      totalRequests: 0,
      pendingRequests: 0,
      inProgressRequests: 0,
      completedRequests: 0,
      urgentRequests: 0,
      emergencyRequests: 0,
      totalCost: 0,
      estimatedCost: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener mantenimientos próximos
const getUpcomingMaintenance = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const maintenances = await Maintenance.getUpcomingMaintenance(days);

    res.json({
      success: true,
      data: maintenances
    });
  } catch (error) {
    console.error('Error fetching upcoming maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createMaintenance,
  getMaintenances,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  approveMaintenance,
  rejectMaintenance,
  assignContractor,
  completeMaintenance,
  getMaintenanceStats,
  getUpcomingMaintenance
};