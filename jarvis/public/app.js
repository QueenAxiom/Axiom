// Jarvis stage page: push-to-talk in, Sophia's voice out, orb reacts to her voice.

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const captionEl = $("caption");
const heardEl = $("heard");
const talkBtn = $("talk-btn");

let useEleven = false;
let state = "idle"; // idle | listening | thinking | speaking
let chatAbort = null;
let speakQueue = [];
let speaking = false;
let generation = 0; // bumps on kill so stale audio never plays

function setState(next, note = "") {
  state = next;
  const labels = {
    idle: "Ready. Hold Space to talk to Sophia.",
    listening: "Listening…",
    thinking: "Sophia is thinking…",
    speaking: "Sophia is speaking…",
  };
  statusEl.textContent = note || labels[next];
}

// ---------- Audio + visualizer ----------
const audioEl = new Audio();
let audioCtx = null;
let analyser = null;
const levels = new Uint8Array(256);

function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  const source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

let syntheticLevel = 0; // used when the browser voice speaks (no audio stream to analyse)

function currentLevel() {
  if (useEleven && analyser && !audioEl.paused) {
    analyser.getByteTimeDomainData(levels);
    let sum = 0;
    for (const v of levels) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / levels.length) * 4);
  }
  if (state === "speaking") {
    syntheticLevel += (0.35 + Math.random() * 0.5 - syntheticLevel) * 0.25;
    return syntheticLevel;
  }
  return 0;
}

const canvas = $("orb");
const ctx2d = canvas.getContext("2d");
let smooth = 0;

