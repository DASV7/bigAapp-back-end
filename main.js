// Importa las dependencias
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDbMongo = require("./src/db/dbConnection");

const app = express();
const port = process.env.PORT || 5500;

const allowedOrigins = ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));

const server = http.createServer(app);
connectDbMongo();

//log node version
const { exec } = require("child_process");
exec("node -v", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error al ejecutar el comando: ${error}`);
    return;
  }
  console.log(`Versión de Node.js: ${stdout}`);
});

server.listen(port, () => {
  console.log("Servidor Socket.io escuchando en el puerto http://localhost:5500");
});
