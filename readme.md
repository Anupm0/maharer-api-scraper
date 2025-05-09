# MahaRERA Agents Directory

A responsive web application to search and display MahaRERA registered agents data. This application fetches data from the official MahaRERA website and presents it in a user-friendly, mobile-responsive interface.

## Features

- **Search Functionality**: Search agents by name, project, location, division, and district
- **Responsive Design**: Works on desktop and mobile devices
- **Dynamic Filtering**: Division and district filters with dynamic loading
- **Pagination**: Navigate through multiple pages of results
- **Clean UI**: Modern and user-friendly interface

## Tech Stack

- **Node.js** with **Express** for the server
- **EJS** for templating
- **Bootstrap 5** for responsive design
- **Axios** for HTTP requests
- **Cheerio** for HTML parsing
- **Vercel** for deployment

## Installation and Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd maharera-agents-directory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3010`

## Deployment to Vercel

This application is configured for deployment on Vercel. Follow these steps:

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy using Vercel CLI**
   ```bash
   vercel
   ```

   Or connect your GitHub repository to Vercel for automatic deployments.

## Project Structure

```
maharera-agents-directory/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── vercel.json           # Vercel deployment configuration
├── public/               # Static assets (if any)
└── views/                # EJS templates
    ├── index.ejs         # Main page template with search form and results
    └── error.ejs         # Error page template
```

## API Endpoints

- **GET /** - Main page with search form and results
- **GET /api/districts** - Get districts based on division ID

## License

ISC