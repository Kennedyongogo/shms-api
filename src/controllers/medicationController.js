const { Medication, InventoryItem, Hospital, Drug, DrugFormulation } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");
const { getHospitalId } = require("../utils/hospitalScope");

const medicationInclude = [
  {
    model: InventoryItem,
    as: "inventoryItem",
    attributes: ["id", "name", "quantity_available", "quantity_in_pharmacy", "unit"],
  },
  {
    model: Drug,
    as: "catalogueDrug",
    required: false,
    attributes: ["id", "name", "drug_category_id"],
  },
  {
    model: DrugFormulation,
    as: "catalogueFormulation",
    required: false,
    attributes: ["id", "dose_form", "strength_size", "drug_id"],
  },
];

const baseCrud = createCrudController({
  Model: Medication,
  name: "Medication",
  searchableFields: ["name", "dosage_form", "manufacturer"],
  include: medicationInclude,
  scopeByHospital: true,
});

// Wrap create/update so that for silver package hospitals we allow locally managed quantity on the medication itself.
async function withPackageAwareQuantities(handler, req, res, next) {
  const hid = getHospitalId(req);
  let isSilver = false;
  if (hid) {
    const hospital = await Hospital.findByPk(hid, { attributes: ["subscription_package"] });
    isSilver = hospital?.subscription_package === "silver";
  }
  // Attach flag so underlying handler (and Model hooks, if any) can see it.
  req.isSilverPackage = isSilver;
  return handler(req, res, next);
}

async function create(req, res, next) {
  return withPackageAwareQuantities(async (innerReq, innerRes, innerNext) => {
    // For silver hospitals: when creating, initialize current_quantity from initial_quantity
    if (innerReq.isSilverPackage) {
      const raw = innerReq.body?.initial_quantity;
      const n = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      if (n != null && Number.isFinite(n) && n >= 0) {
        innerReq.body.initial_quantity = n;
        innerReq.body.current_quantity = n;
      } else {
        // Default both to 0 if not provided or invalid
        innerReq.body.initial_quantity = 0;
        innerReq.body.current_quantity = 0;
      }
    } else {
      // Gold: ignore any direct quantity fields coming from client
      if (innerReq.body) {
        delete innerReq.body.initial_quantity;
        delete innerReq.body.current_quantity;
      }
    }
    return baseCrud.create(innerReq, innerRes, innerNext);
  }, req, res, next);
}

async function update(req, res, next) {
  return withPackageAwareQuantities(async (innerReq, innerRes, innerNext) => {
    if (innerReq.isSilverPackage) {
      // Allow updating initial_quantity as a reference, but do not automatically change current_quantity here
      if (innerReq.body && "initial_quantity" in innerReq.body) {
        const raw = innerReq.body.initial_quantity;
        const n = raw === undefined || raw === null || raw === "" ? null : Number(raw);
        innerReq.body.initial_quantity =
          n != null && Number.isFinite(n) && n >= 0 ? n : undefined;
      }
      // Never let client override current_quantity directly from this form
      if (innerReq.body) delete innerReq.body.current_quantity;
    } else if (innerReq.body) {
      // Gold: strip quantity fields completely
      delete innerReq.body.initial_quantity;
      delete innerReq.body.current_quantity;
    }
    return baseCrud.update(innerReq, innerRes, innerNext);
  }, req, res, next);
}

module.exports = {
  ...baseCrud,
  create,
  update,
};

