const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(morgan('dev'));

// Static files
app.use('/media', express.static('media'));

// API Routes
app.use('/api', require('./routes/uploadRock'));
app.use('/api', require('./routes/fileSystem'));
app.use('/api/testdata', require('./routes/testData'));
app.use('/api', require('./routes/misc'));
app.use('/api', require('./routes/rockCount'));
app.use('/api', require('./routes/createImages'));

// Health Check
app.get('/health', (req, res) => res.send('OK'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
