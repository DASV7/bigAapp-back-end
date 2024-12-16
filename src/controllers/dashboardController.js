const getDashboardStats = async (req, res) => {
    try {
        console.log('Accediendo a getDashboardStats');
        
        // Por ahora usamos datos mock más completos
        const mockStats = {
            // Estadísticas de Propiedades
            properties: {
                total: 15,
                active: 8,
                available: 5,
                maintenance: 2,
                types: {
                    houses: 6,
                    apartments: 7,
                    commercial: 2
                }
            },
            // Estadísticas de Arrendamientos
            rentals: {
                activeContracts: 8,
                pendingPayments: 2,
                averageRent: 1200,
                totalIncome: 9600,
                occupancyRate: 85
            },
            // Estadísticas de Inquilinos
            tenants: {
                total: 12,
                active: 8,
                pending: 2,
                satisfaction: 4.5
            },
            // Estadísticas de Mantenimiento
            maintenance: {
                pendingRequests: 3,
                inProgress: 2,
                completed: 15,
                urgentIssues: 1
            },
            // Resumen Financiero
            financial: {
                monthlyIncome: 9600,
                pendingPayments: 2400,
                maintenanceCosts: 1500,
                netIncome: 5700
            },
            // Actividad Reciente
            recentActivity: {
                newContracts: 2,
                endingContracts: 1,
                maintenanceRequests: 5,
                payments: 8
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
