# Iron Dillo Cybersecurity Site

Iron Dillo is a lightweight static website offering cybersecurity tips and consulting services. It is built entirely from static HTML files styled with [Tailwind CSS](https://tailwindcss.com/) and hosted via GitHub Pages. This repository contains the source files for the site.

## Structure

- **Root HTML pages** – Core pages such as `index.html`, `services.html`, `about.html`, `contact.html`, and legal pages live in the project root.
- **`posts/`** – Individual blog articles.
- **`assets/`** – Images and other static resources referenced by pages.
- **`Drafts/`** – Unpublished or in-progress posts.
- Additional files like `sitemap.xml`, `robots.txt`, and `CNAME` support SEO and the custom domain.

### Maintenance Mode

The home page includes a simple script that redirects visitors to `maintenance.html` when maintenance is enabled:

```html
<script>
  // Set this to false to disable maintenance mode
  const maintenanceMode = false;

  if (maintenanceMode) {
    window.location.href = "maintenance.html";
  }
</script>
```

This allows you to quickly put the site into "Cyberstasis" mode by changing the `maintenanceMode` flag.

### Contact Form

`contact.html` contains a minimal form powered by [Formspree](https://formspree.io/) so inquiries are emailed without running a backend. It also includes a Google reCAPTCHA check to cut down on spam:

```html
<form id="contact-form" action="https://formspree.io/f/xldnbpdg" method="POST" class="space-y-6" onsubmit="return onSubmit(event)">
  <!-- fields omitted -->
  <div class="g-recaptcha" data-sitekey="YOUR-RECAPTCHA-KEY"></div>
  <button type="submit">Send Message</button>
</form>
```

## Deploying

1. Push the repository to GitHub.
2. Enable GitHub Pages in the repository settings, serving from the `main` branch.
3. (Optional) Add your custom domain in **Settings → Pages** and update `CNAME` if needed.

Once enabled, GitHub Pages will automatically build and host the static files. If you change content, push your updates and Pages will redeploy.

## Contributing

Feel free to submit pull requests for bug fixes, content updates, or new posts. Because the site is static, you can preview changes locally by opening `index.html` in a browser or running a simple static server such as:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000` to view the site.

