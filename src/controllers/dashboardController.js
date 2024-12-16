const getDashboardStats = async (req, res) => {
    try {
        console.log('Accediendo a getDashboardStats');
        
        // Por ahora usamos datos mock
        const mockStats = {
            totalProperties: 15,
            activeRentals: 8,
            availableProperties: 5,
            maintenanceProperties: 2
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
