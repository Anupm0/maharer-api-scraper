const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const { Parser } = require('json2csv');
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
 *         example: 1
 *       - in: query
 *         name: pages
 *         schema:
 *           type: integer
 *         description: Number of pages to fetch (defaults to 1).
 *         example: 3
 *       - in: query
 *         name: agent_name
 *         schema:
 *           type: string
 *         description: Name of the agent to filter.
 *         example: Anup
 *       - in: query
 *         name: agent_project_name
 *         schema:
 *           type: string
 *         description: Project name of the agent to filter.
 *         example: Skyline Plaza
 *       - in: query
 *         name: agent_location
 *         schema:
 *           type: string
 *         description: Location (city, area, or pincode) to filter agents.
 *         example: Pune
 *       - in: query
 *         name: agent_state
 *         schema:
 *           type: integer
 *         description: State code to filter agents (default 27 for Maharashtra).
 *         example: 27
 *       - in: query
 *         name: agent_division
 *         schema:
 *           type: integer
 *         description: Division code to filter agents.
 *         example: 1
 *       - in: query
 *         name: agent_district
 *         schema:
 *           type: integer
 *         description: District code to filter agents.
 *         example: 2
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format (defaults to json).
 *         example: json
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
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pages = 1,
      agent_name = '',
      agent_project_name = '',
      agent_location = '',
      agent_state = '27',
      agent_division = '',
      agent_district = '',
      format = 'json'
    } = req.query;

    const startPage = parseInt(page, 10);
    const pageCount = parseInt(pages, 10);
    
    if (pageCount <= 0 || startPage <= 0) {
      return res.status(400).json({ error: 'Invalid page parameters' });
    }

    // Fetch multiple pages in parallel
    const pagePromises = [];
    const pagesToFetch = Math.min(pageCount, 10); // Limit to 10 pages to avoid abuse
    
    for (let i = 0; i < pagesToFetch; i++) {
      pagePromises.push(fetchAgentsPage(startPage + i, {
        agent_name,
        agent_project_name,
        agent_location,
        agent_state,
        agent_division,
        agent_district
      }));
    }

    const pageResults = await Promise.all(pagePromises);
    
    // Combine results from all pages
    const agents = pageResults.flatMap(result => result.agents);
    
    // Get pagination info from the first result
    const firstResult = pageResults[0];
    const paginationInfo = {
      start_page: startPage,
      pages_fetched: pagesToFetch,
      total_pages: firstResult.pagination.total_pages,
      total_records: firstResult.pagination.total_records
    };

    // Return as JSON or CSV based on format parameter
    if (format.toLowerCase() === 'csv') {
      return sendAsCsv(res, agents);
    } else {
      return res.json({ agents, pagination: paginationInfo });
    }
  } catch (error) {
    console.error('Error handling agent request:', error);
    return res.status(500).json({ error: 'Failed to fetch agents data', message: error.message });
  }
});

/**
 * Fetch a single page of agents
 * @param {number} pageNum - Page number to fetch
 * @param {object} filters - Filter parameters
 * @returns {Promise<{agents: Array, pagination: object}>}
 */
async function fetchAgentsPage(pageNum, filters) {
  const BASE_URL = 'https://maharera.maharashtra.gov.in';
  const SEARCH_PATH = '/agents-search-result';

  // Build query parameters
  const queryParams = {
    agent_name: filters.agent_name || '',
    agent_project_name: filters.agent_project_name || '',
    agent_location: filters.agent_location || '',
    agent_state: filters.agent_state || '27',
    agent_division: filters.agent_division || '',
    agent_district: filters.agent_district || '',
    page: pageNum,
    op: 'Search'
  };

  // Fetch search results page HTML
  const response = await axios.get(
    `${BASE_URL}${SEARCH_PATH}?${qs.stringify(queryParams)}`
  );
  const $ = cheerio.load(response.data);

  const agents = [];
  $('table.responsiveTable tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    const sr_no = parseInt($(cols[0]).text().trim(), 10);
    const name = $(cols[1]).text().trim();
    const certificate_no = $(cols[2]).text().trim();

    // Details page link
    const detailsHref = $(cols[3]).find('a').attr('href') || '';
    const details_url = detailsHref.startsWith('http')
      ? detailsHref
      : `${BASE_URL}${detailsHref}`;

    // Certificate download link
    const certHref = $(cols[5]).find('a').attr('href') || '';
    const certificate_url = certHref.startsWith('http')
      ? certHref
      : `${BASE_URL}${certHref}`;
    
    // Certificate action
    const certificate_action = $(cols[5]).find('a').attr('data-agentstr');

    agents.push({ 
      sr_no, 
      name, 
      certificate_no, 
      details_url, 
      certificate_url,
      certificate_action
    });
  });

  // Pagination info
  const totalRecords = parseInt(
    $('.pagination .pagesCount').attr('data-total') || agents.length,
    10
  );
  const total_pages = Math.ceil(totalRecords / (agents.length || 1)) || 1;
  const current_page = pageNum;

  return { 
    agents, 
    pagination: { 
      current_page, 
      total_pages,
      total_records: totalRecords
    } 
  };
}

/**
 * Send the response as a CSV file
 * @param {object} res - Express response object
 * @param {Array} agents - Agents data
 */
function sendAsCsv(res, agents) {
  try {
    const fields = [
      { label: 'Sr No', value: 'sr_no' },
      { label: 'Agent Name', value: 'name' },
      { label: 'Certificate Number', value: 'certificate_no' },
      { label: 'Details URL', value: 'details_url' },
      { label: 'Certificate URL', value: 'certificate_url' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(agents);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=maharera_agents.csv');
    
    return res.send(csv);
  } catch (error) {
    console.error('Error creating CSV:', error);
    return res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

module.exports = router;