# iNEX new website

This directory is the new source of truth for the redesigned iNEX website. The WordPress export in the parent directory is retained only as migration reference.

## Commands

```sh
npm install
npm run dev
npm run build
```

The production-ready static output is generated in `dist/` for Cloudflare Pages.

## Preserved integrations

- Contact form: Deftform embed ID `5f06f365-5c7b-4db8-bdd0-1a15589221c5`
- Existing public article and solution URLs
- Cloudflare `_headers` and `_redirects`

The former HVAC calculator, HVAC load calculator, and PM2.5 routes are not generated. Redirect rules retain safe navigation from those old URLs.
