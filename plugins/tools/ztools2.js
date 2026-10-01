// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .ztools2 — BACKUP z-variant tools zelapi (owner 15 Sep 2026:
//   "z di depan = cadangan, meski bot udah punya fiturnya").
// 🔹 Live verified: QR (text→QR, QR→text), morse, kurs USD→IDR,
//   shortlink, tinyurl, ephoto360 (30 efek), whatanime, img2prompt,
//   gist, pastebin.
// 🔹 MATI server-side (gak dipasang): translate, removebg, toanime,
//   enchane, wink, ssweb, ytplay, agedetect, dipastebin.
// ═════════════════════════════════════════════

import {
  zelToolCall, ZEL_EPHOTO_EFFECTS,
  _setZelToolsHttpForTest, _setZelToolsKeyForTest,
} from "../../src/scraper/zeltools.js";
import { uploadToUguu } from "../../src/scraper/kuroneko.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ztools2",
  alias: ["zqr", "ztext2qr", "zreadqr", "zqr2text", "zmorse", "zkurs", "zshortlink", "ztinyurl", "zepho", "zwhatanime", "zimg2prompt", "zgist", "zpastebin"],
  category: "tools",
  description: "Backup z-variant tools zelapi — QR, morse, kurs, shortlink, ephoto, whatanime dll",
  usage: ".ztools2 — daftar | .zqr <teks> | .zreadqr (reply qr) | .zepho <efek> <teks> | dst",
  example: ".zqr halo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 400) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

// gambar dari reply (pola tanaman/lens) → buffer
async function imageFromReply(m) {
  const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;
  if (!isPhoto) return null;
  try {
    return m.quoted?.isImage ? await m.quoted.download() : await m.download();
  } catch { return null; }
}
async function imageUrlFromReply(m) {
  const buf = await imageFromReply(m);
  if (!buf || !buf.length) return null;
  return uploadToUguu(buf, "img.jpg");
}

