const { sequelize } = require("../src/models");

async function run() {
  const tableName = "audit_logs";
  const columnName = "hospital_id";
  const qi = sequelize.getQueryInterface();

  try {
    const table = await qi.describeTable(tableName);

    if (!table[columnName]) {
      await qi.addColumn(tableName, columnName, {
        type: sequelize.Sequelize.UUID,
        allowNull: true,
      });
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists on ${tableName}`);
    }

    // Backfill hospital_id from linked users for existing rows.
    await sequelize.query(`
      UPDATE audit_logs AS al
      SET hospital_id = u.hospital_id
      FROM users AS u
      WHERE al.user_id = u.id
        AND al.hospital_id IS NULL
    `);
    console.log("Backfilled audit_logs.hospital_id from users");
  } catch (error) {
    console.error("Failed to migrate audit_logs hospital_id:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
