const axios = require('axios');
const cheerio = require('cheerio');

/**
 * @swagger
 * /divisions:
 *   get:
 *     summary: Get all divisions for Maharashtra (stateCode=27)
 *     responses:
 *       200:
 *         description: List of divisions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
module.exports = async (req, res) => {
  try {
    const url = 'https://maharera.maharashtra.gov.in/get-division-data?stateCode=27&langID=1&form_code=custom_search_form&field_code=agent_division';
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const divisions = [];
    $('option').each((i, opt) => {
      const val = $(opt).attr('value');
      const name = $(opt).text().trim();
      if (val) divisions.push({ id: parseInt(val, 10), name });
    });
    res.json(divisions);
  } catch (error) {
    console.error('Error fetching divisions', error);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
};