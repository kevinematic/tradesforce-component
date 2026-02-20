# Trades Force — External Job Listings Implementation Spec

## Project Overview

**Site:** trades-force.com  
**Goal:** Aggregate construction and trades job listings from the Adzuna API and display them to registered tradesmen. Each listing shows a brief overview on our site and links out to the original job post via a redirect URL.

This feature adds **external job listings** alongside any native job posts already on the platform. External listings are clearly badged so users know they will be redirected to another site to view the full post and apply.

---

## Adzuna API Integration

### Authentication

- Register for a free API key at https://developer.adzuna.com/signup
- You will receive an `app_id` and `app_key`
- All requests are authenticated via query parameters (no headers needed)

### Base URL

```
https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
```

- Use `us` as the country code for US listings
- `{page}` is 1-indexed pagination

### Example Request

```
GET https://api.adzuna.com/v1/api/jobs/us/search/1
  ?app_id={APP_ID}
  &app_key={APP_KEY}
  &results_per_page=20
  &what=construction
  &where=new+york
  &content-type=application/json
```

### Key Query Parameters

| Parameter          | Description                               | Example                   |
| ------------------ | ----------------------------------------- | ------------------------- |
| `what`             | Keyword search (job title, description)   | `plumber`, `electrician`  |
| `what_and`         | All keywords must appear                  | `commercial locksmith`    |
| `what_exclude`     | Exclude keyword                           | `manager`                 |
| `where`            | Location search                           | `new york`, `houston tx`  |
| `category`         | Adzuna category tag                       | `trade-construction-jobs` |
| `results_per_page` | Number of results (max 50)                | `20`                      |
| `sort_by`          | Sort order: `relevance`, `date`, `salary` | `date`                    |
| `salary_min`       | Minimum annual salary filter              | `40000`                   |
| `salary_max`       | Maximum annual salary filter              | `80000`                   |
| `full_time`        | 1 = full-time only                        | `1`                       |
| `part_time`        | 1 = part-time only                        | `1`                       |
| `permanent`        | 1 = permanent only                        | `1`                       |
| `contract`         | 1 = contract only                         | `1`                       |
| `distance`         | Radius in km from `where` location        | `30`                      |
| `max_days_old`     | Only return jobs posted within N days     | `7`                       |

### Relevant Trade/Construction Category

When querying for trades jobs specifically, use:

```
&category=trade-construction-jobs
```

You can verify the full list of categories by hitting:

```
GET https://api.adzuna.com/v1/api/jobs/us/categories?app_id={APP_ID}&app_key={APP_KEY}
```

### Response Shape

```json
{
  "count": 5432,
  "mean": 52000,
  "results": [
    {
      "id": "4293857206",
      "title": "Commercial Locksmith — Office Rekey",
      "description": "We need 200+ doors rekeyed for a major remodel in our office. Looking for an experienced locksmith with commercial experience to handle high-security lock systems...",
      "created": "2026-02-18T14:23:00Z",
      "redirect_url": "https://adzuna.com/land/ad/4293857206?v=...",
      "company": {
        "display_name": "Atlas Property Group"
      },
      "location": {
        "display_name": "Midtown Manhattan, New York",
        "area": ["US", "New York", "New York County", "Midtown Manhattan"]
      },
      "latitude": 40.7484,
      "longitude": -73.9857,
      "category": {
        "label": "Trade & Construction Jobs",
        "tag": "trade-construction-jobs"
      },
      "salary_min": 52000,
      "salary_max": 68000,
      "salary_is_predicted": 1,
      "contract_time": "full_time",
      "contract_type": "contract"
    }
  ]
}
```

### Important Notes About the API Response

1. **`description`** is a snippet only, not the full job description. This is by design — users click through via `redirect_url` for full details.
2. **`salary_min` / `salary_max`** are annual figures in local currency. They are often `null`. When `salary_is_predicted` equals `1`, the salary was estimated by Adzuna's algorithm (not from the actual listing).
3. **`redirect_url`** is the link that takes users to the original job post. This is what powers our "External" badge and "View Listing" button. Always open in a new tab.
4. **`contract_time`** can be `"full_time"` or `"part_time"` or may be absent.
5. **`contract_type`** can be `"permanent"` or `"contract"` or may be absent.
6. **`company.display_name`** may be absent if the employer is anonymous.
7. **`latitude` / `longitude`** are not always present. Fallback to using `location.display_name` without a map pin if missing.

