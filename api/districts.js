const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

/**
 * @swagger
 * /districts:
 *   get:
 *     summary: Get all districts for a given division
 *     description: |
 *       This endpoint retrieves all districts available for a specific division from the MahaRERA website.
 *     parameters:
 *       - in: query
 *         name: division_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the division to fetch districts for
 *         example: 1
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
 *                     description: District ID
 *                   name:
 *                     type: string
 *                     description: District name
 *       400:
 *         description: Division ID is required
 *       500:
 *         description: Failed to fetch districts
 */
router.get('/', async (req, res) => {
  try {
    const { division_id } = req.query;
    
    if (!division_id) {
      return res.status(400).json({ error: 'division_id parameter is required' });
    }
    
    const url = `https://maharera.maharashtra.gov.in/div-district-data?state_code=27&lang_id=1&division_code=${division_id}&district_form=custom_search_form&distruct_field=agent_district`;
    const { data: html } = await axios.get(url);
    
    const $ = cheerio.load(html);
    const districts = [];
    
    $('option').each((i, opt) => {
      const val = $(opt).attr('value');
      const name = $(opt).text().trim();
      
      // Skip empty/default options
      if (val && name !== 'District') {
        districts.push({ id: parseInt(val, 10), name });
      }
    });
    
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

module.exports = router;