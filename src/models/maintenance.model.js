const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'structural', 'appliance', 'painting', 'cleaning', 'security', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  urgency: {
    type: String,
    enum: ['routine', 'needed_soon', 'urgent', 'emergency'],
    default: 'needed_soon'
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0
  },
  scheduledDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  assignedTo: {
    name: String,
    company: String,
    phone: String,
    email: String
  },
  location: {
    type: String,
    trim: true
  },
  photos: [{
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: [{
    content: String,
    createdBy: {
      type: String,
      enum: ['tenant', 'landlord', 'contractor']
    },
    createdAt: { type: Date, default: Date.now }
  }],
  approvalRequired: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  recurrence: {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDueDate: Date
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
maintenanceSchema.index({ rentalId: 1, status: 1 });
maintenanceSchema.index({ tenantId: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ priority: 1 });
maintenanceSchema.index({ category: 1 });
maintenanceSchema.index({ scheduledDate: 1 });
maintenanceSchema.index({ createdAt: -1 });

// Virtual para verificar si está atrasado
maintenanceSchema.virtual('isOverdue').get(function() {
  if (!this.scheduledDate || this.status === 'completed' || this.status === 'cancelled') return false;
  return new Date() > this.scheduledDate;
});

// Método para actualizar estado
maintenanceSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completedDate = new Date();
  }

  if (notes) {
    this.notes.push({
      content: notes,
      createdBy: 'landlord',
      createdAt: new Date()
    });
  }

  return this.save();
};

// Método para aprobar solicitud
maintenanceSchema.methods.approve = function(approvedBy, estimatedCost = null) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();

  if (estimatedCost !== null) {
    this.estimatedCost = estimatedCost;
  }

  this.notes.push({
    content: `Solicitud aprobada por ${approvedBy}`,
    createdBy: 'landlord',
    createdAt: new Date()
  });

  return this.save();
};

// Método para asignar contratista
maintenanceSchema.methods.assignContractor = function(contractorInfo) {
  this.assignedTo = contractorInfo;
  this.status = 'in_progress';

  this.notes.push({
    content: `Asignado a ${contractorInfo.name} (${contractorInfo.company})`,
    createdBy: 'landlord',
    createdAt: new Date()
  });

  return this.save();
};

// Método estático para obtener estadísticas
maintenanceSchema.statics.getMaintenanceStats = function(rentalId = null) {
  const matchCondition = rentalId ? { rentalId } : {};

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        pendingRequests: {
          $sum: {
            $cond: [{ $in: ['$status', ['pending', 'approved']] }, 1, 0]
          }
        },
        inProgressRequests: {
          $sum: {
            $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
          }
        },
        completedRequests: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        urgentRequests: {
          $sum: {
            $cond: [{ $eq: ['$urgency', 'urgent'] }, 1, 0]
          }
        },
        emergencyRequests: {
          $sum: {
            $cond: [{ $eq: ['$urgency', 'emergency'] }, 1, 0]
          }
        },
        totalCost: { $sum: '$actualCost' },
        estimatedCost: { $sum: '$estimatedCost' }
      }
    }
  ]);
};

// Método estático para obtener mantenimientos próximos
maintenanceSchema.statics.getUpcomingMaintenance = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    scheduledDate: {
      $gte: new Date(),
      $lte: futureDate
    },
    status: { $ne: 'completed' }
  })
    .populate('rentalId', 'propertyName address')
    .populate('tenantId', 'firstName lastName phone')
    .sort({ scheduledDate: 1 });
};

module.exports = mongoose.model('Maintenance', maintenanceSchema);