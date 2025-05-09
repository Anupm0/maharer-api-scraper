const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const agentsRouter = require('./api/agents');
const divisionsRouter = require('./api/divisions');
const districtsRouter = require('./api/districts');

const app = express();
const PORT = process.env.PORT || 3010;

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Swagger configuration
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'MahaRERA Agents Scraper API',
    version: '1.0.0',
    description: 'API to scrape agent data from MahaRERA with filtering, pagination, and CSV export',
  },
  servers: [
    {
      url: `/api`,
      description: 'API server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./api/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// API routes
app.use('/api/agents', agentsRouter);
app.use('/api/divisions', divisionsRouter);
app.use('/api/districts', districtsRouter);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root to Swagger docs
app.get('/', (req, res) => {
  res.redirect('/api/docs');
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app; // Export for Vercel