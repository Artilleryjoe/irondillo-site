# Iron Dillo Cybersecurity Site

Marketing site for [Iron Dillo Cybersecurity](https://irondillo.com). The project contains hand-crafted HTML pages and a generated Tailwind output (`assets/tailwind.css`).

## Repository layout

```
.
├── assets/                 # Published images, icons, and generated CSS
├── docs/                   # Project notes and historical reports
├── config/security-headers.json      # Canonical browser-enforced meta CSP
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
└── .github/workflows/static.yml       # Validation and GitHub Pages deployment
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


## Build and deploy guard

The Tailwind source lives at `src/styles/tailwind.css`, and its generated output is
committed at `assets/tailwind.css`. Any HTML class changes should be followed by a
rebuild so published styles stay in sync.

Run the same checks used by GitHub Actions before pushing:

```bash
npm ci
npm run build
git diff --exit-code -- assets/tailwind.css
npm test
npm run validate:static
```

If the diff command reports changes, commit the regenerated `assets/tailwind.css`
before opening or merging a pull request. The workflow builds the complete `dist`
artifact, checks the committed CSS, runs the Node test suite, and validates the
static HTML and internal links before deployment.

## Deployment

The production site is deployed from `main` by
[`.github/workflows/static.yml`](.github/workflows/static.yml). After validation,
the workflow rebuilds `dist`, configures GitHub Pages with
`actions/configure-pages`, uploads `dist` with `actions/upload-pages-artifact`, and
publishes that artifact with `actions/deploy-pages`.

The repository must have **Settings → Pages → Build and deployment → Source** set
to **GitHub Actions**. The workflow supplies the required `pages: write` and
`id-token: write` permissions and deploys through the `github-pages` environment;
it does not require repository or environment secrets. The `CNAME` file is copied
into the artifact for `irondillo.com`, so the domain's DNS records must point to
GitHub Pages and **Enforce HTTPS** should be enabled in the Pages settings.

Each build recreates `dist` with the public HTML, XML, text, CSS, image, and custom
domain files. It also writes the deployed commit to `dist/deployment.json`, using
`DEPLOYMENT_SHA`, `GITHUB_SHA`, or the local Git commit. The deployment job uses
the workflow-provided `GITHUB_SHA` automatically.

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

## Security-policy reference

This site uses a GitHub Pages-compatible, document-delivered security model.
[`config/security-headers.json`](config/security-headers.json) is the canonical
source for the CSP embedded in every root HTML page. The test suite and static
validator require each page to contain that exact policy before any governed
resource, preventing page-to-page policy drift.

The deployed CSP is:

`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests`

Only directives supported in CSP meta delivery belong in this policy. In
particular, do not add `frame-ancestors`, `sandbox`, `report-uri`, or `report-to`:
browsers do not enforce those directives from a CSP meta element. Keep the policy
restrictive and do not add wildcard or legacy provider origins.

GitHub Pages does not provide repository-level configuration for custom HTTP
response headers. Consequently, normal repository artifacts cannot configure
response-only controls such as `X-Content-Type-Options`, `X-Frame-Options`,
`Strict-Transport-Security`, or `Permissions-Policy`. This repository does not
claim those headers are deployed. They may only be documented as deployed after
an explicitly configured non-Cloudflare reverse proxy or another hosting
platform actually supplies and verifies them; HTML meta tags are not substitutes.
