const express = require("express");
const router = express.Router();
const whatsappService = require('../lib/WhatsappBot/services/whatsappService');

// Middleware para validar el cuerpo de la solicitud
const validateMessageBody = (req, res, next) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: to and message are required",
    });
  }
  next();
};

// Enviar un mensaje individual
router.post("/send", validateMessageBody, async (req, res) => {
  try {
    const { to, message, options } = req.body;
    const result = await whatsappService.sendMessage(to, message, options);
    res.json({ success: true, data: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Enviar mensajes en masa
router.post("/bulk-send", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Messages must be an array",
      });
    }

    const results = await whatsappService.sendBulkMessages(messages);
    res.json({ success: true, data: results });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Enviar mensaje usando una plantilla
router.post("/send-template", async (req, res) => {
  try {
    const { to, templateName, data } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to and templateName are required",
      });
    }

    const result = await whatsappService.sendTemplate(to, templateName, data);
    res.json({ success: true, data: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
