const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDbMongo = require("./src/db/dbConnection");
const whatsappRoutes = require("./src/routes/whatsapp.routes");
const rentalRoutes = require("./src/routes/rental.routes");
const projectRoutes = require("./src/routes/project.routes");
const tenantRoutes = require("./src/routes/tenant.routes");
const contractRoutes = require("./src/routes/contract.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const maintenanceRoutes = require("./src/routes/maintenance.routes");
const dashboardRoutes = require("./src/routes/dashboard");

const app = express();
const port = process.env.PORT || 5502;

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.12:5173", "http://localhost:3000"];
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
app.use("/api/contracts", contractRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/maintenance", maintenanceRoutes);

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

// Seed data para desarrollo
const seedDatabase = async () => {
  try {
    const Rental = require('./src/models/rental.model');
    const Project = require('./src/models/project.model');

    // Obtener proyectos existentes
    const projects = await Project.find();
    if (projects.length === 0) {
      console.log('No projects found, skipping rental seeding');
      return;
    }

    // Verificar si ya hay suficientes rentals
    const existingRentals = await Rental.countDocuments();
    if (existingRentals >= 10) {
      console.log(`Database already has ${existingRentals} rentals, skipping seeding`);
      return;
    }

    console.log('Seeding rental data...');

    // Crear propiedades para cada proyecto
    for (const project of projects) {
      // Crear edificio
      const building = new Rental({
        projectId: project._id,
        propertyType: 'building',
        propertyName: `Edificio Principal - ${project.name}`,
        address: {
          street: 'Calle Principal',
          number: '123',
          city: project.location?.city || 'Bogotá',
          state: project.location?.state || 'Cundinamarca',
          zipCode: '110111',
          country: 'Colombia'
        },
        buildingInfo: {
          totalFloors: 10,
          totalUnits: 20,
          commonAreas: ['Gimnasio', 'Piscina', 'Sala de reuniones'],
          amenities: ['Portería 24h', 'Ascensor', 'Parqueadero']
        },
        status: 'available'
      });

      const savedBuilding = await building.save();
      console.log(`Created building: ${savedBuilding.propertyName}`);

      // Crear apartamentos en el edificio
      for (let i = 1; i <= 5; i++) {
        const apartment = new Rental({
          projectId: project._id,
          parentId: savedBuilding._id,
          propertyType: 'apartment',
          propertyName: `Apartamento ${i}01`,
          unitNumber: `${i}01`,
          address: {
            street: 'Calle Principal',
            city: project.location?.city || 'Bogotá',
            state: project.location?.state || 'Cundinamarca',
            country: 'Colombia'
          },
          unitInfo: {
            floor: i,
            bedrooms: 2,
            bathrooms: 2,
            area: 75,
            furnished: false
          },
          price: 1200000 + (i * 50000), // Precios variables
          deposit: 2400000,
          expenses: {
            administration: 150000,
            maintenance: 50000,
            insurance: 25000
          },
          description: `Hermoso apartamento en el piso ${i} con vista panorámica`,
          features: ['Balcony', 'Kitchen', 'Parking'],
          status: 'available'
        });

        await apartment.save();
        console.log(`Created apartment: ${apartment.propertyName}`);
      }
    }

    console.log('Rental seeding completed successfully');
  } catch (error) {
    console.error('Error seeding rental data:', error);
  }
};

// Inicializar servicios programados
const schedulerService = require('./src/services/scheduler.service');
schedulerService.start();

// Seed database after connection
setTimeout(() => {
  seedDatabase();
}, 2000);

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
  schedulerService.stop();
  await whatsappService.destroy();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Recibida señal SIGINT. Cerrando aplicación...");
  schedulerService.stop();
  await whatsappService.destroy();
  process.exit(0);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
