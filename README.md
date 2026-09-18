# Iron Dillo Cybersecurity Site

Marketing site for [Iron Dillo Cybersecurity](https://irondillo.com). The project contains hand-crafted HTML pages and a generated Tailwind output (`assets/tailwind.css`).

## Repository layout

```
.
├── assets/                 # Published images, icons, and generated CSS
├── docs/                   # Project notes and historical reports
├── src/styles/             # Source files used to build published CSS
├── index.html              # Home page
├── services.html           # Overview of offerings
├── about.html              # Background and mission statement
├── contact.html            # Direct phone and email contact options
├── commitment.html         # Cybersecurity commitment and ethics
├── lindale-tyler-cybersecurity.html  # Local services landing page
├── privacy.html / terms.html          # Policy documents
├── maintenance.html        # Temporary maintenance notice page
├── 404.html                # Custom error page for missing routes
├── sitemap.xml / robots.txt
├── wrangler.toml            # Cloudflare Pages output-directory configuration
└── .github/workflows/static.yml       # Build validation and production smoke tests
```

The HTML entry points intentionally remain at the repository root because the
static host maps those filenames directly to the site's public URLs. Moving them into a
source directory without introducing a site build step would break existing links.
Development-only material belongs in `docs/` and `src/`, while files referenced by
the deployed pages retain their existing public paths.

## Local development

Use any HTTP server to preview the content locally. Because the production contact page is HTTPS-only, use a local HTTPS server when browser-testing its secure-context behavior. Create a self-signed certificate and start `http-server` with TLS enabled:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout localhost-key.pem -out localhost.pem -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
npx --yes http-server . -S -C localhost.pem -K localhost-key.pem -p 8000
```

Then browse to <https://localhost:8000/contact.html>. A browser warning is expected because the certificate is self-signed; accept it only for this local development certificate. Remove `localhost.pem` and `localhost-key.pem` when finished. Edits to the HTML files appear when you refresh the page.


## Build and deploy guard (Tailwind)

The Tailwind source lives at `src/styles/tailwind.css`, and its generated output is
committed at `assets/tailwind.css`. Any HTML class changes should be followed by a
rebuild so published styles stay in sync.

Run this local check before pushing:

```bash
npm ci
npm run build
git diff --exit-code -- assets/tailwind.css
```

If the diff command reports changes, commit the regenerated `assets/tailwind.css` before opening or merging a PR.

The GitHub Actions validation workflow also enforces this and fails when the generated CSS is not committed.

## Deployment

The production site is a Cloudflare Pages project deployed from `main`. Configure
Cloudflare's **Build command** as `npm run build` and **Build output directory** as
`dist`. The matching `pages_build_output_dir` in `wrangler.toml` keeps the expected
output explicit and reviewable. The build recreates `dist` and copies `_worker.js`
and `_headers` to its root alongside the public site, so Pages detects the
advanced-mode Worker rather than uploading static assets alone.

GitHub Actions runs the build and tests as a deployment guard. After a production
deployment, confirm its source commit is the current `main` SHA and that the
deployment details show a Pages Functions/Worker bundle. Then run
`scripts/smoke-production.sh` to check the production page, redirects, and stable
security-header guarantees. `_headers` remains the declarative policy and fallback.

## Content guidelines

* Keep images in `assets/`. Remove unused media so the repository stays lightweight.
* Inline Tailwind classes control styling; no additional CSS build pipeline is necessary.
* The contact page offers direct phone and email links. Keep both actionable with `tel:` and `mailto:` URLs, and do not add a submission form without revisiting the privacy and security documentation.
* For any metadata updates (Open Graph, SEO), update the relevant `<meta>` tags across the HTML pages.

### Testimonial updates

When adding or revising testimonials, follow this checklist so updates stay consistent and reviewable:

* Required fields: quote, client name, title/organization, and approval date.
* Optional anonymization: if requested, replace identifying details with an approved alias (for example, first name + industry) while preserving the approved quote text.
* Keep quotes exact as approved; only make wording edits when the client explicitly approves changes.
* Avoid disclosing confidential project specifics, internal security details, or private business information in testimonial copy.
* Edit location: `index.html` (testimonials section). Styling source: `styles.css` (testimonial-related classes).

## Security headers policy

A single canonical policy is defined in [`_headers`](_headers) and enforced on
all asset responses by [`_worker.js`](_worker.js):

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
- Browser connections remain same-origin, framing and form submissions are disabled, and production must redirect HTTP to HTTPS.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000`

Do not add wildcard or legacy provider origins. `_headers` is the canonical
production policy because Cloudflare sends it as an HTTP response header. In
particular, `frame-ancestors` and `X-Frame-Options` must be delivered in the HTTP
response rather than through page-level metadata.
