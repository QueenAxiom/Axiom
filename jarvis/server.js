// Jarvis: local server for Sophia's voice loop.
// Serves the stage page, streams Claude replies, and proxies ElevenLabs TTS so API keys stay off the browser.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = process.env.CLAUDE_EFFORT || "low";
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID || "";
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

const SYSTEM = fs.readFileSync(path.join(here, "sophia-prompt.md"), "utf8");
const client = new Anthropic();

// One running conversation per show. Append-only; /api/reset starts a new one.
let history = [];

const STATIC = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["public/style.css", "text/css; charset=utf-8"],
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 100_000) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function handleChat(req, res) {
  const { text } = await readBody(req);
  if (!text || typeof text !== "string") return sendJson(res, 400, { error: "text required" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  history.push({ role: "user", content: text });

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    cache_control: { type: "ephemeral" },
    output_config: { effort: EFFORT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: history,
  });

  // Kill switch: the browser aborts the request, we abort the model call.
  let aborted = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      aborted = true;
      stream.abort();
    }
  });

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send({ type: "text", text: event.delta.text });
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      history.pop();
      send({ type: "refusal" });
    } else {
      history.push({ role: "assistant", content: final.content });
      send({ type: "done" });
    }
  } catch (error) {
    history.pop();
    if (aborted) return;
    let message = "Something went wrong.";
    if (error instanceof Anthropic.AuthenticationError) message = "Claude API key is missing or invalid.";
    else if (error instanceof Anthropic.RateLimitError) message = "Rate limited. Try again in a moment.";
    else if (error instanceof Anthropic.APIError) message = `Claude API error ${error.status}.`;
    console.error(error);
    send({ type: "error", message });
  }
  res.end();
}

async function handleTts(req, res) {
  if (!ELEVEN_KEY || !ELEVEN_VOICE) return sendJson(res, 501, { error: "ElevenLabs not configured" });
  const { text } = await readBody(req);
  if (!text) return sendJson(res, 400, { error: "text required" });

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVEN_VOICE)}/stream`,
    {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: ELEVEN_MODEL }),
    },
  );
  if (!upstream.ok) {
    console.error("ElevenLabs error", upstream.status, await upstream.text());
    return sendJson(res, 502, { error: `ElevenLabs error ${upstream.status}` });
  }
  res.writeHead(200, { "Content-Type": "audio/mpeg" });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      res.writeHead(200, { "Content-Type": type });
      return fs.createReadStream(path.join(here, file)).pipe(res);
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJson(res, 200, { elevenlabs: Boolean(ELEVEN_KEY && ELEVEN_VOICE), model: MODEL });
    }
    if (req.method === "POST" && url.pathname === "/api/chat") return await handleChat(req, res);
    if (req.method === "POST" && url.pathname === "/api/tts") return await handleTts(req, res);
    if (req.method === "POST" && url.pathname === "/api/reset") {
      history = [];
      return sendJson(res, 200, { ok: true });
    }
    sendJson(res, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: "server error" });
    else res.end();
  }
});

// Localhost only: this page holds the mic and spends API money.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Jarvis is up: http://localhost:${PORT}  (model ${MODEL}, voice ${ELEVEN_KEY ? "ElevenLabs" : "browser"})`);
});
