const Rental = require('../models/rental.model');

exports.createRental = async (req, res) => {
  try {
    const rental = new Rental(req.body);
    const savedRental = await rental.save();
    res.status(201).json(savedRental);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getRentals = async (req, res) => {
  try {
    const { projectId, propertyType, parentId, includeChildren } = req.query;
    let query = {}; // Remover isActive: true por ahora para debugging

    if (projectId) query.projectId = projectId;
    if (propertyType) query.propertyType = propertyType;
    if (parentId) query.parentId = parentId;

    let rentals = await Rental.find(query); // Remover populate por ahora

    // Si se solicita incluir hijos, poblar las unidades de cada edificio
    if (includeChildren === 'true') {
      const rentalsWithChildren = await Promise.all(
        rentals.map(async (rental) => {
          if (rental.propertyType === 'building') {
            const children = await rental.getChildUnits();
            return { ...rental.toObject(), childUnits: children };
          }
          return rental;
        })
      );
      rentals = rentalsWithChildren;
    }

    res.json({ data: rentals });
  } catch (error) {
    console.error('Error in getRentals:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getRentalById = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    res.json(rental);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRental = async (req, res) => {
  try {
    const rental = await Rental.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    res.json(rental);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Si es una propiedad padre, verificar que no tenga unidades activas
    if (rental.isParentProperty()) {
      const childUnits = await rental.getChildUnits();
      const activeUnits = childUnits.filter(unit => unit.status === 'rented');
      if (activeUnits.length > 0) {
        return res.status(400).json({
          message: 'Cannot delete building with active rental units'
        });
      }
    }

    await Rental.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rental deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear propiedad padre (edificio o casa)
exports.createBuilding = async (req, res) => {
  try {
    const buildingData = {
      ...req.body,
      propertyType: req.body.propertyType || 'building',
      parentId: null // Asegurar que sea propiedad padre
    };

    const building = new Rental(buildingData);
    const savedBuilding = await building.save();

    res.status(201).json({
      data: savedBuilding,
      message: 'Building created successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Crear unidad hija (apartamento) dentro de un edificio
exports.createUnit = async (req, res) => {
  try {
    const { parentId } = req.body;

    // Verificar que el padre existe y es una propiedad padre
    const parentProperty = await Rental.findById(parentId);
    if (!parentProperty || !parentProperty.isParentProperty()) {
      return res.status(400).json({
        message: 'Invalid parent property. Must be a building or house.'
      });
    }

    const unitData = {
      ...req.body,
      propertyType: req.body.propertyType || 'apartment',
      projectId: parentProperty.projectId // Heredar proyecto del padre
    };

    const unit = new Rental(unitData);
    const savedUnit = await unit.save();

    res.status(201).json({
      data: savedUnit,
      message: 'Unit created successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener unidades de un edificio específico
exports.getBuildingUnits = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const units = await Rental.findAvailableUnitsInBuilding(buildingId);

    res.json({
      data: units,
      count: units.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener jerarquía completa de propiedades
exports.getPropertyHierarchy = async (req, res) => {
  try {
    const { projectId } = req.query;

    // Obtener todas las propiedades padre
    const parentProperties = await Rental.findBuildingsWithAvailableUnits(projectId);

    // Para cada propiedad padre, obtener sus unidades
    const hierarchy = await Promise.all(
      parentProperties.map(async (property) => {
        const units = await property.getChildUnits();
        return {
          ...property.toObject(),
          units: units,
          totalUnits: units.length,
          availableUnits: units.filter(u => u.status === 'available').length,
          rentedUnits: units.filter(u => u.status === 'rented').length
        };
      })
    );

    res.json({
      data: hierarchy,
      summary: {
        totalBuildings: hierarchy.length,
        totalUnits: hierarchy.reduce((sum, b) => sum + b.totalUnits, 0),
        availableUnits: hierarchy.reduce((sum, b) => sum + b.availableUnits, 0),
        rentedUnits: hierarchy.reduce((sum, b) => sum + b.rentedUnits, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener propiedades disponibles para contratos
exports.getAvailableForContract = async (req, res) => {
  try {
    const { projectId } = req.query;

    // Obtener propiedades padre disponibles
    const availableBuildings = await Rental.findBuildingsWithAvailableUnits(projectId);

    // Obtener unidades individuales disponibles
    const availableUnits = await Rental.findAvailableProperties(projectId);

    // Filtrar solo unidades (no edificios)
    const individualUnits = availableUnits.filter(r => r.isChildUnit());

    res.json({
      data: {
        buildings: availableBuildings,
        units: individualUnits
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
