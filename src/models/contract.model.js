const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
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
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  monthlyRent: {
    type: Number,
    required: true
  },
  deposit: {
    type: Number,
    default: 0
  },
  terms: {
    type: String,
    required: true
  },
  specialConditions: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'renewed'],
    default: 'active'
  },
  renewalOptions: {
    automatic: {
      type: Boolean,
      default: false
    },
    noticePeriod: {
      type: Number, // días
      default: 30
    }
  },
  signatures: {
    tenant: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      signature: String
    },
    landlord: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      signature: String
    }
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  payments: [{
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: String,
    reference: String
  }],
  notes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
contractSchema.index({ projectId: 1, rentalId: 1 });
contractSchema.index({ tenantId: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ endDate: 1 });

// Método para verificar si el contrato está activo
contractSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() <= this.endDate;
};

// Método para calcular pagos pendientes
contractSchema.methods.getPendingPayments = function() {
  return this.payments.filter(payment => payment.status === 'pending');
};

// Método para renovar contrato automáticamente
contractSchema.methods.renewContract = function(renewalPeriod = this.renewalOptions.noticePeriod) {
  if (!this.renewalOptions.automatic) {
    throw new Error('El contrato no tiene renovación automática habilitada');
  }

  const newEndDate = new Date(this.endDate);
  newEndDate.setMonth(newEndDate.getMonth() + renewalPeriod);

  // Crear nuevo contrato renovado
  const renewedContract = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    contractNumber: `${this.contractNumber}-R${Date.now()}`,
    startDate: this.endDate,
    endDate: newEndDate,
    status: 'active',
    renewedFrom: this._id,
    renewalCount: (this.renewalCount || 0) + 1,
    signatures: {
      tenant: { signed: false },
      landlord: { signed: false }
    },
    documents: [],
    payments: [],
    notes: []
  });

  // Marcar contrato original como renovado
  this.status = 'renewed';

  return {
    originalContract: this,
    renewedContract: renewedContract
  };
};

// Método para verificar si necesita renovación
contractSchema.methods.needsRenewal = function() {
  if (!this.renewalOptions.automatic) return false;

  const now = new Date();
  const renewalThreshold = new Date(this.endDate);
  renewalThreshold.setDate(renewalThreshold.getDate() - this.renewalOptions.noticePeriod);

  return now >= renewalThreshold && this.status === 'active';
};

// Método para calcular días restantes
contractSchema.methods.daysRemaining = function() {
  const now = new Date();
  const diffTime = Math.abs(this.endDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Método para verificar pagos pendientes
contractSchema.methods.getPendingPayments = function() {
  const now = new Date();
  return this.payments.filter(payment => {
    return payment.status === 'pending' && payment.dueDate <= now;
  });
};

// Método para marcar pago como realizado
contractSchema.methods.markPaymentPaid = function(paymentId, paymentMethod, reference) {
  const payment = this.payments.id(paymentId);
  if (!payment) {
    throw new Error('Pago no encontrado');
  }

  payment.status = 'paid';
  payment.paidDate = new Date();
  payment.paymentMethod = paymentMethod;
  payment.reference = reference;

  return this.save();
};

// Método para generar próximos pagos
contractSchema.methods.generatePaymentSchedule = function() {
  const payments = [];
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    payments.push({
      amount: this.monthlyRent,
      dueDate: new Date(currentDate),
      status: 'pending'
    });

    // Avanzar al siguiente mes
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  this.payments = payments;
  return this.save();
};

// Método para calcular estadísticas del contrato
contractSchema.methods.getStatistics = function() {
  const totalPayments = this.payments.length;
  const paidPayments = this.payments.filter(p => p.status === 'paid').length;
  const pendingPayments = this.payments.filter(p => p.status === 'pending').length;
  const overduePayments = this.payments.filter(p => p.status === 'overdue').length;

  const totalAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = this.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    totalPayments,
    paidPayments,
    pendingPayments,
    overduePayments,
    paymentRate: totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0,
    totalAmount,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
    daysRemaining: this.daysRemaining()
  };
};

// Método para verificar si el contrato puede ser terminado
contractSchema.methods.canTerminate = function(reason) {
  const validReasons = ['tenant_request', 'landlord_request', 'breach_of_contract', 'end_of_term'];

  if (!validReasons.includes(reason)) {
    return { canTerminate: false, reason: 'Razón de terminación inválida' };
  }

  if (this.status !== 'active') {
    return { canTerminate: false, reason: 'El contrato no está activo' };
  }

  // Verificar si hay pagos pendientes
  const pendingPayments = this.getPendingPayments();
  if (pendingPayments.length > 0) {
    return { canTerminate: false, reason: 'Hay pagos pendientes' };
  }

  return { canTerminate: true };
};

// Método para terminar contrato
contractSchema.methods.terminate = function(reason, notes = '') {
  const validation = this.canTerminate(reason);
  if (!validation.canTerminate) {
    throw new Error(validation.reason);
  }

  this.status = 'terminated';
  this.terminationDate = new Date();
  this.terminationReason = reason;
  this.terminationNotes = notes;

  // Marcar pagos futuros como cancelados
  this.payments.forEach(payment => {
    if (payment.status === 'pending') {
      payment.status = 'cancelled';
    }
  });

  return this.save();
};

// Método estático para encontrar contratos próximos a vencer
contractSchema.statics.findExpiringContracts = function(daysAhead = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

  return this.find({
    status: 'active',
    endDate: { $lte: thresholdDate }
  }).populate('projectId rentalId tenantId');
};

// Método estático para contratos con pagos pendientes
contractSchema.statics.findContractsWithPendingPayments = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    'payments.status': 'pending',
    'payments.dueDate': { $lte: now }
  }).populate('projectId rentalId tenantId');
};

module.exports = mongoose.model('Contract', contractSchema);