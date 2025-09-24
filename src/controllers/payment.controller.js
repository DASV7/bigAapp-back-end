const Payment = require('../models/payment.model');
const Contract = require('../models/contract.model');

// Crear pago manualmente
const createPayment = async (req, res) => {
  try {
    const {
      contractId,
      amount,
      dueDate,
      paymentMethod,
      reference,
      notes,
      lateFee = 0,
      discount = 0
    } = req.body;

    // Verificar que el contrato existe
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    const totalAmount = amount + lateFee - discount;

    const payment = new Payment({
      contractId,
      tenantId: contract.tenantId,
      rentalId: contract.rentalId,
      amount,
      dueDate,
      paymentMethod,
      reference,
      notes,
      lateFee,
      discount,
      totalAmount
    });

    await payment.save();

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener todos los pagos
const getPayments = async (req, res) => {
  try {
    const {
      contractId,
      tenantId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (contractId) filter.contractId = contractId;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate);
      if (endDate) filter.dueDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate('contractId', 'contractNumber')
      .populate('tenantId', 'firstName lastName email')
      .populate('rentalId', 'propertyName')
      .sort({ dueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener pago por ID
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('contractId')
      .populate('tenantId')
      .populate('rentalId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar pago
const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar pago
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    // Solo permitir eliminar pagos pendientes
    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar un pago ya realizado'
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Marcar pago como realizado
const markAsPaid = async (req, res) => {
  try {
    const { paymentMethod, reference, notes, processedBy } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'El pago ya está marcado como realizado'
      });
    }

    await payment.markAsPaid({
      paymentMethod,
      reference,
      notes,
      processedBy
    });

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de pagos
const getPaymentStats = async (req, res) => {
  try {
    const { contractId, tenantId, startDate, endDate } = req.query;

    let matchCondition = {};

    if (contractId) matchCondition.contractId = require('mongoose').Types.ObjectId(contractId);
    if (tenantId) matchCondition.tenantId = require('mongoose').Types.ObjectId(tenantId);

    if (startDate || endDate) {
      matchCondition.dueDate = {};
      if (startDate) matchCondition.dueDate.$gte = new Date(startDate);
      if (endDate) matchCondition.dueDate.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
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
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'pending'] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener pagos próximos a vencer
const getUpcomingPayments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const payments = await Payment.find({
      status: 'pending',
      dueDate: {
        $gte: new Date(),
        $lte: futureDate
      }
    })
      .populate('contractId', 'contractNumber')
      .populate('tenantId', 'firstName lastName email phone')
      .populate('rentalId', 'propertyName')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  markAsPaid,
  getPaymentStats,
  getUpcomingPayments
};