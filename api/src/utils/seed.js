const { mongoose } = require('../db');
const { seedPromptForToday } = require('../routes/prompt_today');

async function main() {
  try {
    await seedPromptForToday();
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
});