### Rate Limits

Adzuna's free tier has rate limits. Cache API responses on the backend. Suggested approach:

- Fetch new results on a schedule (every 1–6 hours) via a background job / cron
- Store results in your database
- Serve cached results to the frontend
- Do NOT call the Adzuna API on every page load

---

## Data Model

### ExternalJobListing Table / Schema

Store fetched Adzuna results in your own database to avoid rate limits and enable filtering.

| Field              | Type        | Source                            | Notes                                               |
| ------------------ | ----------- | --------------------------------- | --------------------------------------------------- |
| `id`               | string (PK) | `results[].id`                    | Adzuna's unique job ID                              |
| `source`           | string      | hardcoded `"adzuna"`              | For future multi-source support                     |
| `title`            | string      | `results[].title`                 | Job title                                           |
| `description`      | text        | `results[].description`           | Snippet only                                        |
| `company_name`     | string      | `results[].company.display_name`  | Nullable — employer may be anonymous                |
| `location_display` | string      | `results[].location.display_name` | Human-readable location                             |
| `location_area`    | string[]    | `results[].location.area`         | Hierarchical area array                             |
| `latitude`         | float       | `results[].latitude`              | Nullable                                            |
| `longitude`        | float       | `results[].longitude`             | Nullable                                            |
| `category_label`   | string      | `results[].category.label`        | e.g. "Trade & Construction Jobs"                    |
| `category_tag`     | string      | `results[].category.tag`          | e.g. "trade-construction-jobs"                      |
| `salary_min`       | integer     | `results[].salary_min`            | Nullable — annual in local currency                 |
| `salary_max`       | integer     | `results[].salary_max`            | Nullable — annual in local currency                 |
| `salary_predicted` | boolean     | `results[].salary_is_predicted`   | True if estimated by Adzuna                         |
| `contract_time`    | string      | `results[].contract_time`         | `"full_time"` or `"part_time"` — nullable           |
| `contract_type`    | string      | `results[].contract_type`         | `"permanent"` or `"contract"` — nullable            |
| `redirect_url`     | string      | `results[].redirect_url`          | Link to the original listing — REQUIRED             |
| `posted_at`        | datetime    | `results[].created`               | When the job was posted                             |
| `fetched_at`       | datetime    | generated                         | When we pulled this from the API                    |
| `is_active`        | boolean     | generated                         | Set to false if the listing disappears from results |

---

## Job Card Component

### Design Reference

See the attached `job-card.html` file for the exact visual design. The component consists of:

### Layout Structure

```
┌────────────────────────────────────┐
│  [Map with pin]                    │
│  [External badge]    [Source pill]  │
├────────────────────────────────────┤
│  Title (job title)                 │
│  Location subtitle                 │
│────────────────────────────────────│
│  COMPANY        │  CATEGORY        │
│  Atlas Prop.    │  Trade & Const.  │
│  SALARY RANGE   │  CONTRACT        │
│  $52k – $68k ~  │  Contract · FT   │
│────────────────────────────────────│
│  [Trade & Construction] [FT] [Perm]│
│────────────────────────────────────│
│  DESCRIPTION                       │
│  Snippet clamped to 3 lines...     │
│────────────────────────────────────│
│  Posted Feb 18, 2026   [View ▸]   │
└────────────────────────────────────┘
```

### Field → Component Mapping

