const router = require('express').Router();
const { Prompt } = require('../models');

router.get('/today', async (req, res) => {
  const date = new Date().toISOString().slice(0,10);
  const row = await Prompt.findOne({ date });
  res.json(row ?? { date, text: null, source: null });
});
module.exports = router;
