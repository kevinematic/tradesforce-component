# Trades Force - External Job Listings

A complete React application that aggregates construction and trades job listings from the Adzuna API and displays them with an elegant, user-friendly interface.

## 🎯 Features

- **Adzuna API Integration** - Fetches real-time job listings from Adzuna
- **Beautiful Job Cards** - Polished UI matching the design spec with maps, badges, and detailed information
- **Advanced Filtering** - Search by trade, location, contract type, and employment type
- **Trade Type Inference** - Automatically categorizes jobs based on keywords
- **Background Sync** - Scheduled job syncing with rate limit handling
- **Responsive Design** - Works perfectly on desktop and mobile
- **Pagination** - Efficient browsing of large job datasets
- **External Link Safety** - All external links open with `noopener,noreferrer`

## 📁 Project Structure

```
tradesforce-external-jobs/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── database/          # SQLite database setup
│   │   ├── jobs/              # Background sync jobs
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Adzuna API client
│   │   └── utils/             # Trade inference utilities
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components (JobCard, JobFeed)
│   │   ├── services/          # API service layer
│   │   └── utils/             # Formatting utilities
│   └── package.json
├── .env.example               # Environment variables template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Adzuna API credentials ([Get them here](https://developer.adzuna.com/signup))

### 1. Clone and Install

```bash
cd "Tradesforce Component"

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Adzuna API credentials:

```env
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
PORT=3001
NODE_ENV=development
DATABASE_URL=./data/jobs.sqlite
SYNC_INTERVAL_HOURS=2
```

### 3. Run the Application

**Option A: Run Both Servers Concurrently (Recommended)**

```bash
# From the root directory
npm run dev
```

This starts:

- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

**Option B: Run Separately**

Terminal 1 (Backend):

```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):

```bash
cd frontend
npm run dev
```

### 4. Initial Job Sync

The backend will automatically sync jobs on startup. You can also manually trigger a sync:

```bash
cd backend
npm run sync
```

## 📚 API Documentation

### Endpoints

#### `GET /api/external-jobs`

Get paginated list of external job listings with filters.

**Query Parameters:**

- `trade` - Filter by trade keyword (e.g., "plumber", "electrician")
- `location` - Filter by location (e.g., "New York")
- `contract_type` - Filter by contract type: "permanent" | "contract"
- `contract_time` - Filter by time: "full_time" | "part_time"
- `sort` - Sort order: "date" | "salary" | "relevance"
- `page` - Page number (default: 1)
- `per_page` - Results per page (default: 20)

**Example:**

```bash
curl "http://localhost:3001/api/external-jobs?trade=plumber&location=new york&page=1"
```

**Response:**

```json
{
  "jobs": [
    {
      "id": "4293857206",
      "title": "Commercial Locksmith — Office Rekey",
      "company_name": "Atlas Property Group",
      "location_display": "Midtown Manhattan, New York",
      "salary_min": 52000,
      "salary_max": 68000,
      "redirect_url": "https://...",
      "posted_at": "2026-02-18T14:23:00Z",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

#### `GET /api/external-jobs/:id`

Get a single job listing by ID.

#### `GET /api/external-jobs/stats/summary`

Get job statistics including total jobs, trade breakdown, and salary averages.

## 🔄 Background Job Sync

The application includes a background job that periodically fetches new listings from Adzuna.

### Configuration

Adjust sync settings in `.env`:

```env
SYNC_INTERVAL_HOURS=2        # How often to sync (in hours)
RESULTS_PER_PAGE=20           # Results per API call
MAX_DAYS_OLD=30               # Only fetch jobs posted within N days
```

### Trade Queries

The sync job searches for these trades:

- Plumber, Electrician, Carpenter, Locksmith
- HVAC, Welder, Roofer, Painter, Mason
- Construction, General Contractor
- Drywall, Flooring Installer
- Heavy Equipment Operator

### Manual Sync

```bash
cd backend
npm run sync
```

### Stale Job Cleanup

Jobs not seen in API results for 48+ hours are automatically marked as inactive.

## 🎨 Component Reference

### JobCard Component

Displays a single job listing with:

- **Map with pin** - Shows job location (if coordinates available)
- **External badge** - Indicates this is an external listing
- **Source attribution** - "via Adzuna"
- **Company info** - Name, category, salary, contract details
- **Description snippet** - Clamped to 3 lines
- **Posted date** - Relative or absolute format
- **View Listing button** - Opens in new tab

**Props:**

```jsx
<JobCard job={jobObject} />
```

### JobFeed Component

Main feed component with:

- **Filter bar** - Trade, location, contract filters
- **Sort options** - By date, salary, or relevance
- **Job grid** - Responsive grid of JobCard components
- **Pagination** - Navigate through pages
- **Loading/error states** - User-friendly feedback

## 🛠️ Development

### Database

The app uses SQLite for development. The database is automatically created at `backend/data/jobs.sqlite`.

**Initialize database manually:**

```bash
cd backend
npm run db:init
```

### Build for Production

**Frontend:**

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`

**Backend:**

```bash
cd backend
npm start
```

### Environment Variables

- `ADZUNA_APP_ID` - Your Adzuna application ID (required)
- `ADZUNA_APP_KEY` - Your Adzuna API key (required)
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - Environment: development | production
- `DATABASE_URL` - Database file path
- `SYNC_INTERVAL_HOURS` - Sync job frequency
- `SYNC_ON_STARTUP` - Run sync on server start (default: true)

## 📋 Implementation Checklist

Based on `TRADES_FORCE_EXTERNAL_JOBS_SPEC.md`:

- [x] Register for Adzuna API keys
- [x] Create the `ExternalJobListing` database table/model
- [x] Build the Adzuna API client (fetch, parse, store)
- [x] Build the background sync job with trade queries list
- [x] Set up cron schedule for the sync job
- [x] Create `GET /api/external-jobs` endpoint with filters and pagination
- [x] Build the job card frontend component matching design spec
- [x] Handle all nullable fields gracefully
- [x] Ensure all external links open in new tabs with `rel="noopener noreferrer"`
- [x] Add "via Adzuna" source attribution
- [x] Implement trade type inference from title keywords
- [x] Add rate limit handling and caching behavior

## 🔒 Security & Privacy

- All external links use `rel="noopener noreferrer"`
- Environment variables for sensitive credentials
- API rate limiting with delays between requests
- Input validation on all API endpoints

## 🐛 Troubleshooting

### Backend won't start

- Check that your `.env` file exists and has valid Adzuna credentials
- Ensure port 3001 is not already in use
- Check `backend/data/` directory permissions

### No jobs showing

- Verify your Adzuna API credentials are correct
- Run manual sync: `cd backend && npm run sync`
- Check backend console for API errors

### Frontend can't connect to backend

- Ensure backend is running on port 3001
- Check Vite proxy configuration in `frontend/vite.config.js`

## 📄 License

This project was built for Trades Force (trades-force.com).

## 🙏 Acknowledgments

- Job data provided by [Adzuna API](https://developer.adzuna.com/)
- Maps powered by Mapbox
- Design fonts: DM Sans and Space Mono
