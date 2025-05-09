const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Fetch agents data from MahaRERA with filters and pagination
 *     description: |
 *       This endpoint retrieves agent data from the MahaRERA website based on provided
 *       filters and pagination parameters. It constructs a GET request to the public search
 *       result page and parses the HTML to extract agent listings, detail links, and
 *       certificate download links, along with pagination info.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number to fetch (defaults to 1).
 *         example: 2
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
 *                         description: Serial number of the agent record.
 *                       name:
 *                         type: string
 *                         description: Name of the agent.
 *                       certificate_no:
 *                         type: string
 *                         description: Certificate number of the agent.
 *                       details_url:
 *                         type: string
 *                         description: URL for full agent details page.
 *                       certificate_url:
 *                         type: string
 *                         description: Direct URL to download the agent's certificate PDF.
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       description: Current page number.
 *                     total_pages:
 *                       type: integer
 *                       description: Total number of pages available.
 *       500:
 *         description: Failed to fetch agent data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch agents data
 */
module.exports = async (req, res) => {
  const {
    page = 1,
    agent_name = '',
    agent_project_name = '',
    agent_location = '',
    agent_state = '27',
    agent_division = '',
    agent_district = ''
  } = req.query;

  const BASE_URL = 'https://maharera.maharashtra.gov.in';
  const SEARCH_PATH = '/agents-search-result';

  try {
    // Build query parameters
    const queryParams = {
      agent_name,
      agent_project_name,
      agent_location,
      agent_state,
      agent_division,
      agent_district,
      page,
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

      agents.push({ sr_no, name, certificate_no, details_url, certificate_url });
    });

    // Pagination info
    const totalRecords = parseInt(
      $('.pagination .pagesCount').attr('data-total') || agents.length,
      10
    );
    const total_pages = Math.ceil(totalRecords / (agents.length || totalRecords));
    const current_page = parseInt(page, 10);

    return res.json({ agents, pagination: { current_page, total_pages } });
  } catch (error) {
    console.error('Error fetching agents:', error.stack);
    return res.status(500).json({ error: 'Failed to fetch agents data' });
  }
};
