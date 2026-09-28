# Live Show Build Plan — Alan + Sophia Co-Hosted Streams

Status: DRAFT for Alan's review (2026-09-28). Nothing purchased or connected yet.

## Goal
Alan hosts live shows with Sophia as an on-screen AI co-host: she hears Alan, reads chat, and answers out loud through an animated avatar — with Alan in control of when she speaks.

## How it fits together

```
Alan's mic ──► Speech-to-text ──┐
                                ├──► Show controller ──► Claude API (Sophia) ──► Text-to-speech ──► Avatar (lip-sync) ──► OBS ──► YouTube / Facebook / TikTok
Live chat ──► Chat filter ──────┘         ▲
                                Alan's push-to-talk / mute hotkeys
```

## Parts list

| Layer | Recommended start | Alternatives | Notes |
|---|---|---|---|
| Streaming | OBS Studio (free) | Streamlabs | Multi-platform via restream service if needed |
| Ears (speech-to-text) | Streaming STT (e.g. Deepgram) | Whisper, browser speech API | Must be streaming, not batch, for low delay |
| Brain | Claude API, Sophia system prompt | — | Billed per use, NOT covered by the Max plan |
| Voice | ElevenLabs (streaming) | OpenAI TTS, Azure | Pick and lock one "Sophia" voice |
| Face | VTube Studio (Live2D) or VSeeFace (3D) — audio-driven lip-sync | HeyGen / D-ID live avatars | Start 2D; custom avatar art is a later upgrade |
| Chat input | YouTube/Facebook chat API via small controller app | — | Only filtered, Alan-approved messages reach Sophia |
| Controller | Small local app (Node or Python) we build in this repo | — | Glues all layers + hotkeys |

Pricing: verify current rates for each vendor before committing — log chosen vendors in `docs/decisions-log.md`.

## Alan's controls (non-negotiable)
- **Push-to-talk to Sophia**: she only answers when cued.
- **Kill switch**: one hotkey mutes Sophia instantly.
- **Chat gate**: chat questions go into a queue Alan (or a filter) approves before Sophia sees them.
- **Topic guardrails** in her system prompt: brand voice (`docs/brand-voice.md`), no medical/legal/financial advice claims, no reading out personal info.

## Compliance
- Disclose on stream and in the description that the co-host is AI-generated (platform synthetic-media rules).
- Bilingual/French rules in `docs/decisions-log.md` apply to site content, not live streams — confirm with Alan if streams target Quebec.
- Add a live-show section to `docs/platform-compliance.md` once rules are confirmed.

## Build phases
1. **Voice loop (day 1)** — mic → STT → Claude → TTS on Alan's PC. Goal: replies start in under ~2 seconds.
2. **Face (day 2)** — route TTS audio into VTube Studio/VSeeFace; add avatar as OBS source.
3. **Controls (day 2–3)** — push-to-talk, kill switch, on-screen "Sophia is thinking" indicator.
4. **Chat (day 3–4)** — pull live chat, filter, approval queue.
5. **Private test show** — unlisted stream, measure delay, cost per hour, and failure points.
6. **First public show.**

## Budget to track per show
- Claude API tokens per hour
- TTS characters per hour
- STT minutes per hour
Track in a simple log after each test show so cost-per-episode is known before going public.

## Decisions needed from Alan
- [ ] Avatar style: anime 2D, 3D, or realistic?
- [ ] Sophia's voice: pick from ElevenLabs samples
- [ ] Platforms for show #1 (YouTube / Facebook / TikTok)
- [ ] Show format and length (talk, product reviews, Q&A?)
- [ ] Which PC runs it (needs decent CPU/GPU for OBS + avatar)
