const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Fetch agents data from MahaRERA with filters and pagination
 *     description: This endpoint fetches agent data from the MahaRERA website based on the provided filters and pagination parameters.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 description: Page number to fetch.
 *                 example: 1
 *               agent_name:
 *                 type: string
 *                 description: Name of the agent to filter.
 *                 example: John Doe
 *               agent_location:
 *                 type: string
 *                 description: Location of the agent to filter.
 *                 example: Mumbai
 *               agent_state:
 *                 type: integer
 *                 description: State code to filter agents.
 *                 example: 27
 *               agent_division:
 *                 type: integer
 *                 description: Division code to filter agents.
 *                 example: 1
 *               agent_district:
 *                 type: integer
 *                 description: District code to filter agents.
 *                 example: 2
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
 *                         description: URL for agent details.
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
 *                       description: Total number of pages.
 *       500:
 *         description: Failed to fetch agents data
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
  try {
    const body = req.body || (req.headers['content-type'] === 'application/x-www-form-urlencoded'
        ? qs.parse(req.body)
        : {});
        const {
            page = 1,
            agent_name = '',
            agent_location = '',
            agent_state = '',
            agent_division = '',
            agent_district = ''
          } = body;
      
    const searchUrl = 'https://maharera.maharashtra.gov.in/agents-search-result';
    const getRes = await axios.get(`${searchUrl}?page=${page}`);
    const $get = cheerio.load(getRes.data);
    const formBuildId = $get('input[name="form_build_id"]').val();
    const formId = $get('input[name="form_id"]').val();

    const formData = qs.stringify({
      agent_name,
      agent_location,
      agent_state,
      agent_division,
      agent_district,
      page,
      form_build_id: formBuildId,
      form_id: formId,
      op: 'Search'
    });

    const { data: html } = await axios.post(searchUrl, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const $ = cheerio.load(html);

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

    const pagesCountElem = $('.pagination .pagesCount');
    const total = parseInt(pagesCountElem.attr('data-total'), 10);
    const perPage = agents.length;
    const total_pages = Math.ceil(total / perPage);
    const current_page = parseInt(page, 10);

    res.json({ agents, pagination: { current_page, total_pages } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch agents data' });
  }
};
