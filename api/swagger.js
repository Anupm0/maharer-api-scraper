// filepath: c:\Users\Abcom\Desktop\maharera\api\swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

module.exports = async (req, res) => {
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'MahaRERA Agents Scraper API',
      version: '1.0.0',
      description: 'API to scrape agent data from MahaRERA with filtering and pagination using Cheerio',
    },
    servers: [
      {
        url: `${req.protocol}://${req.get('host')}/api`,
        description: 'Dynamic server',
      },
    ],
  };

  const options = {
    swaggerDefinition,
    apis: ['./api/*.js'], // Path to the API files with Swagger annotations
  };

  const swaggerSpec = swaggerJsdoc(options);
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};