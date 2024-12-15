const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const MessageHandler = require('./handlers/messageHandler');

class WhatsAppBot {
    constructor() {
        this.sessionDir = path.join(process.cwd(), '.baileys_auth_info');
        this.store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
        this.messageHandler = new MessageHandler();
        this.sock = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }

    async connectToWhatsApp() {
        if (this.isConnecting) {
            console.log('Ya hay un intento de conexión en curso...');
            return;
        }

        try {
            this.isConnecting = true;
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            // Cerrar conexión existente si hay una
            if (this.sock) {
                await this.sock.end();
                this.sock = null;
            }

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: true,
                auth: state,
                msgRetryCounterCache: {},
                defaultQueryTimeoutMs: undefined,
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 25000,
                retryRequestDelayMs: 2000
            });

            this.store.bind(this.sock.ev);

            // Manejar conexión
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    console.log('Conexión cerrada. Código de estado:', statusCode);
                    console.log('Razón:', lastDisconnect?.error?.message);
                    
                    this.isConnected = false;
                    
                    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        setTimeout(async () => {
                            await this.connectToWhatsApp();
                        }, 5000 * this.reconnectAttempts); // Espera incremental
                    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.log('Máximo número de intentos de reconexión alcanzado');
                        this.isConnecting = false;
                    }
                } else if (connection === 'open') {
                    console.log('¡Conexión establecida! ✅');
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                }
            });

            // Guardar credenciales cuando se actualicen
            this.sock.ev.on('creds.update', saveCreds);

            // Manejar mensajes
            this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type === 'notify') {
                    for (const message of messages) {
                        if (!message.key.fromMe && message.message) {
                            try {
                                await this.handleIncomingMessage(message);
                            } catch (error) {
                                console.error('Error al procesar mensaje:', error);
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error en connectToWhatsApp:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    async handleIncomingMessage(message) {
        if (!this.isConnected) {
            console.log('Bot no conectado, ignorando mensaje entrante');
            return;
        }

        const messageContent = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             message.message?.imageMessage?.caption || '';
        
        if (!messageContent) return;

        const senderId = message.key.remoteJid;
        console.log(`Mensaje recibido de ${senderId}: ${messageContent}`);

        try {
            const response = await this.messageHandler.handleMessage({
                from: senderId,
                body: messageContent,
                reply: async (text) => {
                    if (this.isConnected) {
                        await this.sock.sendMessage(senderId, { text });
                    }
                }
            });
        } catch (error) {
            console.error('Error al manejar mensaje:', error);
            if (this.isConnected) {
                await this.sock.sendMessage(senderId, { 
                    text: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.' 
                });
            }
        }
    }

    async sendMessage(to, message) {
        if (!this.isConnected) {
            throw new Error('El bot no está conectado');
        }

        try {
            const messageContent = {
                text: message.text || message
            };

            if (typeof messageContent.text !== 'string') {
                messageContent.text = String(messageContent.text || '');
            }

            messageContent.text = messageContent.text.trim();

            if (!messageContent.text) {
                throw new Error('Mensaje vacío');
            }

            await this.sock.sendMessage(to, messageContent);
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            throw error;
        }
    }

    async initialize() {
        try {
            console.log('Iniciando cliente de WhatsApp...');
            await this.connectToWhatsApp();
        } catch (error) {
            console.error('Error al inicializar el cliente:', error);
            throw error;
        }
    }

    async destroy() {
        if (this.sock) {
            try {
                this.isConnected = false;
                this.isConnecting = false;
                await this.sock.logout();
                await this.sock.end();
                this.sock = null;
                console.log('Cliente cerrado exitosamente');
            } catch (error) {
                console.error('Error al cerrar el cliente:', error);
                throw error;
            }
        }
    }
}

module.exports = WhatsAppBot;
