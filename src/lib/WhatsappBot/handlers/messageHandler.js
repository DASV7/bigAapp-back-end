const config = require('../config');

class MessageHandler {
    constructor() {
        this.userStates = new Map();
    }

    async handleMessage(message) {
        try {
            const messageContent = message.body?.toLowerCase() || '';
            
            // Si es el primer mensaje o saludo
            if (this.containsKeyword(messageContent, ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'inicio', 'empezar', 'hi', 'hello'])) {
                await this.sendWelcomeMessage(message);
                return;
            }

            // Procesar palabras clave en el mensaje
            if (this.containsKeyword(messageContent, ['demo', 'demostración', 'prueba', 'probar'])) {
                await this.handleDemoRequest(message);
            } else if (this.containsKeyword(messageContent, ['precio', 'costo', 'planes', 'pago', 'valor'])) {
                await this.handlePricingRequest(message);
            } else if (this.containsKeyword(messageContent, ['problema', 'error', 'ayuda', 'soporte', 'help'])) {
                await this.handleSupportRequest(message);
            } else if (this.containsKeyword(messageContent, ['característica', 'función', 'servicio', 'feature', 'funcionalidad', 'que hacen'])) {
                await this.sendFeaturesList(message);
            } else if (this.containsKeyword(messageContent, ['beneficio', 'ventaja', 'por qué', 'why'])) {
                await this.sendBenefitsList(message);
            } else if (this.containsKeyword(messageContent, ['contacto', 'asesor', 'comercial', 'ventas', 'contactar'])) {
                await this.handleContactRequest(message);
            } else {
                // Si no hay palabras clave reconocidas
                await this.sendHelpMessage(message);
            }
        } catch (error) {
            console.error('Error en handleMessage:', error);
            await this.sendErrorMessage(message);
        }
    }

    containsKeyword(message, keywords) {
        return keywords.some(keyword => message.includes(keyword));
    }

    async sendWelcomeMessage(message) {
        try {
            await message.reply(config.WELCOME_MESSAGE);
            setTimeout(async () => {
                await this.sendHelpMessage(message);
            }, 1000);
        } catch (error) {
            console.error('Error en sendWelcomeMessage:', error);
            await this.sendErrorMessage(message);
        }
    }

    async sendHelpMessage(message) {
        try {
            await message.reply(config.COMMON_RESPONSES.help);
        } catch (error) {
            console.error('Error en sendHelpMessage:', error);
            await this.sendErrorMessage(message);
        }
    }

    async handleDemoRequest(message) {
        try {
            await message.reply(config.COMMON_RESPONSES.demo);
        } catch (error) {
            console.error('Error en handleDemoRequest:', error);
            await this.sendErrorMessage(message);
        }
    }

    async handlePricingRequest(message) {
        try {
            await message.reply(config.COMMON_RESPONSES.pricing);
        } catch (error) {
            console.error('Error en handlePricingRequest:', error);
            await this.sendErrorMessage(message);
        }
    }

    async handleSupportRequest(message) {
        try {
            await message.reply(config.COMMON_RESPONSES.technical_issue);
        } catch (error) {
            console.error('Error en handleSupportRequest:', error);
            await this.sendErrorMessage(message);
        }
    }

    async sendFeaturesList(message) {
        try {
            let response = '*Características Principales de VINC*\n\n';
            
            Object.values(config.MAIN_FEATURES).forEach(feature => {
                response += `${feature.title}\n`;
                response += `${feature.description}\n\n`;
            });

            response += '¿Te gustaría conocer más sobre alguna característica en particular?';
            await message.reply(response);
        } catch (error) {
            console.error('Error en sendFeaturesList:', error);
            await this.sendErrorMessage(message);
        }
    }

    async sendBenefitsList(message) {
        try {
            let response = '*¿Por qué elegir VINC?*\n\n';
            
            Object.values(config.KEY_BENEFITS).forEach(benefit => {
                response += `${benefit.title}\n`;
                response += `${benefit.description}\n\n`;
            });

            response += '¿Deseas una demostración personalizada de cómo VINC puede beneficiar a tu negocio?';
            await message.reply(response);
        } catch (error) {
            console.error('Error en sendBenefitsList:', error);
            await this.sendErrorMessage(message);
        }
    }

    async handleContactRequest(message) {
        try {
            const response = `Con gusto te conectaré con un asesor especializado. 
            
Nuestro equipo está disponible ${config.CONTACT.support} para atenderte.

También puedes:
📧 Escribirnos a: ${config.CONTACT.email}
🌐 Visitarnos en: ${config.CONTACT.website}

¿Prefieres que un asesor te contacte? Solo déjame tu nombre y el mejor horario para comunicarnos contigo.`;
            
            await message.reply(response);
        } catch (error) {
            console.error('Error en handleContactRequest:', error);
            await this.sendErrorMessage(message);
        }
    }

    async sendErrorMessage(message) {
        try {
            await message.reply('Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente o contacta a nuestro soporte en soporte@vinc.app');
        } catch (error) {
            console.error('Error al enviar mensaje de error:', error);
        }
    }
}

module.exports = MessageHandler;
