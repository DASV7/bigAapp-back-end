const Contract = require('../models/contract.model');
const Project = require('../models/project.model');
const Rental = require('../models/rental.model');
const Tenant = require('../models/tenant.model');

// Crear nuevo contrato
const createContract = async (req, res) => {
  try {
    const {
      projectId,
      rentalId,
      tenantId,
      contractNumber,
      startDate,
      endDate,
      monthlyRent,
      deposit,
      terms,
      specialConditions
    } = req.body;

    // Validar que existan las referencias
    const [project, rental, tenant] = await Promise.all([
      Project.findById(projectId),
      Rental.findById(rentalId),
      Tenant.findById(tenantId)
    ]);

    if (!project || !rental || !tenant) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto, propiedad o inquilino no encontrado'
      });
    }

    // Verificar que la propiedad esté disponible
    if (rental.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'La propiedad no está disponible para arrendamiento'
      });
    }

    const contract = new Contract({
      projectId,
      rentalId,
      tenantId,
      contractNumber,
      startDate,
      endDate,
      monthlyRent,
      deposit,
      terms,
      specialConditions
    });

    await contract.save();

    // Actualizar estado de la propiedad
    rental.status = 'rented';
    await rental.save();

    // Generar pagos mensuales
    await generateMonthlyPayments(contract);

    res.status(201).json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener todos los contratos
const getContracts = async (req, res) => {
  try {
    const { projectId, tenantId, status } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;

    const contracts = await Contract.find(filter)
      .populate('projectId', 'name')
      .populate('rentalId', 'propertyName address')
      .populate('tenantId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener contrato por ID
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('projectId')
      .populate('rentalId')
      .populate('tenantId');

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar contrato
const updateContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar contrato
const deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    // Solo permitir eliminar contratos expirados o terminados
    if (contract.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar un contrato activo'
      });
    }

    await Contract.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Contrato eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Firmar contrato
const signContract = async (req, res) => {
  try {
    const { signature, signer } = req.body; // signer: 'tenant' or 'landlord'
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    if (!['tenant', 'landlord'].includes(signer)) {
      return res.status(400).json({
        success: false,
        error: 'Firmante inválido'
      });
    }

    contract.signatures[signer] = {
      signed: true,
      signedAt: new Date(),
      signature
    };

    await contract.save();

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Renovar contrato
const renewContract = async (req, res) => {
  try {
    const { newEndDate, newMonthlyRent } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    await contract.renew(newEndDate, newMonthlyRent);

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error renewing contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para generar pagos mensuales
const generateMonthlyPayments = async (contract) => {
  const payments = [];
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    payments.push({
      amount: contract.monthlyRent,
      dueDate: new Date(currentDate),
      status: 'pending'
    });

    // Avanzar al siguiente mes
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  contract.payments = payments;
  await contract.save();
};

// Renovar contrato automáticamente
const autoRenewContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    if (!contract.renewalOptions.automatic) {
      return res.status(400).json({
        success: false,
        error: 'El contrato no tiene renovación automática habilitada'
      });
    }

    const renewalResult = contract.renewContract();

    // Guardar ambos contratos
    await renewalResult.originalContract.save();
    await renewalResult.renewedContract.save();

    // Actualizar estado de la propiedad si es necesario
    if (renewalResult.renewedContract.status === 'active') {
      const rental = await Rental.findById(contract.rentalId);
      if (rental && rental.status !== 'rented') {
        rental.status = 'rented';
        await rental.save();
      }
    }

    res.json({
      success: true,
      data: {
        originalContract: renewalResult.originalContract,
        renewedContract: renewalResult.renewedContract
      }
    });
  } catch (error) {
    console.error('Error auto-renewing contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener contratos próximos a vencer
const getExpiringContracts = async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const contracts = await Contract.findExpiringContracts(daysAhead);

    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener contratos con pagos pendientes
const getContractsWithPendingPayments = async (req, res) => {
  try {
    const contracts = await Contract.findContractsWithPendingPayments();

    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching contracts with pending payments:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Marcar pago como realizado
const markPaymentPaid = async (req, res) => {
  try {
    const { paymentId, paymentMethod, reference } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    await contract.markPaymentPaid(paymentId, paymentMethod, reference);

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// Generar calendario de pagos
const generatePaymentSchedule = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    await contract.generatePaymentSchedule();

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error generating payment schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas del contrato
const getContractStatistics = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    const statistics = contract.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching contract statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Terminar contrato
const terminateContract = async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    await contract.terminate(reason, notes);

    // Liberar la propiedad
    const rental = await Rental.findById(contract.rentalId);
    if (rental) {
      rental.status = 'available';
      await rental.save();
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error terminating contract:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// Agregar nota al contrato
const addContractNote = async (req, res) => {
  try {
    const { content, createdBy } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    contract.notes.push({
      content,
      createdBy: createdBy || 'Sistema',
      createdAt: new Date()
    });

    await contract.save();

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error adding contract note:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener dashboard de contratos
const getContractDashboard = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Estadísticas generales
    const totalContracts = await Contract.countDocuments();
    const activeContracts = await Contract.countDocuments({ status: 'active' });
    const expiringContracts = await Contract.countDocuments({
      status: 'active',
      endDate: { $lte: thirtyDaysFromNow }
    });
    const expiredContracts = await Contract.countDocuments({ status: 'expired' });

    // Ingresos del mes actual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = await Contract.aggregate([
      {
        $match: {
          'payments.status': 'paid',
          'payments.paidDate': { $gte: startOfMonth }
        }
      },
      {
        $unwind: '$payments'
      },
      {
        $match: {
          'payments.status': 'paid',
          'payments.paidDate': { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$payments.amount' }
        }
      }
    ]);

    // Contratos recientes
    const recentContracts = await Contract.find()
      .populate('projectId', 'name')
      .populate('rentalId', 'propertyName')
      .populate('tenantId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    // Próximos vencimientos
    const upcomingExpirations = await Contract.find({
      status: 'active',
      endDate: { $lte: thirtyDaysFromNow }
    })
      .populate('projectId', 'name')
      .populate('rentalId', 'propertyName')
      .populate('tenantId', 'firstName lastName')
      .sort({ endDate: 1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        statistics: {
          totalContracts,
          activeContracts,
          expiringContracts,
          expiredContracts,
          monthlyRevenue: monthlyRevenue[0]?.total || 0
        },
        recentContracts,
        upcomingExpirations
      }
    });
  } catch (error) {
    console.error('Error fetching contract dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  signContract,
  renewContract,
  autoRenewContract,
  getExpiringContracts,
  getContractsWithPendingPayments,
  markPaymentPaid,
  generatePaymentSchedule,
  getContractStatistics,
  terminateContract,
  addContractNote,
  getContractDashboard
};