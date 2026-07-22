---
description: Generate the full Axiom Enterprises content package for one product from an Amazon affiliate link + product name
---

# Axiom Product Generator

Input: an Amazon (or amazon.ca) affiliate link, and a product name.

## Step 1 — Pull real data, never invent it

Open the affiliate link (it's a redirect — follow it to the real amazon.ca/amazon.com product page). Extract:

- Full product title
- Price (and currency — prefer amazon.ca / CAD per [[project-axiom-amazon-ca]] / `docs/ecosystem-reference.md`)
- Star rating and review count
- Full bullet-point feature list ("About this item")
- Key specs (dimensions, weight, compatibility, etc.)
- Brand/seller
- Images (note URLs if available)

If any of the outputs below would require a fact not present on the product page (e.g. exact shipping time, a specific comparison claim), do not invent it — write around it or flag it as `[NEEDS INPUT: ...]` instead of guessing. This is a hard rule from `docs/axiom-bible.md` (AI Agent Standards: "Never fabricate information").

## Step 2 — Read brand voice before writing anything

Read `docs/axiom-bible.md` (brand voice, values, writing rules, "Never" list) and `docs/ecosystem-reference.md` before drafting. Every output below must follow it: plain English, teach before selling, no hype/fake urgency/clickbait, honest about limitations, every article answers what/why/how/next.

## Step 3 — Produce these outputs

1. **Empowered At Home review** — full-length educational review (600-900 words). Structure: what problem it solves → how it works in plain English → honest pros/limitations → who it's actually for → practical next step. This is the brand's flagship voice — teach first.

2. **EverythingInternet.ca listing** — short, discovery-platform-style listing (100-150 words): what it is, who makes it, where to get it. This site is a directory, not a review site — keep it factual and brief.

3. **Schmucks Debate article** — reframe the product through a business/philosophy/negotiation lens matching the brand's actual purpose (a game that teaches business and philosophy through debate and negotiation — see `docs/axiom-bible.md`). E.g. "the negotiation case for owning your own meeting record," or a devil's-advocate angle. Don't force it if the product has no genuine negotiation/philosophy angle — say so instead of manufacturing one.

4. **SEO title** — under 60 characters, includes the core keyword, no clickbait.

5. **Meta description** — under 160 characters, factual, includes a clear reason to click.

6. **FAQs** — 4-6 real questions a buyer would actually ask, answered honestly (including limitations where relevant).

7. **Categories** — map to the site's actual existing category taxonomy where possible (see `docs/catalogs/empoweredathome-catalog.md` for EmpoweredAtHome.com's real categories) rather than inventing new ones.

8. **Tags** — 6-10 lowercase, specific (not generic buzzwords).

9. **Internal links** — 2-4 real links to other Axiom ecosystem pages/products that make sense (e.g. a related product already in `docs/catalogs/`, or the Ecosystem Reference page). Don't invent URLs that don't exist yet.

10. **Social media posts** — one each for: X/Twitter (under 280 chars), Instagram/Facebook caption, LinkedIn (more professional/business angle). Each should sound like a person, not an ad.

11. **Email content** — one short promotional/educational email (subject line + ~150-250 word body) following the "teach before selling" rule.

## Step 4 — Save the output

Write the full generated package to `docs/generated-content/<product-slug>.md` in this repo, and give the user a chat summary (not the full dump) pointing to the file. Do not publish anything live (no posting, no WordPress upload, no email send) — this command only drafts content for human review.
