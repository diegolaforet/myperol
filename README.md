# MyPerol Landing Page

A multilingual Astro landing page built for **MyPerol**, an early-stage flooring company focused on **resin and epoxy-style surface solutions**.

This project is designed as a lightweight digital entry point for people who scan a **QR code printed on real brochures**. From that first touchpoint, visitors can switch language, review the brochure content in their preferred language, and access a future company home page that is already prepared in the project structure.

## Overview

The current site is not a traditional corporate website yet. It is a focused landing experience that supports an offline-to-online flow:

1. A potential customer receives a printed brochure.
2. The brochure includes a QR code.
3. The QR code opens the landing page.
4. The visitor can switch language instantly.
5. The brochure visuals update to the selected language.
6. The user can also move toward a future `/home` page, which is currently marked as under construction.

This makes the project especially useful for multilingual lead capture and presentation in real-world distribution contexts such as flyers, handouts, and local promotional material.

## Current Features

- Built with **Astro** as a static site.
- Main brochure landing page at `/`.
- Future home page scaffold at `/home`.
- Persistent language selection via `localStorage`.
- Multilingual brochure swapping based on the selected language.
- Sticky header with language selector and navigation.
- WhatsApp and Instagram quick-access buttons.
- Desktop zoom controls for brochure reading.
- Static deployment-ready setup with sitemap generation.
- Redirect rule that currently sends `/home` back to `/`.

## Supported Languages

The project currently includes brochure assets and language options for:

- Spanish (`es`)
- English (`en`)
- German (`de`)
- Italian (`it`)
- Russian (`ru`)
- Ukrainian (`uk`)
- Polish (`pl`)
- Chinese (`zh`)

## Tech Stack

- **Astro 5**
- **@astrojs/sitemap**
- Static assets served from `public/`
- Custom global CSS
- Client-side JavaScript for language state and brochure updates

## Project Structure

```text
.
|-- public/
|   |-- assets/
|   |   |-- brochures/
|   |   |-- icons/
|   |   `-- logo/
|   |-- styles/
|   |   `-- global.css
|   |-- site.webmanifest
|   `-- favicon assets
|-- src/
|   |-- components/
|   |   |-- Brochure.astro
|   |   `-- Header.astro
|   |-- i18n/
|   |   `-- json/
|   |-- layouts/
|   |   `-- BaseLayout.astro
|   `-- pages/
|       |-- index.astro
|       `-- home.astro
|-- astro.config.mjs
`-- package.json
```

## How It Works

### Landing Page

The main route renders a two-page brochure experience using image assets stored in `public/assets/brochures/`. The default language is Spanish, and the selected language updates the brochure image sources dynamically in the browser.

### Language Switching

Language selection is handled on the client side and stored in `localStorage`, so returning users keep their preferred language during future visits on the same device.

### Home Page Preparation

The `/home` page already exists as a placeholder for the future company website. It currently displays an "under construction" message that adapts to the selected language.

### Redirect Behavior

There is a redirect rule in `public/assets/_redirects` that maps `/home` to `/`. This suggests the project is prepared for staged rollout, where the route structure exists but public navigation can still be controlled during deployment.

## Local Development

### Requirements

- Node.js
- npm

### Install

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

### Build for Production

```bash
npm run build
```

### Preview the Production Build

```bash
npm run preview
```

## Deployment Notes

The project is configured as a **static Astro site** and is suitable for deployment on platforms such as Netlify or similar static hosting providers.

Relevant implementation details:

- `astro.config.mjs` sets `output: 'static'`
- sitemap generation is enabled
- the site URL is configured as `https://myperol.es`
- redirect behavior is managed through a `_redirects` file

## Branding and UX Direction

The implementation prioritizes:

- simple access from printed marketing material
- low-friction multilingual browsing
- readable brochure presentation on mobile and desktop
- lightweight static delivery
- a transition path from brochure landing page to a future fuller website

## Roadmap Opportunities

Natural next steps for the project would be:

- replace the `/home` placeholder with a full company website
- connect CTA buttons to lead capture or quote request forms
- move translation strings into a single structured i18n system
- improve accessibility for language menu interactions
- add analytics for QR traffic and language usage
- optimize brochure delivery with modern image formats if needed
- define clearer SEO metadata per route and per language

## Repository Purpose

This repository is the foundation of MyPerol's first digital presence: a practical multilingual landing page that bridges **physical brochures and online contact**, while leaving room for the brand's future homepage and broader web presence.
