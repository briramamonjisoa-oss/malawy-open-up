# MALAWY OPEN UP — Cloudflare Workers deployment

## Git integration settings
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npm run preview`
- Root directory: repository root

## Required Worker secrets
Add these in the Cloudflare Worker settings (Settings → Variables and Secrets):
- `AIRTABLE_TOKEN` — Secret
- `ADMIN_CODE` — Secret

Add this as a plain-text variable:
- `AIRTABLE_BASE_ID`

Use the existing values already configured for the previous Netlify deployment. Never commit secrets to GitHub.

The Worker intentionally preserves all existing `/.netlify/functions/*` API URLs, so the current front-end does not need URL changes. Existing Airtable records and Cloudinary uploads are not migrated or modified.

## Important
Do not delete the old Netlify site or its environment variables until the Cloudflare deployment has been tested end-to-end.
