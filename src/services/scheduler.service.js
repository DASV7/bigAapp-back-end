const cron = require('node-cron');
const notificationService = require('./notification.service');

class SchedulerService {
  constructor() {
    this.jobs = [];
  }

  // Iniciar todos los trabajos programados
  start() {
    console.log('Iniciando servicios de programación...');

    // Procesar notificaciones automáticas diariamente a las 9:00 AM
    this.scheduleDailyNotifications();

    // Verificar contratos expirados cada hora
    this.scheduleContractExpirationCheck();

    // Generar reportes semanales los lunes a las 8:00 AM
    this.scheduleWeeklyReports();

    console.log('Todos los trabajos programados han sido iniciados');
  }

  // Detener todos los trabajos programados
  stop() {
    console.log('Deteniendo servicios de programación...');
    this.jobs.forEach(job => job.destroy());
    this.jobs = [];
    console.log('Todos los trabajos programados han sido detenidos');
  }

  // Notificaciones diarias (9:00 AM)
  scheduleDailyNotifications() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('Ejecutando notificaciones automáticas diarias...');
      try {
        await notificationService.processAutomatedNotifications();
        console.log('Notificaciones automáticas completadas exitosamente');
      } catch (error) {
        console.error('Error en notificaciones automáticas:', error);
      }
    }, {
      timezone: 'America/Bogota'
    });

    this.jobs.push(job);
    console.log('Trabajo de notificaciones diarias programado para las 9:00 AM');
  }

  // Verificación de contratos expirados cada hora
  scheduleContractExpirationCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('Verificando contratos expirados...');
      try {
        const Contract = require('../models/contract.model');

        // Marcar contratos como expirados
        const expiredContracts = await Contract.updateMany(
          {
            status: 'active',
            endDate: { $lt: new Date() }
          },
          {
            status: 'expired',
            updatedAt: new Date()
          }
        );

        if (expiredContracts.modifiedCount > 0) {
          console.log(`${expiredContracts.modifiedCount} contratos marcados como expirados`);
        }

        // Liberar propiedades de contratos expirados
        const Rental = require('../models/rental.model');
        const expiredContractRentals = await Contract.find({
          status: 'expired',
          endDate: { $lt: new Date() }
        }).select('rentalId');

        for (const contract of expiredContractRentals) {
          await Rental.findByIdAndUpdate(contract.rentalId, {
            status: 'available',
            updatedAt: new Date()
          });
        }

      } catch (error) {
        console.error('Error verificando contratos expirados:', error);
      }
    });

    this.jobs.push(job);
    console.log('Trabajo de verificación de contratos expirados programado cada hora');
  }

  // Reportes semanales (lunes 8:00 AM)
  scheduleWeeklyReports() {
    const job = cron.schedule('0 8 * * 1', async () => {
      console.log('Generando reportes semanales...');
      try {
        await this.generateWeeklyReport();
        console.log('Reportes semanales generados exitosamente');
      } catch (error) {
        console.error('Error generando reportes semanales:', error);
      }
    }, {
      timezone: 'America/Bogota'
    });

    this.jobs.push(job);
    console.log('Trabajo de reportes semanales programado para los lunes a las 8:00 AM');
  }

  // Generar reporte semanal
  async generateWeeklyReport() {
    try {
      const Contract = require('../models/contract.model');
      const Payment = require('../models/payment.model');
      const Maintenance = require('../models/maintenance.model');

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Estadísticas de la semana
      const weeklyStats = {
        newContracts: await Contract.countDocuments({ createdAt: { $gte: lastWeek } }),
        paidPayments: await Payment.countDocuments({
          status: 'paid',
          paidDate: { $gte: lastWeek }
        }),
        completedMaintenance: await Maintenance.countDocuments({
          status: 'completed',
          updatedAt: { $gte: lastWeek }
        }),
        totalRevenue: await Payment.aggregate([
          { $match: { status: 'paid', paidDate: { $gte: lastWeek } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      };

      // Enviar reporte por email (aquí se podría implementar envío a administradores)
      console.log('Reporte semanal generado:', weeklyStats);

      // TODO: Implementar envío de reporte por email a administradores

    } catch (error) {
      console.error('Error generando reporte semanal:', error);
      throw error;
    }
  }

  // Ejecutar notificaciones manualmente (para testing)
  async runNotificationsManually() {
    console.log('Ejecutando notificaciones manualmente...');
    await notificationService.processAutomatedNotifications();
    console.log('Notificaciones manuales completadas');
  }

  // Obtener estado de los trabajos programados
  getStatus() {
    return {
      totalJobs: this.jobs.length,
      jobs: this.jobs.map((job, index) => ({
        id: index + 1,
        running: job.running,
        scheduled: job.scheduled
      }))
    };
  }
}

module.exports = new SchedulerService();