| Component Element         | Data Source                                        | Render Logic                                                                                                           |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Map**                   | `latitude`, `longitude`                            | Render a static map tile if coords exist. Hide map section if both are null.                                           |
| **Map pin**               | `latitude`, `longitude`                            | Place pin at coords. Hide if null.                                                                                     |
| **"External" badge**      | `redirect_url`                                     | Always present on external listings. Links to `redirect_url`. Opens in new tab.                                        |
| **Source pill**           | `source`                                           | Shows "via Adzuna". Top-right corner of the map area.                                                                  |
| **Title**                 | `title`                                            | Displayed as the card heading `<h3>`.                                                                                  |
| **Location subtitle**     | `location_display`                                 | Rendered below the title in muted text.                                                                                |
| **Company**               | `company_name`                                     | Show company name. If null, show "Company not listed" in muted/italic text.                                            |
| **Category**              | `category_label`                                   | Show the Adzuna category. Also render as a colored tag pill.                                                           |
| **Salary Range**          | `salary_min`, `salary_max`                         | Format as `$XXk – $XXk`. If only one is present, show `$XXk+` or `Up to $XXk`. If both null, show "Salary not listed". |
| **Salary estimated icon** | `salary_predicted`                                 | If `true`, show a `~` indicator with a tooltip: "Salary is estimated by Adzuna".                                       |
| **Contract info**         | `contract_type`, `contract_time`                   | Combine as "Contract · Full-time". If either is null, show only the one that exists. If both null, hide this field.    |
| **Tags row**              | `category_label`, `contract_time`, `contract_type` | Render as pill tags. Only render tags for fields that have values.                                                     |
| **Description**           | `description`                                      | Show snippet. CSS-clamp to 3 lines with ellipsis overflow.                                                             |
| **Posted date**           | `posted_at`                                        | Format as "Posted Feb 18, 2026". Use relative time if < 7 days ("Posted 2 days ago").                                  |
| **"View Listing" button** | `redirect_url`                                     | Primary CTA. Opens `redirect_url` in a new tab. Always use `rel="noopener noreferrer"`.                                |

### Handling Missing Data

Many Adzuna fields can be null. The card should gracefully degrade:

- **No lat/lng:** Collapse the map section entirely. The card starts at the body content.
- **No company:** Show "Company not listed" in muted italic.
- **No salary:** Show "Salary not listed" in muted text. Hide the estimated indicator.
- **No contract_time AND no contract_type:** Hide the Contract info field and don't render those tags.
- **No description:** Show "No description available. View the full listing for details." in muted text.

### Styling Specifications

Refer to `job-card.html` for the full CSS. Key design tokens:

```
Font family:     'DM Sans', sans-serif (body)
                 'Space Mono', monospace (labels)
Amber accent:    #f59e0b (primary brand)
Amber dark:      #d97706 (labels)
Slate 800:       #1e293b (headings, button)
Slate 500:       #64748b (body text)
Slate 400:       #94a3b8 (muted text)
Card radius:     14px
Card shadow:     0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)
Card width:      370px (fixed, or responsive in a grid)
Description:     -webkit-line-clamp: 3
```

---

## Background Sync Job

### Fetching Strategy

Create a background job that runs on a schedule to pull construction/trade jobs from Adzuna.

#### Suggested Queries to Run

```javascript
const TRADE_QUERIES = [
  { what: "plumber", category: "trade-construction-jobs" },
  { what: "electrician", category: "trade-construction-jobs" },
  { what: "carpenter", category: "trade-construction-jobs" },
  { what: "locksmith", category: "trade-construction-jobs" },
  { what: "HVAC", category: "trade-construction-jobs" },
  { what: "welder", category: "trade-construction-jobs" },
  { what: "roofer", category: "trade-construction-jobs" },
  { what: "painter", category: "trade-construction-jobs" },
  { what: "mason", category: "trade-construction-jobs" },
  { what: "construction", category: "trade-construction-jobs" },
  { what: "general contractor", category: "trade-construction-jobs" },
  { what: "drywall", category: "trade-construction-jobs" },
  { what: "flooring installer", category: "trade-construction-jobs" },
  { what: "heavy equipment operator", category: "trade-construction-jobs" },
];
```

#### Sync Logic

```
For each query in TRADE_QUERIES:
  1. Call Adzuna API with the query + location params
  2. For each result:
     a. Check if `id` already exists in ExternalJobListing table
     b. If new → insert
     c. If exists → update (salary, description, etc. may change)
  3. Mark stale listings as inactive:
     - If a stored listing was NOT returned in any recent fetch
       AND it was last fetched > 48 hours ago
       → set is_active = false
  4. Respect rate limits — add a delay between API calls
```

