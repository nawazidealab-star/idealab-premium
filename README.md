# IDEA LAB Premium Website + Secure Internal Agency Portal

React + TypeScript + Vite + Framer Motion frontend with a Cloudflare Worker + D1 backend foundation.

The public website is for customers. The `/admin` area is **IDEA LAB staff only** and is intentionally not advertised or linked from the public site.

## Included
- Responsive premium public portfolio website
- IDEA LAB branding/logo
- Animated services, portfolio, social, CRM and web-development positioning
- Placeholder testimonials clearly labelled for replacement with verified reviews
- Internal operations portal: dashboard, leads, clients, projects, tasks, invoices, content planner, reports, team roles and settings
- Cloudflare Worker API with Cloudflare Access JWT verification
- Server-side RBAC for Super Admin, Admin, Sales, Project Manager, Finance and Content roles
- D1 schema with audit history and API rate-limit buckets
- Strict input validation and parameterised SQL
- Origin/CSRF protections for write actions
- Security headers and Content Security Policy for the static site
- No public registration and no client accounts
- No passwords stored by IDEA LAB; authentication is delegated to Cloudflare Access

## Security design
No web application can honestly be guaranteed "unhackable". This build instead uses defence in depth:

1. **Cloudflare Access in front of `/admin*` and `/api/*`**.
2. **Worker verifies the signed Access JWT itself** (issuer, audience, expiry and RSA signature).
3. **IDEA LAB staff profile check in D1** after Cloudflare authentication.
4. **Role-based permissions** checked again for every API action.
5. **No shared admin token or password login endpoint**.
6. **No wildcard CORS**; only the deployed site/origins you explicitly allow.
7. **State-changing requests require trusted Origin + `X-Requested-With: idealab-admin` + JSON**.
8. **64 KB request-body limit**, field length validation, email validation, enum validation and safe money validation.
9. **Parameterized D1 queries** for user-provided values.
10. **Per-user/IP API rate limiting** stored in D1.
11. **Audit logs** record staff user, IP, user agent and sensitive create/update actions.
12. **Security headers**: CSP, HSTS, clickjacking protection, MIME sniffing protection, restrictive Permissions Policy and more.
13. **No permanent delete endpoints in the starter**. Add soft-delete workflows later with confirmation and audit history.

## Recommended profiles
The application is designed for multiple internal staff profiles. A sensible starting setup is:

- 1 × **Super Admin** — owner only
- 1 × **Admin** — optional operations manager
- 1–2 × **Sales** — leads and follow-up
- 1 × **Project Manager** — projects/tasks
- 1 × **Finance** — only if needed
- 1–2 × **Content** — social/content work

For a small agency, **3–5 profiles is ideal now**. The data model itself does not impose a small hard limit. Your actual login-user allowance depends on your Cloudflare Zero Trust plan.

## Cloudflare setup

### 1. Install/build
```bash
npm install
npm run build
```

### 2. Create D1
```bash
npx wrangler d1 create idealab-crm
```
Paste the returned database id into `wrangler.toml`, then run:
```bash
npx wrangler d1 execute idealab-crm --remote --file=worker/schema.sql
```

### 3. Deploy the public site
Deploy the `dist` directory to Cloudflare Pages.

`public/_headers` and `public/_redirects` are copied into the Vite output automatically.

### 4. Create Cloudflare Zero Trust / Access
Create a Zero Trust organization on the Free plan. Protect both:
- `YOUR_SITE/admin*`
- `YOUR_SITE/api/*`

Use a policy that **only allows your approved staff identities**. Require MFA on the identity provider/account. Do not add a broad `Everyone` allow rule.

For a `*.pages.dev` deployment, Cloudflare documents a Pages Access policy flow. If you use a custom domain later, create a self-hosted Access application for the required paths.

### 5. Configure Worker authentication
In the Access application, copy the **Application Audience (AUD) tag**.

Update `wrangler.toml`:
```toml
CF_ACCESS_TEAM_DOMAIN = "YOURTEAM.cloudflareaccess.com"
CF_ACCESS_AUD = "YOUR_ACCESS_AUD_TAG"
SUPER_ADMIN_EMAIL = "your@email.com"
ALLOWED_ORIGINS = "https://YOUR_PROJECT.pages.dev"
```

The first authenticated request made by `SUPER_ADMIN_EMAIL` bootstraps that email into D1 as the only Super Admin.

### 6. Deploy API
```bash
npx wrangler deploy
```

If you expose the Worker on a separate hostname, add that exact frontend URL to `ALLOWED_ORIGINS` and ensure the API hostname is also protected by Cloudflare Access.

## Adding staff profiles
There are two gates, intentionally:

1. **Cloudflare Access identity** — the email/person must be allowed by your Access policy.
2. **IDEA LAB app profile** — create a D1 user record with one of the allowed roles.

The API includes:
- `GET /api/me`
- `GET /api/users` — Super Admin/Admin read
- `POST /api/users` — Super Admin only
- `PATCH /api/users/:id` — Super Admin only

Creating an app profile does **not** automatically give someone Cloudflare Access. Both gates must agree, which prevents an accidentally created CRM profile from becoming a valid login.

## Current role permissions
- **Super Admin**: everything, including team-role changes
- **Admin**: operational modules + team list, but cannot create/change staff roles
- **Sales**: leads and client follow-up
- **Project Manager**: clients, projects, tasks, content delivery
- **Finance**: invoices and financial reporting
- **Content**: content planner and client reference data

## Frontend API write requests
When the portal is wired to live API data, all POST/PATCH requests must include:
```http
Content-Type: application/json
X-Requested-With: idealab-admin
```
Do not store authentication tokens in `localStorage`. Cloudflare Access handles the browser session.

## Storage
No paid file storage is required for this version. D1 stores structured agency data only. Keep client documents/media outside the CRM until Bunny storage/CDN is added later.

When Bunny is introduced, store only Bunny object identifiers/URLs in D1 and keep storage credentials in Worker secrets — never in frontend code.

## Before real client data
- Replace all demo portal data with API-backed D1 records.
- Replace sample testimonials with verified feedback.
- Turn on Cloudflare Access before entering any real client/financial data.
- Enable MFA for every staff login.
- Use one account per person; never share a login.
- Keep Super Admin to one or two trusted owners.
- Back up/export critical D1 data periodically.
