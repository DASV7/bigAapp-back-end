const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'online', 'other'],
    default: 'cash'
  },
  reference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  processedBy: {
    type: String,
    trim: true
  },
  paymentGateway: {
    transactionId: String,
    gateway: String,
    response: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
paymentSchema.index({ contractId: 1, dueDate: -1 });
paymentSchema.index({ tenantId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ paidDate: 1 });

// Virtual para verificar si está vencido
paymentSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Método para marcar como pagado
paymentSchema.methods.markAsPaid = function(paymentDetails = {}) {
  this.status = 'paid';
  this.paidDate = paymentDetails.paidDate || new Date();
  this.paymentMethod = paymentDetails.paymentMethod || this.paymentMethod;
  this.reference = paymentDetails.reference || this.reference;
  this.processedBy = paymentDetails.processedBy || this.processedBy;
  this.receiptNumber = paymentDetails.receiptNumber || this.generateReceiptNumber();

  return this.save();
};

// Método para calcular días de retraso
paymentSchema.methods.getDaysOverdue = function() {
  if (this.status !== 'pending' || new Date() <= this.dueDate) return 0;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
};

// Método para generar número de recibo
paymentSchema.methods.generateReceiptNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REC-${year}${month}-${random}`;
};

// Pre-save middleware para calcular totalAmount
paymentSchema.pre('save', function(next) {
  this.totalAmount = this.amount + this.lateFee - this.discount;
  next();
});

// Método estático para obtener pagos pendientes
paymentSchema.statics.getPendingPayments = function(contractId) {
  return this.find({
    contractId,
    status: 'pending'
  }).sort({ dueDate: 1 });
};

// Método estático para obtener estadísticas de pagos
paymentSchema.statics.getPaymentStats = function(contractId) {
  return this.aggregate([
    { $match: { contractId: mongoose.Types.ObjectId(contractId) } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0]
          }
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0]
          }
        },
        overdueAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'pending'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);