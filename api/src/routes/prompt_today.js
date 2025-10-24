const fs = require('fs');
const path = require('path');

const { connect } = require('../db');
const { Prompt } = require('../models');

const fallbackPrompts = [
  'Name one thing you did today that cared for your body.',
  'What energized you this morning?',
  'Who in your community could use a check-in?'
];

const loadPrompts = () => {
  const promptsPath = path.join(__dirname, '..', '..', '..', 'prompts.yaml');
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('js-yaml not installed; using fallback prompts');
      return fallbackPrompts;
    }
    throw err;
  }
  try {
    const file = fs.readFileSync(promptsPath, 'utf8');
    const parsed = yaml.load(file);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
    console.warn('prompts.yaml must be an array of strings; using fallback prompts');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to load prompts.yaml: ${err.message}`);
    }
  }
  return fallbackPrompts;
};

async function seedPromptForToday() {
  await connect();
  const date = new Date().toISOString().slice(0, 10);
  const exists = await Prompt.findOne({ date });
  if (exists) {
    console.log('Prompt already set for', date);
    return { created: false, date };
  }
  const prompts = loadPrompts();
  const text = prompts[Math.floor(Math.random() * prompts.length)];
  await Prompt.create({ date, text, source: 'local' });
  console.log('Saved prompt for', date);
  return { created: true, date, text };
}

module.exports = { loadPrompts, seedPromptForToday };

if (require.main === module) {
  seedPromptForToday()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed prompt:', err);
      process.exit(1);
    });
}
