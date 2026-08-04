# Platform Compliance

Defines the Mandatory Post Elements and Guardian Compliance Checklist that every post-style piece of Axiom Enterprises content (social, blog, email, product listing) is reviewed against before it reaches Sophia or Alan. Guardian enforces this document — see `.claude/agents/guardian.md`.

## Mandatory Post Elements

Every post must include:

- **Product photo** — supplied by Alan. Media Studio specs the brief but never generates or sources a substitute image.
- **Offer stated** — what's being offered (product, service, listing, and price if confirmed in `docs/products-services.md`) stated plainly, with no fabricated pricing or claims.
- **Contact email** — `rise@empoweredathome.com` present.
- **Relevant site advertised and linked** — the Axiom site the content supports (EmpoweredAtHome.com, EverythingInternet.ca, or SchmucksDebate.com) named and linked wherever the platform allows links.
- **English and Spanish versions** — both language versions provided.

### Exceptions

- Video posts are exempt from the product-photo requirement — a video is not a photo, not a bypass of the other elements.
- Any element, including the product photo, can be waived by Alan explicitly, per post. A waiver is never assumed or carried forward from a prior post.

## Guardian Compliance Checklist

Guardian checks every draft against this list before it goes to Alan, and rejects anything missing an element rather than letting it through with a note:

- [ ] Product photo present (or the post is video, or Alan waived it for this post)
- [ ] Offer stated, with no fabricated pricing or claims
- [ ] Contact email `rise@empoweredathome.com` present
- [ ] Relevant site named and linked where the platform allows it
- [ ] English and Spanish versions both provided (or waived for this post)
- [ ] Copy matches `docs/brand-voice.md` (no hype, no fake urgency)
- [ ] No claims beyond what's grounded in `docs/products-services.md`, `docs/axiom-bible.md`, or `docs/catalogs/`

## Reconciliation note (2026-08-03/04) — merged from a divergent repo checkout

A separate local checkout (`QueenAxiom/-goose-`) had its own evolved version of this doc with additional analysis not reflected above. Preserving it here rather than discarding:

- **Open discrepancy, needs Alan's call:** this doc's "English and Spanish versions — both language versions provided" reads as one post = two language versions. But `content-agent.md`'s actual instruction (and the real running behavior in `automation/content-log.md`/`social-log.md`) is single-language posts alternating EN/ES across the posting cadence — never mixed in one post. These two descriptions disagree. The live routines have been running on the single-language-alternating behavior in practice. Update whichever description is stale once Alan confirms which is actually wanted.
- **Not yet captured anywhere:** platform-specific specs (image dimensions, caption character limits) per destination platform.
