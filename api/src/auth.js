const cookie = require('cookie');
const { User } = require('./models');

function setSessionCookie(res, username) {
  res.setHeader('Set-Cookie', cookie.serialize('session', username, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*7
  }));
}

async function requireUser(req, res, next) {
  const c = req.headers.cookie && cookie.parse(req.headers.cookie);
  const username = c?.session;
  if (!username) return res.status(401).json({ message: 'unauthorized' });
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'unauthorized' });
  req.user = user;
  next();
}

module.exports = { setSessionCookie, requireUser };
