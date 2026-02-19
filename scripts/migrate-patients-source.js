/* eslint-disable no-console */
/**
 * One-off migration:
 * Add patients.patient_source column to track walk-in vs public portal.
 *
 * Run:
 *   node scripts/migrate-patients-source.js
 */

require("dotenv").config();
const { directSequelize } = require("../src/config/database");

async function columnExists(table, col) {
  const qi = directSequelize.getQueryInterface();
  const cols = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(cols, col);
}

async function main() {
  await directSequelize.authenticate();
  console.log("✅ Connected (direct).");

  const table = "patients";
  const col = "patient_source";
  if (await columnExists(table, col)) {
    console.log(`Skipping ${table}.${col} (already exists)`);
    return;
  }

  console.log(`Adding ${table}.${col}...`);
  await directSequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${col}" VARCHAR(20) NOT NULL DEFAULT 'walk_in';`);

  console.log("✅ Patient source migration complete.");
}

main()
  .catch((err) => {
    console.error("❌ Migration failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await directSequelize.close();
    } catch {
      // ignore
    }
  });

