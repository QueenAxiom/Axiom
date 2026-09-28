# Jarvis: Sophia Voice Co-Host

Phase 1 of `docs/live-show-build-plan.md`: the voice loop. You talk, Sophia answers out loud, and a glowing orb on screen reacts to her voice. Built for podcasts first, live shows next.

## What you need
- Node.js 22 or newer (nodejs.org)
- Chrome or Edge (voice input uses the browser's speech recognition)
- A Claude API key from console.anthropic.com (billed per use, separate from the Max plan)
- Optional: an ElevenLabs API key and voice ID for Sophia's real voice. Without it she uses the browser's built-in voice.

## Setup (one time)
```
cd jarvis
npm install
cp .env.example .env
```
Open `.env` and paste your keys.

## Run it
```
npm start
```
Open http://localhost:3000 in Chrome and allow the microphone.

## Controls
| Key | What it does |
|---|---|
| Hold Space | Talk to Sophia. Let go and she answers. |
| Esc | Kill switch. Sophia stops instantly. |
| S | Stage mode: hides the controls, leaves only the orb and captions |
| C | Captions on or off |
| G | Green-screen background for OBS chroma key |
| New show button | Clears Sophia's memory of the conversation |

Talking over Sophia cuts her off, like a real co-host.

## Recording a podcast with OBS
1. Open Jarvis in Chrome, press S for stage mode (and G if you want green screen).
2. In OBS add a Window Capture of the Chrome window. For green screen, add a Chroma Key filter.
3. OBS Desktop Audio captures Sophia's voice; your mic is captured as usual.
4. Put the AI disclosure in the episode description (see `docs/live-show-build-plan.md`).

## Tuning
- Sophia's personality and on-air rules: `sophia-prompt.md`
- Model and effort: `CLAUDE_MODEL`, `CLAUDE_EFFORT` in `.env` (default `claude-opus-5-5` at `low` effort for fast replies)
- Voice: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`

## Notes
- The server only listens on your own computer (localhost). Keys never reach the browser.
- If Claude declines a request, a safer fallback model answers automatically.
- Not built yet: live chat reading (phase 4) and an animated avatar face (phase 2).
