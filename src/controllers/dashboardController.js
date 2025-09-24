const Contract = require('../models/contract.model');
const Payment = require('../models/payment.model');
const Rental = require('../models/rental.model');
const Tenant = require('../models/tenant.model');
const Maintenance = require('../models/maintenance.model');

const getDashboardStats = async (req, res) => {
    try {
        console.log('Obteniendo estadísticas reales del dashboard');

        // Fechas para cálculos
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Estadísticas de contratos
        const totalContracts = await Contract.countDocuments();
        const activeContracts = await Contract.countDocuments({ status: 'active' });
        const expiringContracts = await Contract.countDocuments({
            status: 'active',
            endDate: { $lte: thirtyDaysFromNow }
        });

        // Estadísticas de propiedades
        const totalProperties = await Rental.countDocuments();
        const availableProperties = await Rental.countDocuments({ status: 'available' });
        const occupiedProperties = await Rental.countDocuments({ status: 'rented' });
        const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

        // Estadísticas financieras - ingresos del mes actual
        const monthlyPayments = await Payment.find({
            status: 'paid',
            paidDate: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const monthlyIncome = monthlyPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);

        // Pagos pendientes
        const pendingPaymentsResult = await Payment.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const pendingPayments = pendingPaymentsResult[0]?.total || 0;

        // Estadísticas de mantenimiento (si existe el modelo)
        let maintenanceStats = { pendingRequests: 0, urgentIssues: 0 };
        try {
            if (Maintenance) {
                maintenanceStats.pendingRequests = await Maintenance.countDocuments({ status: 'pending' });
                maintenanceStats.urgentIssues = await Maintenance.countDocuments({
                    status: 'pending',
                    priority: 'urgent'
                });
            }
        } catch (error) {
            console.log('Modelo de mantenimiento no disponible');
        }

        // Actividad reciente - últimos pagos
        const recentPayments = await Payment.find()
            .populate('contractId', 'contractNumber')
            .populate('rentalId', 'propertyName')
            .sort({ createdAt: -1 })
            .limit(5);

        const latestTransactions = recentPayments.map(payment => ({
            id: payment._id,
            type: payment.status === 'paid' ? 'payment' : 'pending_payment',
            description: payment.status === 'paid'
                ? `Pago recibido - ${payment.contractId?.contractNumber || 'Contrato'}`
                : `Pago pendiente - ${payment.contractId?.contractNumber || 'Contrato'}`,
            amount: payment.totalAmount,
            date: payment.paidDate || payment.dueDate,
            property: payment.rentalId?.propertyName || 'Propiedad'
        }));

        // Alertas - contratos próximos a vencer
        const expiringSoonContracts = await Contract.find({
            status: 'active',
            endDate: { $lte: thirtyDaysFromNow }
        })
        .populate('rentalId', 'propertyName')
        .limit(5);

        const alerts = expiringSoonContracts.map(contract => ({
            id: contract._id,
            type: 'contract_expiring',
            title: 'Contrato próximo a vencer',
            description: `${contract.contractNumber} - ${contract.rentalId?.propertyName || 'Propiedad'}`,
            priority: 'medium',
            createdAt: new Date().toISOString()
        }));

        // Construir respuesta con datos reales
        const dashboardData = {
            overview: {
                totalRevenue: monthlyIncome,
                percentageChange: 0, // Calcular basado en mes anterior
                trend: [], // Implementar tendencias históricas
                lastUpdate: new Date().toISOString()
            },
            contracts: {
                total: totalContracts,
                active: activeContracts,
                expiring: expiringContracts
            },
            properties: {
                total: totalProperties,
                available: availableProperties,
                occupancyRate: occupancyRate,
                occupied: occupiedProperties
            },
            maintenance: {
                pendingRequests: maintenanceStats.pendingRequests,
                urgentIssues: maintenanceStats.urgentIssues
            },
            financial: {
                monthlyIncome: monthlyIncome,
                pendingPayments: pendingPayments,
                netIncome: monthlyIncome - pendingPayments
            },
            recentActivity: {
                latestTransactions: latestTransactions,
                alerts: alerts
            }
        };

        console.log('Enviando estadísticas reales del dashboard');
        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del dashboard',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats
};
