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
 *       result page and parses the HTML to extract agent listings and pagination info.
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
 *         description: Location (city or area) to filter agents.
 *         example: Pune
 *       - in: query
 *         name: agent_state
 *         schema:
 *           type: integer
 *         description: State code to filter agents.
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
 *         description: List of agents and pagination info
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
 *                         description: Serial number of the agent.
 *                       name:
 *                         type: string
 *                         description: Name of the agent.
 *                       certificate_no:
 *                         type: string
 *                         description: Certificate number of the agent.
 *                       details_url:
 *                         type: string
 *                         description: URL linking to agent details.
 *                       application_action:
 *                         type: string
 *                         description: Application action data.
 *                       certificate_action:
 *                         type: string
 *                         description: Certificate action data.
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
    agent_state = '',
    agent_division = '',
    agent_district = ''
  } = req.query;

  const searchUrl = 'https://maharera.maharashtra.gov.in/agents-search-result';

  try {
    // Build query parameters for GET request
    const params = {
      agent_name,
      agent_project_name,
      agent_location,
      agent_state,
      agent_division,
      agent_district,
      page,
      op: 'Search'
    };

    // Perform GET to fetch search results
    const { data: html } = await axios.get(`${searchUrl}?${qs.stringify(params)}`);
    const $ = cheerio.load(html);

    // Parse agent rows
    const agents = [];
    $('table.responsiveTable tbody tr').each((_, row) => {
      const cols = $(row).find('td');
      const sr_no = parseInt($(cols[0]).text().trim(), 10);
      const name = $(cols[1]).text().trim();
      const certificate_no = $(cols[2]).text().trim();
      const details_url = $(cols[3]).find('a').attr('href');
      const application_action = $(cols[4]).find('a').attr('data-agentstr');
      const certificate_action = $(cols[5]).find('a').attr('data-agentstr');
      agents.push({ sr_no, name, certificate_no, details_url, application_action, certificate_action });
    });

    // Calculate pagination
    const total = parseInt($('.pagination .pagesCount').attr('data-total'), 10) || agents.length;
    const total_pages = Math.ceil(total / (agents.length || 1));
    const current_page = parseInt(page, 10);

    return res.json({ agents, pagination: { current_page, total_pages } });
  } catch (error) {
    console.error('Error fetching agents:', error.message);
    return res.status(500).json({ error: 'Failed to fetch agents data' });
  }
};
