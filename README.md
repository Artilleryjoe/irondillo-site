# Iron Dillo Cybersecurity Site

Static marketing site for [Iron Dillo Cybersecurity](https://irondillo.com). The project is a collection of hand-crafted HTML pages with a generated Tailwind output (`assets/tailwind.css`) deployed through GitHub Pages.

## Repository layout

```
.
├── assets/                 # Images, icons, and other static media
├── index.html              # Home page
├── services.html           # Overview of offerings
├── about.html              # Background and mission statement
├── contact.html            # Contact form that opens the visitor’s email app
├── commitment.html         # Cybersecurity commitment and ethics
├── lindale-tyler-cybersecurity.html  # Local services landing page
├── privacy.html / terms.html          # Policy documents
├── maintenance.html        # Temporary maintenance notice page
├── thank-you.html          # Post-form submission follow-up page
├── 404.html                # Custom error page for missing routes
├── sitemap.xml / robots.txt
└── .github/workflows/static.yml       # GitHub Pages deployment workflow
```

## Local development

Use any HTTP server to preview the content locally. For example with Python:

```bash
python -m http.server 8000
```

Then browse to <http://localhost:8000> to view the site. Edits to the HTML files will hot-reload when you refresh the page.


## Build and deploy guard (Tailwind)

Tailwind output is committed to the repo at `assets/tailwind.css`. Any HTML class changes should be followed by a rebuild so published styles stay in sync.

Run this local check before pushing:

```bash
npm ci
npm run build:tailwind
git diff --exit-code -- assets/tailwind.css
```

If the diff command reports changes, commit the regenerated `assets/tailwind.css` before opening or merging a PR.

The GitHub Pages workflow also enforces this: deploy will fail if `npm run build:tailwind` produces changes that are not committed.

## Deployment

Pushes to the `main` branch trigger the GitHub Actions workflow in `.github/workflows/static.yml`, which publishes the repository to GitHub Pages. Ensure changes are committed and merged into `main` to update the live site.

## Content guidelines

* Keep images in `assets/`. Remove unused media so the repository stays lightweight.
* Inline Tailwind classes control styling; no additional CSS build pipeline is necessary.
* The contact form uses a `mailto:` action so visitors can review the message in their email app before sending. If a hosted form service is added later, update `contact.html`, the privacy/terms copy, and the `form-action` directives in `_headers` and page-level CSP meta tags.
* For any metadata updates (Open Graph, SEO), update the relevant `<meta>` tags across the HTML pages.

### Testimonial updates

When adding or revising testimonials, follow this checklist so updates stay consistent and reviewable:

* Required fields: quote, client name, title/organization, and approval date.
* Optional anonymization: if requested, replace identifying details with an approved alias (for example, first name + industry) while preserving the approved quote text.
* Keep quotes exact as approved; only make wording edits when the client explicitly approves changes.
* Avoid disclosing confidential project specifics, internal security details, or private business information in testimonial copy.
* Edit location: `index.html` (testimonials section). Styling source: `styles.css` (testimonial-related classes).

## Security headers policy

A single canonical policy is defined in [`_headers`](_headers) and should be deployed at the CDN/proxy layer (Cloudflare Pages/Netlify-style header injection). Apply it to all routes (`/*`) so every page inherits the same baseline controls:

- `Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; frame-src https://www.google.com; form-action 'self' mailto:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()`
- `X-Frame-Options: DENY`

If the host cannot set response headers directly (for example, raw GitHub Pages without a proxy/CDN), keep matching `<meta http-equiv=...>` tags in every HTML page as a fallback baseline. When creating new pages, copy the same security meta block so policy stays consistent site-wide.
