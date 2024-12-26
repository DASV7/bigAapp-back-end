const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDbMongo = require("./src/db/dbConnection");
const whatsappRoutes = require("./src/routes/whatsapp.routes");
const rentalRoutes = require("./src/routes/rental.routes");
const projectRoutes = require("./src/routes/project.routes");
const tenantRoutes = require("./src/routes/tenant.routes");
const dashboardRoutes = require("./src/routes/dashboard");

const app = express();
const port = process.env.PORT || 5500;

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.12:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json()); // Para parsear JSON en el body

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const server = http.createServer(app);
connectDbMongo();

// Rutas del Dashboard (colocada primero para debugging)
app.use("/api/dashboard", dashboardRoutes);
console.log('Rutas del dashboard montadas en /api/dashboard');

// Otras rutas
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tenants", tenantRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ 
        message: 'Ruta no encontrada',
        path: req.url,
        method: req.method
    });
});

// Inicializar el bot de WhatsApp
const whatsappService = require('./src/lib/WhatsappBot/services/whatsappService');

whatsappService.initialize()
  .then(() => console.log("WhatsApp service initialized successfully"))
  .catch((err) => console.error("Failed to initialize WhatsApp service:", err));

//log node version
const { exec } = require("child_process");
exec("node -v", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error al ejecutar el comando: ${error}`);
    return;
  }
  console.log(`Versión de Node.js: ${stdout}`);
});

// Manejar el cierre gracioso de la aplicación
process.on("SIGTERM", async () => {
  console.log("Recibida señal SIGTERM. Cerrando aplicación...");
  await whatsappService.destroy();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Recibida señal SIGINT. Cerrando aplicación...");
  await whatsappService.destroy();
  process.exit(0);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
