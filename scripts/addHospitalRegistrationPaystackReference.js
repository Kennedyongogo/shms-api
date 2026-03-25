const { sequelize } = require("../src/models");

async function run() {
  const tableName = "hospitals";
  const columnName = "registration_paystack_reference";
  const qi = sequelize.getQueryInterface();

  try {
    const table = await qi.describeTable(tableName);

    if (!table[columnName]) {
      await qi.addColumn(tableName, columnName, {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: "Paystack transaction reference used when this hospital was created (prevents reuse).",
      });
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists on ${tableName}`);
    }
  } catch (error) {
    console.error("Failed to migrate hospitals registration_paystack_reference:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
