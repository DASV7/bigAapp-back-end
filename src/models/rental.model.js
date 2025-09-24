const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },

  // Jerarquía de propiedades
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    default: null // null = propiedad padre (edificio/casa completa)
  },

  propertyType: {
    type: String,
    enum: ['building', 'house', 'apartment', 'unit'],
    required: true
  },

  propertyName: {
    type: String,
    required: true
  },

  unitNumber: {
    type: String,
    required: function() {
      return this.propertyType === 'apartment' || this.propertyType === 'unit';
    }
  },

  // Dirección completa (para edificio) o relativa (para apartamentos)
  address: {
    street: String,
    number: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Colombia' }
  },

  // Información específica por tipo
  buildingInfo: {
    totalFloors: Number,
    totalUnits: Number,
    commonAreas: [String],
    amenities: [String]
  },

  unitInfo: {
    floor: Number,
    bedrooms: Number,
    bathrooms: Number,
    area: Number, // en m²
    furnished: { type: Boolean, default: false }
  },

  // Información financiera
  price: {
    type: Number,
    required: function() {
      return this.propertyType !== 'building';
    }
  },

  deposit: {
    type: Number,
    default: 0
  },

  expenses: {
    administration: { type: Number, default: 0 },
    maintenance: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 }
  },

  description: String,
  features: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'inactive'],
    default: 'available'
  },

  images: {
    type: [String],
    default: []
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Índices para búsquedas eficientes
rentalSchema.index({ projectId: 1, propertyType: 1 });
rentalSchema.index({ parentId: 1 });
rentalSchema.index({ propertyType: 1, status: 1 });

// Método para obtener unidades hijas (apartamentos de un edificio)
rentalSchema.methods.getChildUnits = async function() {
  if (this.propertyType !== 'building') {
    return [];
  }
  return await mongoose.model('Rental').find({ parentId: this._id });
};

// Método para obtener propiedad padre
rentalSchema.methods.getParentProperty = async function() {
  if (!this.parentId) {
    return null;
  }
  return await mongoose.model('Rental').findById(this.parentId);
};

// Método para verificar si es una propiedad padre
rentalSchema.methods.isParentProperty = function() {
  return !this.parentId && (this.propertyType === 'building' || this.propertyType === 'house');
};

// Método para verificar si es una unidad hija
rentalSchema.methods.isChildUnit = function() {
  return !!this.parentId && (this.propertyType === 'apartment' || this.propertyType === 'unit');
};

// Método para obtener dirección completa
rentalSchema.methods.getFullAddress = function() {
  if (this.isChildUnit()) {
    // Para unidades, combinar dirección del padre + número de unidad
    return `${this.address?.street || ''} ${this.unitNumber || ''}, ${this.address?.city || ''}`;
  } else {
    // Para propiedades padre, dirección completa
    return `${this.address?.street || ''} ${this.address?.number || ''}, ${this.address?.city || ''}`;
  }
};

// Método para calcular precio total (alquiler + gastos)
rentalSchema.methods.getTotalMonthlyCost = function() {
  if (this.propertyType === 'building') {
    return 0; // Los edificios no tienen costo directo de alquiler
  }

  return (this.price || 0) +
         (this.expenses?.administration || 0) +
         (this.expenses?.maintenance || 0) +
         (this.expenses?.insurance || 0);
};

// Método estático para encontrar propiedades disponibles
rentalSchema.statics.findAvailableProperties = function(projectId = null) {
  const query = { status: 'available', isActive: true };

  if (projectId) {
    query.projectId = projectId;
  }

  return this.find(query).populate('projectId');
};

// Método estático para encontrar edificios con unidades disponibles
rentalSchema.statics.findBuildingsWithAvailableUnits = function(projectId = null) {
  const query = {
    propertyType: 'building',
    isActive: true,
    projectId: projectId || { $exists: true }
  };

  return this.find(query).populate('projectId');
};

// Método estático para encontrar unidades disponibles en un edificio
rentalSchema.statics.findAvailableUnitsInBuilding = function(buildingId) {
  return this.find({
    parentId: buildingId,
    propertyType: { $in: ['apartment', 'unit'] },
    status: 'available',
    isActive: true
  });
};

module.exports = mongoose.model('Rental', rentalSchema);
