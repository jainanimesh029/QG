/**
 * Seeds sample components. Safe to run repeatedly - existing components
 * (matched by name) are left untouched, so any price edits you made are kept.
 *
 *   npm run seed
 *
 * Reads MONGODB_URI from the environment or from .env.local.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith('#')) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

// Placeholder prices (INR) - adjust them in the app or here.
const SAMPLE_COMPONENTS = [
  { name: 'Raspberry Pi 4 1GB + Accessories', bulkPrice: 4200, retailPrice: 4800 },
  { name: 'SpO₂ Sensor Module', bulkPrice: 350, retailPrice: 450 },
  { name: 'Temperature Sensor Module', bulkPrice: 180, retailPrice: 250 },
  { name: 'Breadboard & Wire', bulkPrice: 120, retailPrice: 180 },
  { name: 'Power Supply', bulkPrice: 350, retailPrice: 450 },
];

// Must match models/Component.js so both create the exact same index.
const ComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bulkPrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
ComponentSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
const Component = mongoose.models.Component || mongoose.model('Component', ComponentSchema);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Create .env.local (see .env.local.example).');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await Component.init(); // make sure the unique index exists

  let created = 0;
  for (const item of SAMPLE_COMPONENTS) {
    const exists = await Component.exists({ name: item.name }).collation({ locale: 'en', strength: 2 });
    if (exists) {
      console.log(`  skip    ${item.name} (already exists)`);
      continue;
    }
    await Component.create(item);
    created++;
    console.log(`  added   ${item.name}`);
  }

  console.log(`\nDone. ${created} added, ${SAMPLE_COMPONENTS.length - created} already present.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
