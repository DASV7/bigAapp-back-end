const WhatsAppBot = require('../index');

let instance = null;
let bot = null;
let isInitialized = false;
let isInitializing = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\D/g, '');
    if (!cleaned.startsWith('57')) {
        cleaned = '57' + cleaned;
    }
    return cleaned;
};

const initialize = async () => {
    if (isInitializing) {
        console.log('WhatsApp Service is already initializing...');
        while (isInitializing) {
            await delay(1000);
        }
        return instance;
    }

    try {
        isInitializing = true;

        if (bot) {
            await bot.destroy();
            bot = null;
            isInitialized = false;
        }

        console.log('Initializing new WhatsApp connection...');
        bot = new WhatsAppBot();
        await bot.initialize();
        isInitialized = true;
        console.log('WhatsApp Service initialized successfully');
    } catch (error) {
        console.error('Failed to initialize WhatsApp service:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

const sendMessage = async (to, message, options = {}) => {
    const maxRetries = 3;
    let retryCount = 0;

    const attemptSend = async () => {
        try {
            if (!isInitialized || !bot) {
                await initialize();
            }

            const formattedNumber = formatPhoneNumber(to);
            
            // Asegurarse de que el mensaje sea una cadena de texto
            const messageText = String(message || '').trim();
            if (!messageText) {
                throw new Error('Invalid message format');
            }

            // Enviar el mensaje con el formato correcto
            await bot.sendMessage(`${formattedNumber}@s.whatsapp.net`, {
                text: messageText
            });
            
            return {
                success: true,
                to: formattedNumber,
                messageId: Date.now().toString()
            };
        } catch (error) {
            console.error(`Attempt ${retryCount + 1} failed:`, error.message);
            
            if (retryCount < maxRetries && 
                (error.message.includes('not connected') || 
                 error.message.includes('conflict') || 
                 error.message.includes('Connection Closed'))) {
                retryCount++;
                console.log(`Retrying... Attempt ${retryCount} of ${maxRetries}`);
                await delay(2000 * retryCount);
                await initialize();
                return attemptSend();
            }
            
            throw error;
        }
    };

    return attemptSend();
};

const sendBulkMessages = async (messages) => {
    if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
    }

    const results = [];
    for (const msg of messages) {
        try {
            // Asegurarse de que el mensaje sea una cadena de texto
            const messageText = String(msg.message || '');
            if (!messageText) {
                throw new Error('Invalid message format');
            }

            const result = await sendMessage(msg.to, messageText, msg.options);
            results.push({
                success: true,
                ...result
            });
            await delay(1000);
        } catch (error) {
            results.push({
                success: false,
                to: msg.to,
                error: error.message
            });
        }
    }

    return results;
};

const templates = {
    welcome: (data) => `¡Bienvenido a VINC, ${data.name || 'usuario'}! 🎉\n\nGracias por unirte a nuestra plataforma. Estamos aquí para ayudarte a hacer crecer tu negocio.`,
    orderConfirmation: (data) => `¡Pedido Confirmado! 📦\n\nPedido #${data.orderId}\nTotal: $${data.total}\nEstado: ${data.status}\n\nGracias por tu compra.`,
    supportTicket: (data) => `Ticket de Soporte #${data.ticketId}\n\nHemos recibido tu solicitud de soporte. Un agente te contactará pronto.\n\nAsunto: ${data.subject}`,
    reminder: (data) => `⏰ Recordatorio\n\n${data.message}\n\nFecha: ${data.date}`,
    promotion: (data) => `🎯 ¡Oferta Especial!\n\n${data.title}\n${data.description}\n\nVálido hasta: ${data.validUntil}`
};

const sendTemplate = async (to, templateName, data = {}) => {
    if (!templates[templateName]) {
        throw new Error(`Template "${templateName}" not found`);
    }

    const messageText = templates[templateName](data);
    return await sendMessage(to, messageText);
};

const destroy = async () => {
    if (isInitialized && bot) {
        await bot.destroy();
        bot = null;
        isInitialized = false;
    }
};

module.exports = {
    initialize,
    sendMessage,
    sendBulkMessages,
    sendTemplate,
    destroy
};
