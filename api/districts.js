const axios = require('axios');
const cheerio = require('cheerio');
/**
 * @swagger
 * /districts:
 *   get:
 *     summary: Get all districts for a given division
 *     parameters:
 *       - in: query
 *         name: divisionId
 *         required: true
 *         description: ID of the division to fetch districts for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of districts
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
    const { divisionId } = req.query;
    const url = `https://maharera.maharashtra.gov.in/div-district-data?state_code=27&lang_id=1&division_code=${divisionId}&district_form=custom_search_form&distruct_field=agent_district`;
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const districts = [];
    $('option').each((i, opt) => {
      const val = $(opt).attr('value');
      const name = $(opt).text().trim();
      if (val) districts.push({ id: parseInt(val, 10), name });
    });
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
};