// filepath: c:\Users\Abcom\Desktop\maharera\api\docs.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const express = require('express');

const app = express();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'MahaRERA Agents Scraper API',
    version: '1.0.0',
    description: 'API to scrape agent data from MahaRERA with filtering and pagination using Cheerio',
  },
  servers: [
    {
      url: '/api',
      description: 'Dynamic server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./api/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;