async function fetchImg(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function usageCard() {
  return raraWrap("ztools2", [
    "🧰 ZELAPI TOOLS — BACKUP (z-variant):",
    "",
    "▸ .zqr <teks> — bikin QR code",
    "▸ .zreadqr — reply gambar QR → dibaca jadi teks",
    "▸ .zmorse <teks> — teks → kode morse + kartu",
    "▸ .zkurs [jumlah] — kurs USD → IDR",
    "▸ .zshortlink <url> — pendekin link (CDN zelapi, 2 jam)",
    "▸ .ztinyurl <url> — pendekin link (tinyurl)",
    "▸ .zepho <efek> <teks> — 30 efek ephoto360 (.zepho list)",
    "▸ .zwhatanime — reply screenshot anime → judulnya",
    "▸ .zimg2prompt — reply gambar → prompt AI-nya",
    "▸ .zgist <url> — ekstrak isi gist",
    "▸ .zpastebin <url> — ekstrak isi pastebin",
    "",
    "semuanya backup dari fitur utama bot — server zelapi kadang bisa beda nasib.",
  ].join("\n"));
}

function cardWhatanime(d) {
  const rs = d?.result?.results || d?.results || [];
  if (!rs.length) return null;
  const lines = [];
  rs.slice(0, 3).forEach((r0, i) => {
    const a = r0?.anilist || {};
    const title = a?.title?.romaji || a?.title?.english || a?.title?.native || v(a?.id);
    if (!title) return;
    const row = [`${i === 0 ? "🎯" : "▸"} ${title}`];
    if (r0.episode) row.push(`ep ${r0.episode}`);
    if (r0.similarity) row.push(`${Math.round(r0.similarity * 100)}% cocok`);
    lines.push(row.join(" · "));
    if (i === 0 && a.id) lines.push(`   anilist.co/anime/${a.id}`);
  });
  return lines.length ? lines.join("\n") : null;
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    if (command === "ztools2") return m.reply(usageCard());

    let kind = null;
    if (command === "zqr" || command === "ztext2qr") kind = "qr";
    else if (command === "zreadqr" || command === "zqr2text") kind = "readqr";
    else if (command === "zmorse") kind = "morse";
    else if (command === "zkurs") kind = "kurs";
    else if (command === "zshortlink") kind = "shortlink";
    else if (command === "ztinyurl") kind = "tinyurl";
    else if (command === "zepho") kind = "ephoto";
    else if (command === "zwhatanime") kind = "whatanime";
    else if (command === "zimg2prompt") kind = "img2prompt";
    else if (command === "zgist") kind = "gist";
    else if (command === "zpastebin") kind = "pastebin";
    if (!kind) return m.reply(usageCard());

    // .zepho list — daftar efek
    if (kind === "ephoto" && ["list", "efek", "menu"].includes((args[0] || "").toLowerCase())) {
      return m.reply(raraWrap("ztools2", "🎨 EPHOTO360 — 30 efek:\n\n" + ZEL_EPHOTO_EFFECTS.map((e) => "▸ " + e).join("\n") + "\n\npakai: .zepho <efek> <teks>"));
    }

    let params = {};
    if (kind === "qr" || kind === "morse") {
      params = { text: args.join(" ").trim() };
    } else if (kind === "kurs") {
      params = { amount: (args[0] || "1").replace(/[^0-9.]/g, "") || "1" };
    } else if (kind === "shortlink" || kind === "tinyurl") {
      params = { url: args.join(" ").trim() };
    } else if (kind === "ephoto") {
      params = { effect: (args[0] || "").toLowerCase(), text: args.slice(1).join(" ").trim() };
    } else if (kind === "gist" || kind === "pastebin") {
      params = { url: args.join(" ").trim() };
    } else if (kind === "readqr" || kind === "whatanime" || kind === "img2prompt") {
      await m.react("🧠");
      const rawUrl = args.join(" ").trim();
      let url = rawUrl;
      if (!url || !/^https?:\/\//.test(url)) {
        const up = await imageUrlFromReply(m);
        if (!up) {
          await m.react("❌");
          return m.reply(raraWrap("ztools2", kind === "readqr" ? "Reply gambar QR-nya, atau kirim URL gambarnya" : "Reply gambarnya, atau kirim URL gambarnya"));
        }
        url = up;
      }
      params = { url };
    }

    if (!params.url && !params.text && !params.amount && !params.effect && !params.code) {
      await m.react("❌");
      return m.reply(raraWrap("ztools2", `Input kosong — cek *.${command}* di daftar .ztools2`));
    }

    if (!m.reacts || !m.reacts.length) await m.react("🧠");
    const r = await zelToolCall(kind, params);
    if (!r.ok) {
      await m.react("❌");
      return m.reply(raraWrap("ztools2", `Backup ${kind} zelapi bermasalah: ${r.error}`));
    }
    const d = r.data;

    if (kind === "qr") {
      await sock.sendMessage(m.chat, { image: r.buffer, caption: "_(QR via zelapi)_" }, { quoted: m });
    } else if (kind === "readqr") {
      const txt = d?.data?.text || d?.result?.text;
      if (!txt) { await m.react("❌"); return m.reply(raraWrap("ztools2", "QR gak kebaca — pastikan gambarnya jelas")); }
      await m.reply(raraWrap("ztools2", "✅ QR DIBACA (zelapi)\n\n📝 " + txt));
    } else if (kind === "morse") {
      const lines = [];
      if (v(d.morse)) lines.push("📡 " + d.morse);
      if (v(d.chart)) lines.push("", short(d.chart, 400));
      await m.reply(raraWrap("ztools2", "✅ MORSE (zelapi)\n\n" + lines.join("\n")));
    } else if (kind === "kurs") {
      await m.reply(raraWrap("ztools2", "✅ KURS (zelapi)\n\n💱 " + (v(d.message) || `${d.originalAmount} USD = ${d.convertedAmount} IDR`) + (v(d.rate) ? `\n📊 rate ${Number(d.rate).toLocaleString("id-ID")}` : "") + (v(d.date) ? `\n📅 ${d.date}` : "")));
    } else if (kind === "shortlink") {
      await m.reply(raraWrap("ztools2", "✅ SHORTLINK (zelapi)\n\n🔗 " + (v(d.result) || v(d.short)) + (v(d.expired_at) ? `\n🕒 aktif ${d.expired_at}` : "")));
    } else if (kind === "tinyurl") {
      await m.reply(raraWrap("ztools2", "✅ TINYURL (zelapi)\n\n🔗 " + (v(d.result) || v(d.url))));
    } else if (kind === "ephoto") {
      const url = v(d.result) || (typeof d?.result === "object" ? v(d.result?.url) : null);
      if (!url || !/^https?:\/\//.test(url)) { await m.react("❌"); return m.reply(raraWrap("ztools2", "Efek ephoto gagal — coba lagi / efek lain (.zepho list)")); }
      const buf = await fetchImg(url);
      await sock.sendMessage(m.chat, { image: buf, caption: `_(ephoto360 ${params.effect} via zelapi)_` }, { quoted: m });
    } else if (kind === "whatanime") {
      const card = cardWhatanime(d);
      if (!card) { await m.react("❌"); return m.reply(raraWrap("ztools2", "Gak nemu anime dari gambar itu — coba screenshot scene yang lebih jelas")); }
      await m.reply(raraWrap("ztools2", "✅ WHATANIME (zelapi)\n\n" + card));
    } else if (kind === "img2prompt") {
      const prompt = v(d?.result?.prompt) || v(d?.prompt);
      if (!prompt) { await m.react("❌"); return m.reply(raraWrap("ztools2", "Prompt gak kehasil — coba gambar lain")); }
      await m.reply(raraWrap("ztools2", "✅ IMAGE → PROMPT (zelapi)\n\n📝 " + short(prompt, 900)));
    } else if (kind === "gist" || kind === "pastebin") {
      const files = d?.files;
      if (files && typeof files === "object" && !Array.isArray(files)) {
        const names = Object.keys(files);
        const lines = [`✅ ${kind === "gist" ? "GIST" : "PASTEBIN"} (zelapi)`, "", `📄 ${names.length} file: ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}`];
        const first = names[0];
        const content = String(files[first] || "");
        if (content) {
          if (content.length <= 3000) lines.push("", `── ${first} ──`, short(content, 2800));
          else {
            lines.push("", "isi lengkap nyusul sebagai file…");
            await m.reply(raraWrap("ztools2", lines.join("\n")));
            await sock.sendMessage(m.chat, { document: Buffer.from(content, "utf-8"), fileName: first.replace(/[\\/:*?"<>|]/g, "_"), mimetype: "text/plain", caption: "_(via zelapi)_" }, { quoted: m });
            return m.react("🐣");
          }
        }
        await m.reply(raraWrap("ztools2", lines.join("\n")));
      } else {
        const content = v(d?.content) || v(d?.result) || v(d?.text);
        if (!content) { await m.react("❌"); return m.reply(raraWrap("ztools2", v(d?.message) || v(d?.error) || "Isi paste gak keambil — cek URL-nya")); }
        if (content.length <= 3000) await m.reply(raraWrap("ztools2", `✅ ${kind.toUpperCase()} (zelapi)\n\n${short(content, 2800)}`));
        else {
          await m.reply(raraWrap("ztools2", `✅ ${kind.toUpperCase()} (zelapi) — ${content.length.toLocaleString("id-ID")} karakter, file nyusul…`));
          await sock.sendMessage(m.chat, { document: Buffer.from(content, "utf-8"), fileName: `${kind}-content.txt`, mimetype: "text/plain", caption: "_(via zelapi)_" }, { quoted: m });
        }
      }
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("ztools2", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
