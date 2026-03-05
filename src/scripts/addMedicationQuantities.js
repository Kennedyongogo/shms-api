const { sequelize } = require("../models");

async function main() {
  console.log("Adding quantity and unit columns to medications (if missing)...");
  const qi = sequelize.getQueryInterface();
  const table = "medications";

  const describe = await qi.describeTable(table);

  if (!describe.initial_quantity) {
    console.log("- Creating column initial_quantity...");
    await qi.addColumn(table, "initial_quantity", {
      type: require("sequelize").DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Initial stock quantity for silver package hospitals (pharmacy-only stock).",
    });
  } else {
    console.log("- Column initial_quantity already exists, skipping.");
  }

  if (!describe.current_quantity) {
    console.log("- Creating column current_quantity...");
    await qi.addColumn(table, "current_quantity", {
      type: require("sequelize").DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Current stock quantity for silver package hospitals (pharmacy-only stock).",
    });
  } else {
    console.log("- Column current_quantity already exists, skipping.");
  }

  if (!describe.unit) {
    console.log("- Creating column unit...");
    await qi.addColumn(table, "unit", {
      type: require("sequelize").DataTypes.STRING(50),
      allowNull: true,
      comment: "Unit for silver hospitals (e.g. tablet, bottle, ml).",
    });
  } else {
    console.log("- Column unit already exists, skipping.");
  }

  if (!describe.pack_size) {
    console.log("- Creating column pack_size...");
    await qi.addColumn(table, "pack_size", {
      type: require("sequelize").DataTypes.INTEGER,
      allowNull: true,
      comment: "Units per pack for silver hospitals (e.g. 20 tablets per pack).",
    });
  } else {
    console.log("- Column pack_size already exists, skipping.");
  }

  console.log("✅ Done.");
}

main()
  .then(() => {
    console.log("Migration complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error adding medication quantity columns:", err);
    process.exit(1);
  });

