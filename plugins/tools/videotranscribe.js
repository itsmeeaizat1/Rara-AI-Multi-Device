// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
import crypto from "crypto";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "videotranscribe",
  alias: ["videotranscribe", "video"],
  category: "tools",
  description: "Transkrip video dari URL menjadi teks (YouTube, mp4, dll)",
  usage: ".video-transcribe <url> [lang]",
  example: ".video-transcribe https://youtu.be/dQw4w9WgXcQ\n.video-transcribe https://youtu.be/dQw4w9WgXcQ id",
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

const ENDPOINT = "https://api.proactor.ai:7788/v1/tourists/files/transcription";
const DEFAULT_LANG = "en";

const HEADERS = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  origin: "https://videotranscriber.ai",
  referer: "https://videotranscriber.ai/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
};

function makeTrackId() {
  return `${crypto.randomUUID()}_${Date.now()}`;
}

function msToTime(ms = 0) {
  const total = Math.floor(Number(ms) / 1000);
  const minute = Math.floor(total / 60);
  const second = total % 60;
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function joinTranscript(items = []) {
  return items
    .map((item) => item?.text || "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanResult(input, json) {
  const data = Array.isArray(json?.data) ? json.data : [];
  if (json?.code !== 200 || data.length === 0) {
    return {
      status: false,
      code: json?.code || 500,
      message: json?.msg || json?.message || "Transcript tidak ditemukan",
    };
  }
  const title = data.find((item) => item?.videoTitle)?.videoTitle || "No title";
  const segments = data.map((item, index) => ({
    index: index + 1,
    startMs: item?.duration ?? null,
    start: msToTime(item?.duration || 0),
    text: item?.text || "",
  }));
  return {
    status: true,
    title,
    total: segments.length,
    transcript: joinTranscript(data),
    segments,
  };
}

async function transcriber(url, language = DEFAULT_LANG) {
  if (!url || !/^https?:\/\//i.test(String(url))) {
    throw new Error("URL kosong / tidak valid");
  }
  const body = {
    track_id: makeTrackId(),
    fileUrl: url,
    language: language,
  };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON: " + text.slice(0, 200));
  }
  const result = cleanResult(url, json);
  if (!result.status) throw new Error(result.message);
  return result;
}

async function handler(m, { sock,  args }) {
  const url = args[0];
  const lang = args[1] || DEFAULT_LANG;

  if (!url) {
    return m.reply(
      `*📝 VIDEO TRANSCRIBE*\n\n\`\`\`${m.prefix}video-transcribe <url_video> [bahasa]\`\`\`\n\nContoh:\n\`${m.prefix}video-transcribe https://youtu.be/... id\``
    );
  }
  try {
    await m.react("🕒");
    const result = await transcriber(url, lang);
    
    let transcript = result.transcript.substring(0, 2500);
    if (result.transcript.length > 2500) {
      transcript += `... (teks terlalu panjang)`;
    }

    const info = novaWrap("Video Transcribe", [`*title:* ${result.title}`, `*language:* ${lang.toUpperCase()}`, `*segments:* ${result.total}`, ``, `*transcript:*`, transcript].join("\n"));
    await m.react("🐣");
    await m.reply(info);
  } catch (err) {
    await m.react("❌");
    console.error("[VideoTranscribe]", err.message);
    m.reply(novaWrap("videotranscribe", `❌ *gagal:* ${err.message || "Gagal proses nih video"}`));
  }
}

export { pluginConfig as config, handler };
