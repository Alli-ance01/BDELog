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

Then sign in, add your branches and BDE/ESo team list, and share the public reporting URL. Do not share the public form before its branch and team lists have been configured.

## Deploying

Deploy the `backend/` directory to Render with the supplied [`backend/render.yaml`](backend/render.yaml) configuration, then deploy the repository root to Vercel. Add the Render `/api` URL as `VITE_API_BASE_URL` in Vercel and set `CLIENT_ORIGIN` in Render to the final Vercel custom domain.

For reliable administrator session cookies, map both the frontend and API under `alliancedev.online`—for example `bdelog.alliancedev.online` and `api.bdelog.alliancedev.online`—before setting `COOKIE_DOMAIN=.alliancedev.online`.
