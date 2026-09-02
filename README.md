# BDELog

BDELog is a JavaScript-only MERN reporting application for daily BDE/ESo reports. It replaces manually recreated Google Forms with a public, mobile-ready report form and gives authorised managers a secure administration workspace for form configuration, reports, filtering, and CSV/XLSX export.

## Repository layout

| Path | Responsibility |
|---|---|
| `client/` | React 19 and Vite frontend for Vercel |
| `backend/` | Express, MongoDB, and Mongoose API for Render |
| `docs/` | Architecture and production configuration reference |

## Local setup

Install and start the frontend from the repository root:

```bash
pnpm install
pnpm dev
```

Install and start the backend separately:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend reads its production environment variables from the Render dashboard. See [`docs/environment.md`](docs/environment.md) for the complete variable list; do not commit an `.env` file.

## First production data

After provisioning MongoDB Atlas and configuring Render variables, run these commands in a one-time Render shell or from a secure local machine with the same variables:

```bash
cd backend
npm run seed:admin
npm run seed:template
```

If the database already contains the original flat question template, run the category migration once before sharing the form:

```bash
cd backend
npm run migrate:categories
```

The Form Studio now stores categories with names, descriptions, display order, and active state. Questions carry a category assignment, position within that category, complete field configuration, and an active/retired state. The public report form reads the same configuration and renders the worker flow in category order, then question order.

Every BDE/ESo has the standard monthly minimum of **45 accounts opened** and **₦8,000,000 mobilised**. A successful daily report response includes the selected worker’s month-to-date totals for the report month, the remaining account and mobilisation balances, and any surplus after a target is exceeded. The worker form keeps this monthly pace card visible after submission and starts a fresh daily form for the next entry. A prominent success notice appears above the form with the latest remaining balances, moves focus to that notice, and provides a View progress action so workers do not need to scroll upward to find the result. The aggregation is based on submitted reports for the selected worker and uses the report date’s `YYYY-MM` month boundary.

Then sign in, add your branches and BDE/ESo team list, and share the public reporting URL. In Form Studio’s **Canonical Identity Directory**, use the pencil action beside any branch or BDE/ESO record to update its name, branch assignment, DAO code, role, or active state. These edits apply to future worker selections and report snapshots; historical reports retain the identity values recorded at submission time. Do not share the public form before its branch and team lists have been configured.

## Deploying

Deploy the `backend/` directory to Render with the supplied [`backend/render.yaml`](backend/render.yaml) configuration, then deploy the repository root to Vercel. Add the Render `/api` URL as `VITE_API_BASE_URL` in Vercel and set `CLIENT_ORIGIN` in Render to the final Vercel custom domain.

For reliable administrator session cookies, map both the frontend and API under `alliancedev.online`—for example `bdelog.alliancedev.online` and `api.bdelog.alliancedev.online`—before setting `COOKIE_DOMAIN=.alliancedev.online`.

## SEO and Google indexing

The public BDELog page includes a search-focused title and description, Open Graph and Twitter metadata, WebApplication structured data, a canonical URL, `robots.txt`, and `sitemap.xml`. The current crawler files use `https://bdelog.manus.space/` as the expected public address; replace that host in `client/index.html`, `client/public/robots.txt`, and `client/public/sitemap.xml` if the deployed app uses another domain. After deployment, verify the public URL in Google Search Console, submit the sitemap, and request indexing for the home page. Search ranking for a broad query such as “BDE” depends on Google’s crawl, the final domain, page content, links, and competition; metadata makes the page eligible and understandable but does not guarantee a particular position.
