const { sequelize } = require("../src/models");

async function run() {
  const tableName = "admins";
  const columnName = "profile_image_path";

  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable(tableName);

    if (!table[columnName]) {
      await queryInterface.addColumn(tableName, columnName, {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true,
      });
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists on ${tableName}`);
    }
  } catch (error) {
    console.error("Failed to add admin profile image column:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
