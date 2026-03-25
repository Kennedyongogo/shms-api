const { sequelize, RegistrationPackagePayment } = require("../src/models");

/**
 * Creates registration_package_payments if missing (Paystack package payments at signup).
 */
async function run() {
  try {
    await RegistrationPackagePayment.sync({ force: false, alter: false });
    console.log("registration_package_payments table synced");
  } catch (error) {
    console.error("Failed to sync registration_package_payments:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
