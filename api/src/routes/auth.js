const router = require('express').Router();
const { setSessionCookie } = require('../auth');
const { User } = require('../models');

router.post('/login', async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: 'username required' });
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'invalid user' });
  setSessionCookie(res, user.username);
  res.json({ ok: true, user: { id: user._id, displayName: user.displayName } });
});

module.exports = router;
