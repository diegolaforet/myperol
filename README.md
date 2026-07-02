# MyPerol Landing Page

Astro static site for MyPerol.

## Current State

- `/` is the active main page.
- There is no `/home` route; the home content lives directly in `src/pages/index.astro`.
- The old brochure page and brochure assets have been removed from the app.
- `public/_redirects` also redirects old brochure-like paths to `/` for static hosts that support Netlify-style redirects.

## Tech Stack

- Astro 5
- `@astrojs/sitemap`
- Static output
- Custom CSS

## Project Structure

```text
.
|-- public/
|   |-- assets/
|   |   |-- icons/
|   |   `-- logo/
|   |-- styles/
|   |   `-- global.css
|   |-- _redirects
|   |-- site.webmanifest
|   `-- favicon assets
|-- src/
|   |-- components/
|   |   `-- Header.astro
|   |-- i18n/
|   |   `-- json/
|   |-- layouts/
|   |   `-- BaseLayout.astro
|   `-- pages/
|       `-- index.astro
|-- astro.config.mjs
`-- package.json
```

## Local Development

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:4321`.

## Build

```bash
npm run build
```
