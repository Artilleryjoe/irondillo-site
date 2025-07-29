# Iron Dillo Cybersecurity Website

This repository contains the static website for **Iron Dillo Cybersecurity**. The site is built with vanilla HTML and CSS, enhanced with [Tailwind CSS](https://tailwindcss.com/) and a few lines of JavaScript. All pages live directly in this repository so it can be served via GitHub Pages.

## Repository layout

- `index.html` – Home page with an overview of services
- `about.html`, `services.html`, `contact.html` – Informational pages
- `blog.html` and `posts/` – Static blog articles
- `Drafts/` – Unpublished or in-progress posts
- `assets/` – Images, styles, and other static assets

## Local development

No special tooling is required. Clone the repository and open `index.html` in your browser. To view the site on a local server you can run:

```bash
python3 -m http.server
```

then open `http://localhost:8000`.

## Contributing

1. Fork this repository
2. Create a new branch for your changes
3. Commit and open a pull request describing your update

Issues and improvements are welcome. Please keep contributions focused on clear, actionable content or bug fixes.

## Deployment

This site is deployed via **GitHub Pages**. Pushing changes to the `main` branch will update the live site. The included `CNAME` file maps the Pages site to `irondillo.com`.

## License

The contents of this repository are released under the [MIT License](LICENSE).
