// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .crm — message recipe inspector (port HIROBOT crm.js): reply pesan apapun →
// keluar kode JS buat re-create pesan itu via relayMessage. Engine toCode verbatim Hiro.
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "crm",
  alias: ["copyrelay"],
  category: "tools",
  description: "Ambil kode resep pesan yang di-reply (bisa re-create pesan apapun)",
  usage: ".crm (reply pesan)",
  example: ".crm (reply pesan button/sticker)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const IDENT = /^[A-Za-z_$][\w$]*$/;
const DROP_CTX = ["deviceListMetadata", "messageSecret"];
const CACHE_MAX = 300;
const cache = (globalThis.__crmCache ||= new Map());

const clone = (v) => { try { return structuredClone(v); } catch { return v; } };

function hook(conn) {
  if (!conn || conn.relayMessage?.__crm) return;
  const orig = conn.relayMessage;
  const wrapped = async function (jid, message, opts = {}) {
    const id = await orig.call(this, jid, message, opts);
    const key = typeof id === "string" ? id : opts?.messageId;
    if (key) {
      cache.set(key, clone(message));
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    }
    return id;
  };
  wrapped.__crm = true;
  conn.relayMessage = wrapped;
}

const isLong = (v) => v && typeof v === "object" && typeof v.low === "number" && typeof v.high === "number";
const longToNum = (v) => {
  if (typeof v.toNumber === "function") return v.toNumber();
  const big = (BigInt(v.high >>> 0) << 32n) | BigInt(v.low >>> 0);
  return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
};

const decodeUnifiedResponse = (b64) => {
  try { return JSON.parse(Buffer.from(b64, "base64").toString("utf8")); } catch { return null; }
};

function collectBigBuffers(value, out, key = "") {
  if (value == null) return;
  let buf;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) buf = Buffer.from(value);
  else if (value.type === "Buffer" && Array.isArray(value.data)) buf = Buffer.from(value.data);
  if (buf) {
    if (buf.length > 2 * 1024) out.set(buf.toString("base64"), buf);
    return;
  }
  if (typeof value === "string") {
    if (key === "data") {
      const decoded = decodeUnifiedResponse(value);
      if (decoded && typeof decoded === "object") collectBigBuffers(decoded, out, key);
    }
    return;
  }
  if (Array.isArray(value)) { for (const v of value) collectBigBuffers(v, out, key); return; }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "function") continue;
      if ((k === "messageContextInfo" || key === "messageContextInfo") && DROP_CTX.includes(k)) continue;
      collectBigBuffers(v, out, k);
    }
  }
}

function guessExt(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.slice(0, 4).toString("ascii") === "RIFF") return "webp";
  return "bin";
}

export function toCode(value, opts = {}, indent = 0, key = "") {
  const pad = "\t".repeat(indent + 1);
  const end = "\t".repeat(indent);
  if (value == null) return undefined;
  if (typeof value === "bigint") return value.toString() + "n";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    if (key === "data") {
      const decoded = decodeUnifiedResponse(value);
      if (decoded && typeof decoded === "object") {
        const code = toCode(decoded, opts, indent, key);
        if (code !== undefined) return code;
      }
    }
    return JSON.stringify(value);
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    if (!value.length) return undefined;
    return bufferToCode(Buffer.from(value), opts);
  }
  if (value.type === "Buffer" && Array.isArray(value.data)) {
    if (!value.data.length) return undefined;
    return bufferToCode(Buffer.from(value.data), opts);
  }
  if (isLong(value)) return String(longToNum(value));
  if (Array.isArray(value)) {
    const items = value.map((v) => toCode(v, opts, indent + 1, key)).filter((v) => v !== undefined);
    if (!items.length) return undefined;
    return "[\n" + items.map((v) => pad + v).join(",\n") + "\n" + end + "]";
  }
  if (typeof value === "object") {
    const lines = [];
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "function") continue;
      if (k === "messageContextInfo" || key === "messageContextInfo") {
        if (DROP_CTX.includes(k)) continue;
      }
      const code = toCode(v, opts, indent + 1, k);
      if (code === undefined) continue;
      lines.push(pad + (IDENT.test(k) ? k : JSON.stringify(k)) + ": " + code);
    }
    if (!lines.length) return "{}";
    return "{\n" + lines.join("\n") + "\n" + end + "}";
  }
  return undefined;
}

function bufferToCode(buf, opts) {
  if (buf.length > 2 * 1024 && opts.urls) {
    const url = opts.urls.get(buf.toString("base64"));
    if (url) return "await _fetchBuf('" + url + "')";
  }
  return "Buffer.from('" + buf.toString("base64") + "', 'base64')";
}

const contentType = (msg) =>
  Object.keys(msg || {}).find((k) => k !== "messageContextInfo" && msg[k] != null);

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  hook(sock);
  try {
    await m.react("🧠");
    if (!m.quoted) {
      await m.react("🐣");
      await m.reply(novaGuide(
        "crm",
        "Reply pesan yang mau diambil kodenya — keluar kode JS buat re-create pesan itu (port HIROBOT).",
        prefix + "crm (reply pesan button/kartu/sticker)",
        "Berguna buat bikin pesan format rumit: kirim contohnya, ambil resepnya, edit."
      ));
      return { handled: true };
    }
    const qid = m.quoted.id || m.quoted.key?.id;
    let message = qid ? cache.get(qid) : null;
    if (!message) {
      const stored = sock.loadMessage?.(m.quoted.sender, qid) || sock.loadMessage?.(qid);
      message = stored?.message;
    }
    if (!message) {
      const raw = m.msg?.contextInfo?.quotedMessage;
      const t = contentType(raw);
      if (t && !(t === "conversation" && !raw.conversation)) message = raw;
    }
    if (!message) {
      await m.react("❌");
      await m.reply(novaError("CRM", "Isi pesan gak ketemu — pesan ini dikirim sebelum crm aktif, kirim ulang pesannya lalu coba lagi"));
      return { handled: true };
    }
    const bigBuffers = new Map();
    collectBigBuffers(message, bigBuffers);
    const urls = new Map();
    const upload = global.scraper?.upload?.default || null;
    if (bigBuffers.size && upload) {
      await Promise.all([...bigBuffers.entries()].map(async ([b64, buf]) => {
        try {
          const url = await upload(buf, "crm_" + Date.now() + "." + guessExt(buf));
          if (url) urls.set(b64, url);
        } catch (e) { console.error("[crm] upload gagal, inline base64:", e.message); }
      }));
    }
    const body = toCode(message, { urls }, 0);
    const code = "await sock.relayMessage(m.chat, " + body + ", {})";
    const needsFetch = code.includes("_fetchBuf(");
    const header = needsFetch ? "const _fetchBuf = async url => Buffer.from(await (await fetch(url)).arrayBuffer())\n\n" : "";
    const out = header + code + "\n";
    const MAX = 60000;
    for (let i = 0; i < out.length; i += MAX) {
      await sock.sendMessage(m.chat, { text: out.slice(i, i + MAX) }, { quoted: m });
    }
    await m.react("⚡");
  } catch (error) {
    console.error("[crm]:", error.message);
    await m.react("❌");
    await m.reply(novaError("CRM", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
