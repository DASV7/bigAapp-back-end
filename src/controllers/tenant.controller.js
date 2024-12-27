const Tenant = require('../models/tenant.model');

exports.createTenant = async (req, res) => {
  try {
    console.log('Datos recibidos en createTenant:', req.body);
    const tenant = new Tenant(req.body);
    const savedTenant = await tenant.save();
    res.status(201).json(savedTenant);
  } catch (error) {
    console.error('Error en createTenant:', error);
    
    // Manejar error de duplicación
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = `El ${field === 'email' ? 'correo electrónico' : 'número de documento'} ya está registrado`;
      return res.status(400).json({ 
        message,
        field,
        type: 'duplicate'
      });
    }
    
    // Otros errores de validación
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Error de validación',
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    // Error general
    res.status(500).json({ message: 'Error al crear el inquilino' });
  }
};

exports.getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Inquilino no encontrado' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!tenant) {
      return res.status(404).json({ message: 'Inquilino no encontrado' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Inquilino no encontrado' });
    }
    res.json({ message: 'Inquilino eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