function draw(t) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth * dpr;
  if (canvas.width !== size) canvas.width = canvas.height = size;
  const c = size / 2;
  smooth += (currentLevel() - smooth) * 0.3;

  const hue = { idle: 215, listening: 150, thinking: 265, speaking: 200 }[state];
  const breathe = 0.03 * Math.sin(t / 600);
  const r = size * (0.22 + breathe + smooth * 0.12);

  ctx2d.clearRect(0, 0, size, size);
  const glow = ctx2d.createRadialGradient(c, c, r * 0.2, c, c, r * 2);
  glow.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.9)`);
  glow.addColorStop(0.5, `hsla(${hue}, 90%, 50%, 0.25)`);
  glow.addColorStop(1, `hsla(${hue}, 90%, 40%, 0)`);
  ctx2d.fillStyle = glow;
  ctx2d.beginPath();
  ctx2d.arc(c, c, r * 2, 0, Math.PI * 2);
  ctx2d.fill();

  // Voice ring
  ctx2d.strokeStyle = `hsla(${hue}, 95%, 75%, 0.9)`;
  ctx2d.lineWidth = size * 0.008;
  ctx2d.beginPath();
  const points = 96;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const wobble = smooth * size * 0.04 * Math.sin(a * 6 + t / 120);
    const x = c + Math.cos(a) * (r + wobble);
    const y = c + Math.sin(a) * (r + wobble);
    i ? ctx2d.lineTo(x, y) : ctx2d.moveTo(x, y);
  }
  ctx2d.stroke();

  if (state === "thinking") {
    ctx2d.strokeStyle = `hsla(${hue}, 95%, 80%, 0.8)`;
    ctx2d.beginPath();
    ctx2d.arc(c, c, r * 1.25, t / 300, t / 300 + Math.PI / 2);
    ctx2d.stroke();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

// ---------- Speaking ----------
function fetchTts(text) {
  return fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).then((r) => {
    if (!r.ok) throw new Error(`TTS ${r.status}`);
    return r.blob();
  });
}

function enqueueSpeech(text) {
  text = text.trim();
  if (!text) return;
  // Start ElevenLabs early so the next sentence is ready when the current one ends.
  speakQueue.push({ text, audio: useEleven ? fetchTts(text) : null });
  if (!speaking) playQueue(generation);
}

async function playQueue(gen) {
  speaking = true;
  while (speakQueue.length && gen === generation) {
    const item = speakQueue.shift();
    setState("speaking");
    try {
      if (item.audio) await playBlob(await item.audio, gen);
      else await speakBrowser(item.text);
    } catch (err) {
      console.error(err);
      if (gen === generation) await speakBrowser(item.text); // voice fallback
    }
  }
  speaking = false;
  if (gen === generation && !chatAbort) setState("idle");
}

function playBlob(blob, gen) {
  return new Promise((resolve) => {
    if (gen !== generation) return resolve();
    const url = URL.createObjectURL(blob);
    audioEl.src = url;
    audioEl.onended = audioEl.onpause = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audioEl.play().catch(resolve);
  });
}

function speakBrowser(text) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => /female|samantha|zira|aria|jenny/i.test(v.name)) || null;
    u.onend = u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

function kill() {
  generation++;
  if (chatAbort) chatAbort.abort();
  chatAbort = null;
  speakQueue = [];
  speaking = false;
  audioEl.pause();
  speechSynthesis.cancel();
  setState("idle", "Stopped. Ready.");
}

// ---------- Asking Claude ----------
async function ask(text) {
  text = text.trim();
  if (!text) return;
  kill();
  ensureAudioGraph();
  const gen = generation;
  heardEl.textContent = `You: ${text}`;
  captionEl.textContent = "";
  setState("thinking");

  chatAbort = new AbortController();
  let pending = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: chatAbort.signal,
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const line = buf.slice(0, idx).replace(/^data: /, "");
        buf = buf.slice(idx + 2);
        const evt = JSON.parse(line);
        if (evt.type === "text") {
          captionEl.textContent += evt.text;
          pending += evt.text;
          // Speak each finished sentence right away so Sophia starts talking fast.
          // A sentence counts as finished once punctuation is followed by a space.
          let m;
          while ((m = pending.match(/^[\s\S]*?[.!?]+\s/))) {
            enqueueSpeech(m[0]);
            pending = pending.slice(m[0].length);
          }
        } else if (evt.type === "refusal") {
          setState("idle", "Sophia declined that one.");
        } else if (evt.type === "error") {
          setState("idle", evt.message);
        }
      }
    }
    if (gen === generation) enqueueSpeech(pending);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      setState("idle", "Could not reach the Jarvis server.");
    }
  } finally {
    if (gen === generation) {
      chatAbort = null;
      if (!speaking && state === "thinking") setState("idle");
    }
  }
}

// ---------- Listening (push-to-talk) ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let transcript = "";

if (Recognition) {
  recognizer = new Recognition();
  recognizer.lang = "en-US";
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.onresult = (e) => {
    let finalText = "";
    let interim = "";
    for (const r of e.results) (r.isFinal ? (finalText += r[0].transcript) : (interim += r[0].transcript));
    transcript = finalText + interim;
    heardEl.textContent = `You: ${transcript}`;
  };
  recognizer.onend = () => {
    talkBtn.classList.remove("active");
    if (state === "listening") {
      if (transcript.trim()) ask(transcript);
      else setState("idle");
    }
  };
}

function startTalking() {
  if (!recognizer) {
    setState("idle", "Voice input needs Chrome or Edge. Type instead.");
    return;
  }
  if (state === "listening") return;
  kill(); // talking over Sophia cuts her off, like a real co-host
  transcript = "";
  setState("listening");
  talkBtn.classList.add("active");
  try {
    recognizer.start();
  } catch {
    /* already started */
  }
}

function stopTalking() {
  if (state === "listening" && recognizer) recognizer.stop();
}

// ---------- Controls ----------
$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("ask-input");
  ask(input.value);
  input.value = "";
});
talkBtn.addEventListener("pointerdown", startTalking);
talkBtn.addEventListener("pointerup", stopTalking);
talkBtn.addEventListener("pointerleave", stopTalking);
$("kill-btn").addEventListener("click", kill);
$("reset-btn").addEventListener("click", async () => {
  kill();
  await fetch("/api/reset", { method: "POST" });
  captionEl.textContent = "";
  heardEl.textContent = "";
  setState("idle", "New show started. Sophia's memory is cleared.");
});

const typing = () => document.activeElement === $("ask-input");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return kill();
  if (typing()) return;
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    startTalking();
  } else if (e.key === "s" || e.key === "S") document.body.classList.toggle("stage-mode");
  else if (e.key === "c" || e.key === "C") document.body.classList.toggle("no-captions");
  else if (e.key === "g" || e.key === "G") document.body.classList.toggle("green");
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && !typing()) {
    e.preventDefault();
    stopTalking();
  }
});

fetch("/api/config")
  .then((r) => r.json())
  .then((cfg) => {
    useEleven = cfg.elevenlabs;
    setState("idle", `Ready. Voice: ${useEleven ? "ElevenLabs" : "browser (add ElevenLabs key for Sophia's real voice)"}.`);
  })
  .catch(() => setState("idle", "Jarvis server not reachable."));
