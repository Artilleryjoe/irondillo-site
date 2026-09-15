# Iron Dillo Cybersecurity Site

Marketing site for [Iron Dillo Cybersecurity](https://irondillo.com). The project contains hand-crafted HTML pages, a generated Tailwind output (`assets/tailwind.css`), and a Cloudflare Pages Function for the contact form.

## Repository layout

```
.
├── assets/                 # Published images, icons, and generated CSS
├── docs/                   # Project notes and historical reports
├── src/styles/             # Source files used to build published CSS
├── index.html              # Home page
├── services.html           # Overview of offerings
├── about.html              # Background and mission statement
├── contact.html            # Contact form submitted through FormSubmit
├── commitment.html         # Cybersecurity commitment and ethics
├── lindale-tyler-cybersecurity.html  # Local services landing page
├── privacy.html / terms.html          # Policy documents
├── maintenance.html        # Temporary maintenance notice page
├── 404.html                # Custom error page for missing routes
├── sitemap.xml / robots.txt
└── .github/workflows/static.yml       # Cloudflare Pages deployment workflow
```

The HTML entry points intentionally remain at the repository root because the
static host maps those filenames directly to the site's public URLs. Moving them into a
source directory without introducing a site build step would break existing links.
Development-only material belongs in `docs/` and `src/`, while files referenced by
the deployed pages retain their existing public paths.

## Local development

Use any HTTP server to preview the content locally. For example with Python:

```bash
python -m http.server 8000
```

Then browse to <http://localhost:8000> to view the site. Edits to the HTML files will hot-reload when you refresh the page.


## Build and deploy guard (Tailwind)

The Tailwind source lives at `src/styles/tailwind.css`, and its generated output is
committed at `assets/tailwind.css`. Any HTML class changes should be followed by a
rebuild so published styles stay in sync.

Run this local check before pushing:

```bash
npm ci
npm run build:tailwind
git diff --exit-code -- assets/tailwind.css
```

If the diff command reports changes, commit the regenerated `assets/tailwind.css` before opening or merging a PR.

The GitHub Actions validation workflow also enforces this and fails when the generated CSS is not committed.

## Deployment

The production Cloudflare Pages project should deploy the repository from `main`; Pages Functions are required for `/api/contact`. GitHub Actions runs the build and endpoint tests as a deployment guard. Configure the secrets and binding below in the Pages project before enabling the form.

## Content guidelines

* Keep images in `assets/`. Remove unused media so the repository stays lightweight.
* Inline Tailwind classes control styling; no additional CSS build pipeline is necessary.
* The contact form posts URL-encoded data to FormSubmit over HTTPS. JavaScript enhances the form with in-page progress and result messages; ordinary HTML submission remains available without JavaScript. Keep `contact.html`, the privacy copy, and the `connect-src`/`form-action` directives in `_headers` and the page-level CSP aligned if the processor changes.
* For any metadata updates (Open Graph, SEO), update the relevant `<meta>` tags across the HTML pages.

### Testimonial updates

When adding or revising testimonials, follow this checklist so updates stay consistent and reviewable:

* Required fields: quote, client name, title/organization, and approval date.
* Optional anonymization: if requested, replace identifying details with an approved alias (for example, first name + industry) while preserving the approved quote text.
* Keep quotes exact as approved; only make wording edits when the client explicitly approves changes.
* Avoid disclosing confidential project specifics, internal security details, or private business information in testimonial copy.
* Edit location: `index.html` (testimonials section). Styling source: `styles.css` (testimonial-related classes).

## Security headers policy

A single canonical policy is defined in [`_headers`](_headers). Cloudflare Pages
processes that file during deployment and applies the policy to all routes (`/*`):

- The canonical policy is in `_headers`. It permits the Turnstile script, frame, and verification connection only to `https://challenges.cloudflare.com`, and restricts form submissions to this origin.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000`

The `mailto:` allowance remains only because the current contact form opens an email
client. When a hosted form endpoint is selected, replace it in `form-action` and add
that exact origin to `connect-src`; remove `mailto:` after email-client submission is
retired. Do not add wildcard origins. Page-level CSP meta tags are defense-in-depth,
but `_headers` is the canonical production policy because Cloudflare sends it as an
HTTP response header (including directives such as `frame-ancestors` that meta CSP
cannot enforce).
