const { InsuranceClaim, Bill } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: InsuranceClaim,
  name: "InsuranceClaim",
  searchableFields: ["insurance_provider", "claim_status"],
});

const updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { claim_status } = req.body;
    const claim = await InsuranceClaim.findByPk(id);
    if (!claim) return res.status(404).json({ success: false, message: "Insurance claim not found" });

    const updated = await claim.update({ claim_status });
    // optional: if paid, mark bill partial/paid remains handled by payments
    const bill = await Bill.findByPk(updated.bill_id);
    return res.status(200).json({ success: true, data: { claim: updated, bill } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating claim", error: error.message });
  }
};

module.exports = { ...crud, updateClaimStatus };

