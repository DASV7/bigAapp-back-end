const getDashboardStats = async (req, res) => {
    try {
        console.log('Accediendo a getDashboardStats');
        
        // Mock de datos más completos y dinámicos
        const mockStats = {
            overview: {
                totalRevenue: 125000,
                percentageChange: 12.5,
                trend: [65000, 72000, 84000, 96000, 108000, 125000],
                lastUpdate: new Date().toISOString()
            },
            properties: {
                total: 15,
                active: 8,
                available: 5,
                maintenance: 2,
                types: {
                    houses: 6,
                    apartments: 7,
                    commercial: 2
                },
                occupancyRate: 85,
                occupancyTrend: [75, 78, 80, 82, 85, 85],
                locationDistribution: {
                    'Centro': 5,
                    'Norte': 4,
                    'Sur': 3,
                    'Este': 2,
                    'Oeste': 1
                }
            },
            rentals: {
                activeContracts: 8,
                pendingPayments: 2,
                averageRent: 1200,
                totalIncome: 9600,
                occupancyRate: 85,
                contractTrend: [5, 6, 7, 7, 8, 8],
                revenueByProperty: [
                    { id: 1, name: "Casa Marina", revenue: 2500 },
                    { id: 2, name: "Apto Central", revenue: 1800 },
                    { id: 3, name: "Local Comercial", revenue: 3000 },
                    { id: 4, name: "Casa Jardines", revenue: 2300 },
                    { id: 5, name: "Apto Norte", revenue: 1600 }
                ]
            },
            tenants: {
                total: 12,
                active: 8,
                pending: 2,
                satisfaction: 4.5,
                demographics: {
                    'Familias': 5,
                    'Profesionales': 4,
                    'Estudiantes': 2,
                    'Empresas': 1
                },
                satisfactionTrend: [4.0, 4.2, 4.3, 4.4, 4.5],
                topComplaints: [
                    { issue: 'Mantenimiento', count: 5 },
                    { issue: 'Ruido', count: 3 },
                    { issue: 'Parking', count: 2 }
                ]
            },
            maintenance: {
                pendingRequests: 3,
                inProgress: 2,
                completed: 15,
                urgentIssues: 1,
                requestsByType: {
                    'Plomería': 8,
                    'Electricidad': 5,
                    'Climatización': 4,
                    'Estructural': 2,
                    'Otros': 1
                },
                averageResolutionTime: 48, // horas
                resolutionTrend: [72, 65, 58, 52, 48],
                upcomingMaintenance: [
                    { property: "Casa Marina", date: "2024-12-20", type: "Revisión General" },
                    { property: "Apto Central", date: "2024-12-22", type: "Plomería" }
                ]
            },
            financial: {
                monthlyIncome: 9600,
                pendingPayments: 2400,
                maintenanceCosts: 1500,
                netIncome: 5700,
                cashFlow: {
                    income: [8500, 8800, 9200, 9400, 9600],
                    expenses: [3200, 3400, 3600, 3800, 3900]
                },
                expenseDistribution: {
                    'Mantenimiento': 35,
                    'Servicios': 25,
                    'Impuestos': 20,
                    'Seguros': 15,
                    'Otros': 5
                },
                yearlyProjection: {
                    revenue: [95000, 98000, 102000, 105000, 108000, 112000],
                    profit: [42000, 45000, 48000, 50000, 52000, 54000]
                }
            },
            recentActivity: {
                newContracts: 2,
                endingContracts: 1,
                maintenanceRequests: 5,
                payments: 8,
                latestTransactions: [
                    { type: 'Pago Recibido', amount: 1200, date: '2024-12-15', property: 'Casa Marina' },
                    { type: 'Mantenimiento', amount: -300, date: '2024-12-14', property: 'Apto Central' },
                    { type: 'Pago Recibido', amount: 1500, date: '2024-12-13', property: 'Local Comercial' }
                ],
                alerts: [
                    { type: 'warning', message: 'Contrato próximo a vencer', property: 'Apto Norte' },
                    { type: 'urgent', message: 'Mantenimiento pendiente', property: 'Casa Jardines' }
                ]
            }
        };
        
        console.log('Enviando estadísticas:', mockStats);
        res.json(mockStats);
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