#### Cron Schedule

- **Minimum:** Every 6 hours
- **Recommended:** Every 2 hours during business hours, every 6 hours overnight
- **Store `fetched_at`** on every sync so you can track freshness

---

## Frontend Integration

### API Endpoints to Create

Your backend should expose these endpoints to the frontend:

#### `GET /api/external-jobs`

Returns a paginated list of active external job listings.

Query parameters:

- `trade` — filter by keyword in title (e.g., "plumber")
- `location` — filter by location text (e.g., "new york")
- `contract_type` — filter: "permanent" | "contract"
- `contract_time` — filter: "full_time" | "part_time"
- `sort` — "date" | "salary" | "relevance" (default: date)
- `page` — pagination (default: 1)
- `per_page` — results per page (default: 20)

#### `GET /api/external-jobs/:id`

Returns a single external job listing by ID. Used if you build a detail view before redirecting.

### Feed Rendering

On the frontend, external job cards should:

1. Be **visually distinguished** from native/internal job posts (the "External" badge and "via Adzuna" pill handle this)
2. Be **intermixed** with native posts in the main feed, or shown in a separate "External Listings" tab — this is a UX decision for you to make
3. All external links (`redirect_url`) should:
   - Open in a **new tab** (`target="_blank"`)
   - Include `rel="noopener noreferrer"`
   - Optionally track clicks for analytics before redirecting

---

## Trade Type Inference (Optional Enhancement)

Adzuna doesn't provide a clean "trade" field. You can derive it from the job title using keyword matching:

```javascript
const TRADE_KEYWORDS = {
  Plumber: ["plumber", "plumbing", "pipefitter", "pipe fitter"],
  Electrician: ["electrician", "electrical", "wiring"],
  Carpenter: ["carpenter", "carpentry", "woodwork", "cabinetmaker"],
  Locksmith: ["locksmith", "lock smith", "rekey", "rekeying"],
  HVAC: ["hvac", "heating", "ventilation", "air conditioning", "refrigeration"],
  Welder: ["welder", "welding", "fabricator"],
  Roofer: ["roofer", "roofing"],
  Painter: ["painter", "painting"],
  Mason: ["mason", "masonry", "bricklayer", "bricklaying"],
  "General Labor": ["general labor", "laborer", "construction worker"],
  "Heavy Equipment": ["operator", "excavator", "bulldozer", "crane"],
  Drywall: ["drywall", "drywaller", "plastering"],
  Flooring: ["flooring", "tile setter", "tile installer", "hardwood"],
};

function inferTrade(title) {
  const lower = title.toLowerCase();
  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return trade;
  }
  return "General Trade";
}
```

If implemented, store this as a `derived_trade` field on the ExternalJobListing record so you don't recompute it on every render. This enables filtering by trade type in the UI.

---

## File Reference

- **`job-card.html`** — Static HTML/CSS reference implementation of the redesigned job card component. Use this as the source of truth for styling, layout, colors, and spacing.

---

## Implementation Checklist

- [ ] Register for Adzuna API keys at https://developer.adzuna.com/signup
- [ ] Create the `ExternalJobListing` database table/model
- [ ] Build the Adzuna API client (fetch, parse, store)
- [ ] Build the background sync job with the trade queries list
- [ ] Set up cron schedule for the sync job
- [ ] Create `GET /api/external-jobs` endpoint with filters and pagination
- [ ] Build the job card frontend component matching `job-card.html`
- [ ] Handle all nullable fields gracefully (no map, no salary, no company, etc.)
- [ ] Ensure all external links open in new tabs with `rel="noopener noreferrer"`
- [ ] Add "via Adzuna" source attribution (required by their terms)
- [ ] Implement trade type inference from title keywords (optional)
- [ ] Add click tracking on `redirect_url` links (optional, for analytics)
- [ ] Test with real API responses across different trade queries
- [ ] Verify rate limit handling and caching behavior
