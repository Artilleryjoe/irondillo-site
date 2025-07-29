# Iron Dillo Cybersecurity Site

This repository contains the source code for Iron Dillo's public website. The pages are plain HTML files styled with Tailwind CSS via CDN. There is no build step—GitHub Pages hosts the files as-is.

## Structure

- `index.html` – main landing page
- `about.html`, `services.html`, `contact.html`, and other static pages
- `blog.html` – index of posts located in `posts/`
- `posts/` – individual blog articles
- `Drafts/` – unpublished or in-progress posts
- `assets/` – images and icons used throughout the site
- `maintenance.html` – page shown when maintenance mode is enabled
- `404.html` – custom not-found page
- `CNAME`, `robots.txt`, `sitemap.xml` – domain and SEO configuration

### Maintenance mode

At the top of `index.html` is a small script controlling maintenance mode:

```html
<script>
  // Set this to false to disable maintenance mode
  const maintenanceMode = false;

  if (maintenanceMode) {
    window.location.href = "maintenance.html";
  }
</script>
```

Change `maintenanceMode` to `true` when you need to temporarily redirect all visitors to `maintenance.html`.

### Contact form

`contact.html` features a simple Formspree-powered form protected by reCAPTCHA:

```html
<form id="contact-form" action="https://formspree.io/f/xldnbpdg" method="POST">
  <!-- name, email, message fields -->
</form>
```

Formspree forwards the submitted message to the site owner—no backend is required.

## Deployment

1. Commit your changes and push to the `main` branch on GitHub.
2. Enable GitHub Pages for the repository with **Source: main branch** and **/ (root)**.
3. GitHub Pages will serve the content automatically using the included `CNAME` file for the `irondillo.com` domain.

During local development you can open the HTML files directly in a browser or start a simple server with:

```bash
python3 -m http.server
```

## Contributing

Add new pages or posts under the appropriate folders. Keep filenames lowercase with hyphens. Since Tailwind is loaded via CDN, there are no additional build steps.
