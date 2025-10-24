const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { PORT = 4000, CLIENT_ORIGIN = 'http://localhost:3000' } = process.env;
const { connect } = require('./db');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const promptsRoutes = require('./routes/prompts');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/prompt', promptsRoutes);

async function start() {
  try {
    await connect();
    app.listen(Number(PORT), () => {
      console.log(`Server listening on port ${PORT} (CORS origin: ${CLIENT_ORIGIN})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
