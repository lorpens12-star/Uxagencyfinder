# UX Agency Finders

**Live:** https://uxagencyfinder.vercel.app (production domain: uxagencyfinders.com)

A curated, frontend-only website listing the best UX design agencies by industry: Healthcare, Fintech, Ecommerce, Logistics, Real Estate, Education, Robotics, and AI & ML. It covers 21 agencies across 52 editorial placements, and every placement is backed by a named project and a cited source.

- **Stack:** Astro (static output), TypeScript and plain CSS. No backend, database, CMS or server functions.
- **Content:** JSON files in `src/data/`, validated with Zod before every build.
- **Quality:** Lighthouse 100 for Performance, Accessibility, Best Practices and SEO on key pages. WCAG 2.2 AA colour contrast. Works without JavaScript.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run validate` | Check the data rules (exclusions, positions, references, labels) |
| `npm run build` | Validate, then build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run test:seo` | Static SEO audit of `dist/` (titles, descriptions, canonicals, sitemap, dashes) |
| `npm run test:e2e` | Browser tests across mobile, tablet and desktop (needs `npm run preview`) |
| `npm run test:lighthouse` | Lighthouse scores for key pages (needs `npm run preview`) |
| `npm run images` | Regenerate the social preview image and apple-touch icon |

> On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`. The browser tests use the local Chrome install (`CHROME_PATH` overrides the path).

## Editing content

See **[CLAUDE.md](./CLAUDE.md)**. It covers where everything lives, the hard rules, and common tasks (reorder, add or remove agencies, logos, publishing).

## Project structure

```
src/
  data/            site.json, agencies.json, industries.json, sources.json  <- content
  lib/             schema.mjs (validation), data.ts (data access), routes.ts, llms.ts, visuals.ts
  components/      Header, Footer, SearchBox, ComparisonTable, AgencyAssessment, IndustryCard, Avatar, FAQ, Icon
  layouts/         BaseLayout (meta, SEO, JSON-LD), ProseLayout (Markdown pages)
  pages/           industry lists, profiles, directory, guides, policies, sitemap.xml, robots.txt, llms.txt
  scripts/         directory.ts (client-side search, filter, sort)
public/            logos/, favicon, og-image.png, apple-touch-icon.png
scripts/           validate-data.mjs, fetch-logos.mjs, generate-images.mjs
tests/             qa.mjs (e2e), lighthouse.mjs, seo-check.mjs
```

## How it works without a backend

| Need | Implementation |
| --- | --- |
| Content management | JSON and Markdown in Git, edited directly or through Claude |
| Contact and corrections | `mailto:` links plus a compose form that opens the visitor's email app. Nothing is stored |
| Search and filters | Client-side JavaScript over pre-rendered HTML. Directory state is kept in the URL hash (`/directory/#industry=healthcare`) |
| Search visibility | Indexable. `/sitemap.xml`, `/robots.txt`, `/llms.txt` (also `/llm.txt` and `/llms-full.txt`), canonical URLs, Open Graph image and JSON-LD are all generated from the data |
| Publishing | `publication_state` per record, plus a `showDrafts` flag in `site.json` |

## Deploying

The site is deployed on Vercel from this repository. Any static host works:
- **Build command:** `npm run build`
- **Output directory:** `dist`

**Rollback:** redeploy a previous deployment or Git commit.

## Launch checklist

- Connect `uxagencyfinders.com` to the hosting project.
- Submit `https://uxagencyfinders.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Mark reviewed records as `published`, then set `showDrafts: false` in `site.json`.
