const nodemailer = require('nodemailer');
const Contract = require('../models/contract.model');
const Tenant = require('../models/tenant.model');
const Rental = require('../models/rental.model');
const Project = require('../models/project.model');

class NotificationService {
  constructor() {
    // Configurar transporte de email
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Enviar notificación por email
  async sendEmail(to, subject, html, text = '') {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@vinc.app',
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Notificar contrato próximo a vencer
  async notifyContractExpiring(contractId, daysLeft) {
    try {
      const contract = await Contract.findById(contractId)
        .populate('tenantId')
        .populate('rentalId')
        .populate('projectId');

      if (!contract || !contract.tenantId?.email) return;

      const subject = `Contrato próximo a vencer - ${daysLeft} días restantes`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Contrato Próximo a Vencer</h2>
          <p>Estimado ${contract.tenantId.firstName} ${contract.tenantId.lastName},</p>
          <p>Le informamos que su contrato de arrendamiento está próximo a vencer:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Propiedad:</strong> ${contract.rentalId?.propertyName || 'N/A'}</p>
            <p><strong>Proyecto:</strong> ${contract.projectId?.name || 'N/A'}</p>
            <p><strong>Fecha de vencimiento:</strong> ${new Date(contract.endDate).toLocaleDateString('es-CO')}</p>
            <p><strong>Días restantes:</strong> ${daysLeft}</p>
            <p><strong>Renta mensual:</strong> $${contract.monthlyRent.toLocaleString()}</p>
          </div>
          <p>Por favor, contacte a nuestro equipo para discutir las opciones de renovación.</p>
          <p>Atentamente,<br>Equipo de VINC</p>
        </div>
      `;

      return await this.sendEmail(contract.tenantId.email, subject, html);
    } catch (error) {
      console.error('Error sending contract expiration notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notificar pago pendiente
  async notifyPendingPayment(contractId, payment) {
    try {
      const contract = await Contract.findById(contractId)
        .populate('tenantId')
        .populate('rentalId')
        .populate('projectId');

      if (!contract || !contract.tenantId?.email) return;

      const subject = 'Recordatorio de Pago Pendiente';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f39c12;">Recordatorio de Pago</h2>
          <p>Estimado ${contract.tenantId.firstName} ${contract.tenantId.lastName},</p>
          <p>Le recordamos que tiene un pago pendiente:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Propiedad:</strong> ${contract.rentalId?.propertyName || 'N/A'}</p>
            <p><strong>Monto:</strong> $${payment.amount.toLocaleString()}</p>
            <p><strong>Fecha de vencimiento:</strong> ${new Date(payment.dueDate).toLocaleDateString('es-CO')}</p>
            <p><strong>Estado:</strong> <span style="color: #e74c3c;">PENDIENTE</span></p>
          </div>
          <p>Por favor, realice el pago a la mayor brevedad posible para evitar cargos adicionales.</p>
          <p>Puede realizar el pago a través de nuestros canales autorizados.</p>
          <p>Atentamente,<br>Equipo de VINC</p>
        </div>
      `;

      return await this.sendEmail(contract.tenantId.email, subject, html);
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Notificar renovación automática
  async notifyAutoRenewal(contractId, newContractId) {
    try {
      const contract = await Contract.findById(contractId)
        .populate('tenantId')
        .populate('rentalId')
        .populate('projectId');

      if (!contract || !contract.tenantId?.email) return;

      const subject = 'Contrato Renovado Automáticamente';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Contrato Renovado</h2>
          <p>Estimado ${contract.tenantId.firstName} ${contract.tenantId.lastName},</p>
          <p>Le informamos que su contrato ha sido renovado automáticamente:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Propiedad:</strong> ${contract.rentalId?.propertyName || 'N/A'}</p>
            <p><strong>Proyecto:</strong> ${contract.projectId?.name || 'N/A'}</p>
            <p><strong>Nueva fecha de vencimiento:</strong> ${new Date(contract.endDate).toLocaleDateString('es-CO')}</p>
            <p><strong>Renta mensual:</strong> $${contract.monthlyRent.toLocaleString()}</p>
          </div>
          <p>Si desea modificar los términos del contrato o cancelar la renovación automática, por favor contacte a nuestro equipo.</p>
          <p>Atentamente,<br>Equipo de VINC</p>
        </div>
      `;

      return await this.sendEmail(contract.tenantId.email, subject, html);
    } catch (error) {
      console.error('Error sending auto-renewal notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notificar mantenimiento programado
  async notifyMaintenanceScheduled(maintenanceId) {
    try {
      const Maintenance = require('../models/maintenance.model');
      const maintenance = await Maintenance.findById(maintenanceId)
        .populate({
          path: 'contractId',
          populate: {
            path: 'tenantId rentalId projectId',
            select: 'firstName lastName email propertyName name'
          }
        });

      if (!maintenance || !maintenance.contractId?.tenantId?.email) return;

      const subject = 'Mantenimiento Programado';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Mantenimiento Programado</h2>
          <p>Estimado ${maintenance.contractId.tenantId.firstName} ${maintenance.contractId.tenantId.lastName},</p>
          <p>Le informamos que se ha programado mantenimiento en su propiedad:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Propiedad:</strong> ${maintenance.contractId.rentalId?.propertyName || 'N/A'}</p>
            <p><strong>Tipo de mantenimiento:</strong> ${maintenance.type}</p>
            <p><strong>Fecha programada:</strong> ${new Date(maintenance.scheduledDate).toLocaleDateString('es-CO')}</p>
            <p><strong>Descripción:</strong> ${maintenance.description}</p>
            <p><strong>Estado:</strong> ${maintenance.status}</p>
          </div>
          <p>El mantenimiento se realizará en el horario establecido. Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>Atentamente,<br>Equipo de VINC</p>
        </div>
      `;

      return await this.sendEmail(maintenance.contractId.tenantId.email, subject, html);
    } catch (error) {
      console.error('Error sending maintenance notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Procesar notificaciones automáticas (función para ejecutar periódicamente)
  async processAutomatedNotifications() {
    try {
      console.log('Procesando notificaciones automáticas...');

      // Contratos próximos a vencer (30 días)
      const expiringContracts = await Contract.findExpiringContracts(30);
      for (const contract of expiringContracts) {
        const daysLeft = contract.daysRemaining();
        if (daysLeft <= 30 && daysLeft > 0) {
          await this.notifyContractExpiring(contract._id, daysLeft);
        }
      }

      // Pagos pendientes
      const contractsWithPendingPayments = await Contract.findContractsWithPendingPayments();
      for (const contract of contractsWithPendingPayments) {
        const pendingPayments = contract.getPendingPayments();
        for (const payment of pendingPayments) {
          // Solo notificar una vez por día por pago
          const today = new Date().toDateString();
          const lastNotification = payment.lastNotification?.toDateString();
          if (lastNotification !== today) {
            await this.notifyPendingPayment(contract._id, payment);
            payment.lastNotification = new Date();
            await contract.save();
          }
        }
      }

      // Renovaciones automáticas
      const contractsNeedingRenewal = await Contract.find({
        'renewalOptions.automatic': true,
        status: 'active'
      });

      for (const contract of contractsNeedingRenewal) {
        if (contract.needsRenewal()) {
          try {
            const renewalResult = contract.renewContract();
            await renewalResult.originalContract.save();
            await renewalResult.renewedContract.save();

            await this.notifyAutoRenewal(contract._id, renewalResult.renewedContract._id);
          } catch (error) {
            console.error('Error auto-renewing contract:', contract._id, error);
          }
        }
      }

      console.log('Notificaciones automáticas procesadas exitosamente');
    } catch (error) {
      console.error('Error processing automated notifications:', error);
    }
  }

  // Función auxiliar para quitar HTML
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new NotificationService();