// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ZAI — Chat dengan Z.ai AI assistant (GLM-5.2) via direct API, no Puppeteer needed
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "zai",
  alias: ["z-ai", "zchat", "zaitalk", "glmchat"],
  category: "ai",
  description: "ZAI — Chat dengan Z.ai AI assistant (GLM-5.2) gratis tanpa API key",
  usage: ".zai <prompt>",
  example: ".zai jelaskan cara kerja blockchain\n.zai buatkan puisi tentang laut",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ZAI_BASE = "https://chat.z.ai";
const ZAI_API = "https://chat.z.ai/api/v2/chat/completions";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 9; CPH2083 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.179 Mobile Safari/537.36";

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

// ─── Get session from Z.ai page ─────────────────────────────────

async function getZaiSession() {
  const spoofedIp = generateRandomIP();
  const res = await fetch(ZAI_BASE + "/", {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Forwarded-For": spoofedIp,
      "X-Real-IP": spoofedIp,
      "Client-IP": spoofedIp,
      "True-Client-IP": spoofedIp,
      "X-Originating-IP": spoofedIp,
      "X-Cluster-Client-IP": spoofedIp,
      Forwarded: "for=" + spoofedIp,
    },
  });

  // Extract cookies from response
  const setCookies = res.headers.getSetCookie?.() || [];
  let cookies = "";
  if (setCookies.length > 0) {
    cookies = setCookies.map((c) => c.split(";")[0]).join("; ");
  } else {
    // Fallback: parse from headers
    const rawCookie = res.headers.get("set-cookie");
    if (rawCookie) cookies = rawCookie.split(";")[0];
  }

  // Try to extract any token from page
  const html = await res.text();

  // Look for API token or session token in the page
  let token = null;
  const tokenMatch = html.match(/(?:api[_-]?key|token|csrf|session)["\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/i);
  if (tokenMatch) token = tokenMatch[1];

  // Look for Next.js build ID or API config
  const buildIdMatch = html.match(/buildId["\s:]+["']([^"']+)["']/);
  const buildId = buildIdMatch ? buildIdMatch[1] : null;

  return { cookies, token, buildId };
}

// ─── Chat with Z.ai API (SSE streaming) ──────────────────────────

async function zaiChat(prompt, session) {
  const spoofedIp = generateRandomIP();

  const headers = {
    "Content-Type": "application/json",
    Accept: "text/event-stream,application/json",
    "User-Agent": USER_AGENT,
    Origin: ZAI_BASE,
    Referer: ZAI_BASE + "/",
    "X-Forwarded-For": spoofedIp,
    "X-Real-IP": spoofedIp,
    "Client-IP": spoofedIp,
    "True-Client-IP": spoofedIp,
    "X-Originating-IP": spoofedIp,
    "X-Cluster-Client-IP": spoofedIp,
    Forwarded: "for=" + spoofedIp,
  };

  if (session.cookies) {
    headers["Cookie"] = session.cookies;
  }

  const body = JSON.stringify({
    messages: [
      {
        role: "user",
        content: { text: prompt },
        content_type: "text",
      },
    ],
    model: "glm-5.2",
    stream: true,
  });

  const res = await fetch(ZAI_API, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("Z.ai API error: HTTP " + res.status + (errText ? " - " + errText.substring(0, 200) : ""));
  }

  // Parse SSE stream
  const text = await res.text();
  const lines = text.split("\n");
  let fullResponse = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const dataString = trimmed.substring(5).trim();
    if (!dataString || dataString === "[DONE]") continue;

    try {
      const data = JSON.parse(dataString);

      if (data.data) {
        // Z.ai specific format
        if (data.data.phase === "answer" && data.data.delta_content) {
          fullResponse += data.data.delta_content;
        }
        // Also check for reasoning phase content (optional, skip)
      } else if (data.choices && data.choices[0]) {
        // OpenAI compatible format
        const delta = data.choices[0].delta;
        if (delta && delta.content) {
          fullResponse += delta.content;
        }
      }
    } catch (e) {
      // Skip malformed JSON lines
    }
  }

  if (!fullResponse) {
    // Try non-streaming response
    try {
      const data = JSON.parse(text);
      if (data.choices?.[0]?.message?.content) {
        fullResponse = data.choices[0].message.content;
      } else if (data.data?.answer) {
        fullResponse = data.data.answer;
      } else if (data.message) {
        fullResponse = data.message;
      }
    } catch (e) { console.error('[zai.js]:', e.message); }
  }

  return fullResponse;
}

// ─── Handler ─────────────────────────────────────────────────────

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const prompt = text.trim();
    if (!prompt) {
      return m.reply(claraWrap("ZAI", [
        "Chat dengan Z.ai AI (GLM-5.2) gratis tanpa API key",
        "",
        "CARA PAKAI:",
        usedPrefix + "zai <pertanyaan atau permintaan>",
        "",
        "Contoh:",
        usedPrefix + "zai jelaskan cara kerja blockchain",
        usedPrefix + "zai buatkan puisi tentang laut",
        usedPrefix + "zai apa itu machine learning",
        "",
        "Source: chat.z.ai (GLM-5.2 model)",
      ]));
    }

    m.reply(claraWrap("ZAI", "Z.ai sedang berpikir..."));

    // Get session from Z.ai
    const session = await getZaiSession();

    // Chat with Z.ai
    const answer = await zaiChat(prompt, session);

    if (!answer || answer.trim().length === 0) {
      return m.reply(claraWrap("ZAI", [
        "Z.ai tidak memberikan respons.",
        "Kemungkinan: API sedang maintenance atau rate limited.",
        "Coba lagi dalam beberapa detik.",
      ], "warn"));
    }

    // Trim response if too long
    let responseText = answer.trim();
    if (responseText.length > 4000) {
      responseText = responseText.substring(0, 4000) + "\n\n...(respons dipotong)";
    }

    return m.reply(claraWrap("ZAI", [
      "Z.ai (GLM-5.2)",
      "",
      responseText,
    ], "info"));
  } catch (e) {
    console.error("[ZAI]", e);
    m.reply(claraWrap("ZAI", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. Z.ai sedang maintenance",
      "2. IP diblokir sementara",
      "3. Koneksi timeout",
      "",
      "Coba lagi dalam beberapa detik.",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
