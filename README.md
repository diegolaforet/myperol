# MyPerol Web

Astro static site for the MyPerol redesign.

## Current State

- `/` is the main landing page.
- `/servicios` is the services page and is linked from the navbar.
- `/precios` is the price calculator page. It prepares a lead request and sends it through a Netlify Function.
- There is no `/home` route; the previous home content now lives directly in `src/pages/index.astro`.
- The old brochure pages and brochure assets have been removed from the project.
- The current hero media is a placeholder image at `public/assets/placeholder/placeholder-index.jpg`. It is intended to be replaced later by a looped video.
- The site supports Spanish, English, German, French, Russian and Ukrainian through local JSON dictionaries.

## Tech Stack

- Astro 5
- Static output
- `@astrojs/sitemap`
- Custom CSS in `public/styles/global.css`
- No frontend framework dependency

## Routes

```text
/             Main landing page
/servicios    Services page
/precios      Price calculator page
```

## Project Structure

```text
.
|-- public/
|   |-- assets/
|   |   |-- icons/
|   |   |   `-- home.svg
|   |   |-- logo/
|   |   |   `-- logo-blanco.png
|   |   `-- placeholder/
|   |       `-- placeholder-index.jpg
|   |-- styles/
|   |   `-- global.css
|   |-- favicon.ico
|   |-- favicon-16x16.png
|   |-- favicon-32x32.png
|   |-- apple-touch-icon.png
|   |-- android-chrome-192x192.png
|   |-- android-chrome-512x512.png
|   `-- site.webmanifest
|-- src/
|   |-- components/
|   |   `-- Header.astro
|   |-- i18n/
|   |   `-- json/
|   |       |-- de.json
|   |       |-- en.json
|   |       |-- es.json
|   |       |-- fr.json
|   |       |-- ru.json
|   |       `-- uk.json
|   |-- layouts/
|   |   `-- BaseLayout.astro
|   `-- pages/
|       |-- index.astro
|       |-- precios.astro
|       `-- servicios.astro
|-- netlify/
|   `-- functions/
|       `-- price-request.mjs
|-- astro.config.mjs
|-- package.json
|-- package-lock.json
`-- tsconfig.json
```

## Main Files

- `src/pages/index.astro`: main page content, hero section, intro text, automatic entry scroll and duplicated card carousels.
- `src/pages/servicios.astro`: services page with the shared card carousel pattern.
- `src/pages/precios.astro`: price calculator flow and final lead form.
- `src/components/Header.astro`: desktop floating navbar, mobile header, language selector and mobile menu markup.
- `src/layouts/BaseLayout.astro`: shared document shell, i18n runtime logic, dropdown behavior and social contact buttons.
- `public/styles/global.css`: global design tokens, responsive rules, glassmorphism surfaces, header, hero, cards and carousel styling.
- `src/i18n/json/*.json`: translations for the supported languages.
- `netlify/functions/price-request.mjs`: serverless email sender for price calculator requests.

## Styling Notes

Shared visual values are centralized in the design token section at the top of `public/styles/global.css`.

Important token groups:

- Page and text colors
- Fixed top controls
- Glassmorphism surfaces and dropdowns
- Hover and divider colors
- Hero image treatment
- Shared shadows
- Card carousel sizing
- Content typography
- Control typography

The navbar, dropdowns and translucent UI use shared CSS variables so their surface, border, text and hover colors can be adjusted consistently.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:4321
```

## Build

Generate the static production build:

```bash
npm run build
```

The output is written to:

```text
dist/
```

## Netlify Email Function

The price calculator posts final requests to:

```text
/.netlify/functions/price-request
```

The function sends email through the Resend HTTP API. Configure these Netlify environment variables before production:

```text
RESEND_API_KEY=...
PRICE_REQUEST_TO_EMAIL=empresa@myperol.com
PRICE_REQUEST_FROM_EMAIL=MyPerol <no-reply@myperol.com>
```

`PRICE_REQUEST_FROM_EMAIL` must use a sender domain verified in Resend.

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Git Ignore Notes

The repository ignores:

- `node_modules/`
- `dist/`
- `.astro/`
- environment files
- package-manager debug logs
- local dev-server logs: `dev-server.err.log` and `dev-server.out.log`
