const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const { Parser } = require('json2csv');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const router = express.Router();

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Fetch agents data from MahaRERA with filters and pagination
 *     description: |
 *       This endpoint retrieves agent data from the MahaRERA website based on provided
 *       filters and pagination parameters. It can fetch multiple pages in a single request.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Starting page number to fetch (defaults to 1).
 *       - in: query
 *         name: pages
 *         schema:
 *           type: integer
 *         description: Number of pages to fetch (defaults to 1, max 10).
 *       - in: query
 *         name: agent_name
 *         schema:
 *           type: string
 *         description: Name of the agent to filter.
 *       - in: query
 *         name: agent_location
 *         schema:
 *           type: string
 *         description: Location (city, area, or pincode) to filter agents.
 *       - in: query
 *         name: agent_state
 *         schema:
 *           type: integer
 *         description: State code to filter agents (default 27 for Maharashtra).
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format (defaults to json).
 *     responses:
 *       200:
 *         description: List of agents with detail and certificate URLs, plus pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sr_no:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       certificate_no:
 *                         type: string
 *                       details_url:
 *                         type: string
 *                       certificate_url:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     start_page:
 *                       type: integer
 *                     pages_fetched:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *                     total_records:
 *                       type: integer
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Failed to fetch agent data
 */

// Base constants
const BASE_URL = 'https://maharera.maharashtra.gov.in';
const SEARCH_PATH = '/agents-search-result';

/**
 * GET /agents
 * Fetch filtered agent data (multiple pages) from MahaRERA
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pages = 1,
      agent_name = '',
      agent_location = '', // Changed from pin_code to agent_location
      agent_state = '27',
      format = 'json'
    } = req.query;

    const startPage = parseInt(page, 10);
    const pagesToFetch = Math.min(parseInt(pages, 10), 10);
    if (startPage < 1 || pagesToFetch < 1) {
      return res.status(400).json({ error: 'Invalid page parameters' });
    }

    // Build an axios instance with cookie jar support
    const jar = new tough.CookieJar();
    const client = wrapper(axios.create({ 
      baseURL: BASE_URL, 
      jar, 
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    }));

    // First, GET the search page to grab form tokens and session cookie
    const landingResp = await client.get(SEARCH_PATH);
    const $landing = cheerio.load(landingResp.data);
    const formBuildId = $landing('input[name="form_build_id"]').val();
    const formToken = $landing('input[name="form_token"]').val();
    const formId = $landing('input[name="form_id"]').val();

    if (!formBuildId || !formId) {
      throw new Error('Failed to retrieve form tokens');
    }

    // Fetch requested pages in serial to avoid overloading the server
    const results = [];
    for (let i = 0; i < pagesToFetch; i++) {
      try {
        const pageResult = await fetchAgentsPage(client, startPage + i, {
          agent_name,
          agent_location,
          agent_state,
          form_build_id: formBuildId,
          form_token: formToken,
          form_id: formId
        });
        
        results.push(pageResult);
        
        // Add a small delay between requests
        if (i < pagesToFetch - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Failed to fetch page ${startPage + i}:`, err.message);
        // Continue with other pages if one fails
      }
    }

    // If all pages failed, throw an error
    if (results.length === 0) {
      throw new Error('Failed to fetch any pages');
    }

    const agents = results.flatMap(r => r.agents);
    const pagination = {
      start_page: startPage,
      pages_fetched: results.length,
      total_pages: results[0].pagination.total_pages,
      total_records: results[0].pagination.total_records
    };

    if (format.toLowerCase() === 'csv') {
      return sendAsCsv(res, agents);
    } else {
      return res.json({ agents, pagination });
    }
  } catch (err) {
    console.error('Error in /agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents data', message: err.message });
  }
});

/**
 * Fetch a single page of agents using POST with FormData
 */
async function fetchAgentsPage(client, pageNum, tokens) {
  // Create FormData instance
  const formData = new FormData();
  
  // Append all required fields
  formData.append('agent_name', tokens.agent_name || '');
  formData.append('agent_location', tokens.agent_location || '');
  formData.append('agent_state', tokens.agent_state || '27');
  formData.append('page', pageNum);
  formData.append('form_build_id', tokens.form_build_id);
  formData.append('form_token', tokens.form_token || '');
  formData.append('form_id', tokens.form_id);
  formData.append('op', 'Search');

  // Get form headers
  const formHeaders = formData.getHeaders();
  
  // Make POST request with FormData
  const resp = await client.post(SEARCH_PATH, formData, {
    headers: {
      ...formHeaders,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}${SEARCH_PATH}`
    }
  });

  const $ = cheerio.load(resp.data);
  const agents = [];

  $('table.responsiveTable tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 6) {
      agents.push({
        sr_no: parseInt($(cols[0]).text().trim(), 10),
        name: $(cols[1]).text().trim(),
        certificate_no: $(cols[2]).text().trim(),
        details_url: makeAbsolute($(cols[3]).find('a').attr('href')),
        certificate_url: makeAbsolute($(cols[5]).find('a').attr('href'))
      });
    }
  });

  const totalRecords = parseInt($('span.pagesCount').attr('data-total') || agents.length, 10);
  const total_pages = Math.ceil(totalRecords / (agents.length || 1)) || 1;

  return {
    agents,
    pagination: { current_page: pageNum, total_pages, total_records: totalRecords }
  };
}

/**
 * Convert hrefs to absolute URLs
 */
function makeAbsolute(href) {
  if (!href) return '';
  return href.startsWith('http') ? href : `${BASE_URL}${href}`;
}

/**
 * Send JSON array as CSV download
 */
function sendAsCsv(res, agents) {
  const fields = [
    { label: 'Sr No', value: 'sr_no' },
    { label: 'Agent Name', value: 'name' },
    { label: 'Certificate Number', value: 'certificate_no' },
    { label: 'Details URL', value: 'details_url' },
    { label: 'Certificate URL', value: 'certificate_url' }
  ];
  const csv = new Parser({ fields }).parse(agents);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=maharera_agents.csv');
  res.send(csv);
}

module.exports = router;
