const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3010;

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function to fetch agents data
async function fetchAgentsData(params) {
  const searchUrl = 'https://maharera.maharashtra.gov.in/agents-search-result';
  
  try {
    // Build query parameters for GET request
    const queryParams = {
      agent_name: params.agent_name || '',
      agent_project_name: params.agent_project_name || '',
      agent_location: params.agent_location || '',
      agent_state: params.agent_state || '27', // Default to Maharashtra
      agent_division: params.agent_division || '',
      agent_district: params.agent_district || '',
      page: params.page || 1,
      form_build_id: 'form-67HJgC7FUdmF1oz4F_KgmFWNU_Iw9GXE0OeBJHtBXjQ',
      form_id: 'agent_search_page_form',
      op: 'Search'
    };

    // Perform GET to fetch search results
    const { data: html } = await axios.get(`${searchUrl}?${qs.stringify(queryParams)}`);
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
    const total_pages = Math.ceil(total / (agents.length || 1)) || 1;
    const current_page = parseInt(params.page, 10) || 1;

    return { agents, pagination: { current_page, total_pages } };
  } catch (error) {
    console.error('Error fetching agents:', error.message);
    throw new Error('Failed to fetch agents data');
  }
}

// Helper function to fetch division data
async function fetchDivisionData() {
  try {
    const url = 'https://maharera.maharashtra.gov.in/get-division-data?stateCode=27&langID=1&form_code=custom_search_form&field_code=agent_division';
    const { data: html } = await axios.get(url);
    
    // Parse the response
    const divisions = [];
    const $ = cheerio.load(html);
    $('option').each((_, element) => {
      const value = $(element).val();
      const text = $(element).text();
      if (value !== '' && text !== 'Select Division') {
        divisions.push({ value, text });
      }
    });
    
    return divisions;
  } catch (error) {
    console.error('Error fetching divisions:', error.message);
    return [];
  }
}

async function fetchDistrictData(divisionId) {
  if (!divisionId) return [];
  
  try {
    const url = `https://maharera.maharashtra.gov.in/div-district-data?state_code=27&lang_id=1&division_code=${divisionId}&district_form=custom_search_form&distruct_field=agent_district`;
    const { data: html } = await axios.get(url);
    
    // Parse the response
    const districts = [];
    const $ = cheerio.load(html);
    $('option').each((_, element) => {
      const value = $(element).val();
      const text = $(element).text();
      if (value !== '' && text !== 'District') {
        districts.push({ value, text });
      }
    });
    
    return districts;
  } catch (error) {
    console.error('Error fetching districts:', error.message);
    return [];
  }
}

// Home route - display search form and results
app.get('/', async (req, res) => {
  try {
    let agentsData = { agents: [], pagination: { current_page: 1, total_pages: 1 } };
    const divisions = await fetchDivisionData();
    
    // Get search params from query
    const hasSearchParams = Object.keys(req.query).length > 0;
    
    // If search parameters are present, fetch data
    if (hasSearchParams) {
      agentsData = await fetchAgentsData(req.query);
    }
    
    // Fetch districts if division is selected
    let districts = [];
    if (req.query.agent_division) {
      districts = await fetchDistrictData(req.query.agent_division);
    }
    
    res.render('index', {
      agents: agentsData.agents,
      pagination: agentsData.pagination,
      searchParams: req.query,
      divisions,
      districts,
      hasSearchParams
    });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// API endpoint to get districts based on division
app.get('/api/districts', async (req, res) => {
  try {
    const { division_id } = req.query;
    const districts = await fetchDistrictData(division_id);
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).render('error', { error: 'Page not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Something went wrong!' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app; // Export for Vercel