# BDELog architecture

## Product boundary

BDELog is a two-surface reporting product. The public surface is a no-login daily report form for BDEs. The protected surface is an administration workspace for the regional sales manager and authorised administrators. Reports are stored in MongoDB, queried through Express, and downloaded as CSV or XLSX only by an authenticated administrator.

## Deployment layout

| Layer | Technology | Deployment target | Responsibility |
|---|---|---|---|
| Frontend | React 19, JavaScript, Vite | Vercel | Public report form and admin workspace |
| Backend | Node.js, Express, JavaScript | Render | Validation, admin sessions, exports, and API |
| Database | MongoDB with Mongoose | MongoDB Atlas | Reports, questions, branches, team members, and admin users |

The frontend calls the backend using `VITE_API_BASE_URL`. The backend permits only the configured frontend origin and protects administrative write and export routes with an HTTP-only JWT session cookie plus a CSRF token.

## Domain model

| Collection | Purpose | Important fields |
|---|---|---|
| `admins` | Authenticated BDELog administrators | `email`, `passwordHash`, `displayName`, `isActive` |
| `questions` | Form builder definitions | `key`, `label`, `inputType`, `options`, `validation`, `showWhen`, `required`, `isActive`, `order` |
| `branches` | Canonical branch choices | `name`, `code`, `isActive` |
| `teamMembers` | Canonical BDE or ESo choices | `fullName`, `branchId`, `isActive` |
| `reports` | Submitted daily reports | `reportDate`, `branchId`, `teamMemberId`, `answers`, `questionSnapshot`, `submittedAt` |

Every report stores the submitted answer values and a small question snapshot. This preserves export readability when administrators later edit, retire, or rename questions.

## Field normalization contract

| Business input | Worker experience | Stored value | Export value |
|---|---|---|---|
| Branch | Managed select list | `branchId` | Canonical branch name |
| BDE/ESo name | Managed, branch-filtered select list | `teamMemberId` | Canonical staff name |
| Report date | Date picker | ISO date at local-day boundary | `YYYY-MM-DD` |
| Counts | Number input, digits only, no negative values | Integer | Plain integer |
| Money | Currency field with a live Naira preview; accepts `#1,000,000`, `₦1m`, `1 million`, or `1000000` | Canonical numeric Naira amount | `₦1,000,000.00` |
| Account number | Numeric-string input; leading zeros preserved | String | String |
| Yes/no | Fixed binary radio control | Boolean | `Yes` / `No` |
| Pace rating | Fixed option set | Enum | Selected label |
| Notes/help detail | Text area with length limit | Sanitized string | Text |

The server is authoritative. Frontend helpers improve the experience, but the Express validation layer re-parses, validates, and canonicalises every submitted answer before a report is stored.

## Question-builder rules

Administrators can create, edit, reorder, deactivate, or delete questions. The builder supports `text`, `textarea`, `integer`, `currency`, `date`, `select`, `boolean`, `paceRating`, and `accountNumber`. A question key is generated once and cannot be changed after the question has captured reports. Select fields can use either administrator-maintained static options or canonical sources such as branches and team members. Conditional questions may show when a prior boolean or select response equals a configured value.

Deletion is a soft retire action when the question has already appeared in a report. This protects historic exports. A true delete is permitted only for unused questions.

## Initial report template

The first version preloads the structured fields inferred from the supplied Google Forms: report date, branch, BDE/ESo name, daily accounts opened, alternate channels issued, cumulative opening balance, amount mobilised today, funded count, carded count, planned closures, cluster availability, support needed, help details, and pace rating. Administrators may refine this immediately in the question builder.

## Security posture

Public report submissions are rate limited and accept only active form fields. Admin routes require an active administrator session. Passwords are bcrypt-hashed; secrets are supplied through deployment environment variables only. The application does not place database credentials, JWT secrets, or administrator passwords in frontend code or in Git.
