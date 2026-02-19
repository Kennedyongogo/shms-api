const { Bed } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: Bed,
  name: "Bed",
  searchableFields: ["bed_number", "status"],
});

const updateBedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const bed = await Bed.findByPk(id);
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    const updated = await bed.update({ status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating bed status", error: error.message });
  }
};

module.exports = { ...crud, updateBedStatus };

