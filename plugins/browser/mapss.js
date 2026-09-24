// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mapss.js — Cari tempat di Google Maps + screenshot + buka per nomor.
// Request owner 24 Sep 2026 (pilihan jalur 2, tanpa API key SerpApi):
// "pas gunakan fiturnya, contoh pencarian web hasilnya screenshot dulu
//  yg dikirim duluan abis itu versi plain textnya dikirim, jd tinggal
//  balas kita ketik mau no page brapa yg mau diklik 1 sampai berapa.
//  klo misal klik 2, halaman web 2 kebuka: screenshot isi halaman webnya
//  dan plain textnya isi halaman tersebut pakai %readmore dan chat
//  lanjutan biar teks yg gak muat krna input teks limit, kyk cara kerja
//  ai agent."
// ALUR:
//   .mapss <query>  → [1] screenshot hasil Maps (dikirim duluan)
//                     [2] plain text list bernomor (pesan kedua)
//   balas "2"       → halaman place no.2 kebuka:
//                     [1] screenshot isi halaman place
//                     [2] plain text isi (readmore + chat lanjutan)
//   balas "stop"    → keluar sesi
// Engine: src/scraper/nova-maps-browser.js (chromium bersama, data ASLI).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { splitChatChunks } from "../../src/lib/aiagent.js";
import {
  mapsScreenshotSearch, mapsPlaceDetail, parseMapCoords,
  registerMapsChoice, takeMapsChoice, getMapsSession, clearMapsChoice,
} from "../../src/scraper/nova-maps-browser.js";

const pluginConfig = {
  name: "mapss",
  alias: ["mapss", "mapsearch", "googlemaps", "caritempat"], // gmaps milik sapimaps
  category: "browser",
  description: "Cari tempat di Google Maps — screenshot hasil dikirim duluan, lalu list plain text; balas nomor untuk buka halaman tempatnya (screenshot + isi)",
  usage: ".mapss <tempat>",
  example: ".mapss cafe di jakarta · lalu balas nomor 1-8",
  cooldown: 10,
  isEnabled: true,
};

// readmore invisible (pola plugins/tools/readmore.js) — konten panjang
// ke-collapse jadi "… read more" di preview WA
const READMORE = String.fromCharCode(8206).repeat(4001);

function fmtPlace(i, p) {
  const reviews = String(p.reviews || "").replace(/[()]/g, "").trim(); // "(5.896)" → "5.896"
  const stars = p.rating
    ? `${p.rating}${reviews ? ` (${reviews} ulasan)` : ""}`
    : "belum ada rating";
  const meta = p.meta ? `\n    📍 ${p.meta}` : "";
  const hours = p.hours ? `\n    🕒 ${p.hours}` : "";
  return `${i}. ${p.name}\n    ⭐ ${stars}${meta}${hours}`;
}

async function handler(m, { sock }) {
  const query = (m.text || "").trim();

  if (!query) {
    return m.reply(claraWrap("Google Maps Search", [
      `Cari tempat di Google Maps — hasil di-screenshot + list plain text.`,
      ``,
      `📌 Format: ${m.prefix}mapss <tempat>`,
      `💡 Contoh:`,
      `     ${m.prefix}mapss cafe di jakarta`,
      `     ${m.prefix}mapss minimarket terdekat`,
      ``,
      `Setelah hasil muncul, tinggal *balas nomor* (1-8) buat buka halaman tempatnya.`,
    ]));
  }

  try {
    await m.react("🕒");
    const { image, places } = await mapsScreenshotSearch(query, { limit: 8 });

    // [1] screenshot duluan — caption ringkas
    const shotCap = `📸 Hasil Maps: "${query}" — list lengkap di pesan berikutnya.`;
    await sock.sendMedia(m.chat, image, shotCap, m, { type: "image" });

    // [2] plain text list bernomor
    const pickable = places.filter((p) => p.url);
    if (pickable.length) registerMapsChoice(m.chat, pickable);

    const lines = [];
    if (places.length) {
      lines.push(`Hasil "${query}": ${places.length} tempat`);
      lines.push("");
      places.forEach((p, i) => lines.push(fmtPlace(i + 1, p)));
      if (pickable.length) {
        lines.push("", `👉 *Balas nomor 1-${pickable.length}* buat buka halaman tempatnya (screenshot + isi).`);
        lines.push(`Balas "stop" buat batal sesi. Berlaku 20 menit.`);
      } else {
        lines.push("", `⚠️ Link halaman gak ke-ekstrak — detail per tempat gak bisa dibuka, lihat screenshot ya.`);
      }
    } else {
      lines.push(`Screenshot hasil pencarian "${query}" — list tempat gak bisa diekstrak dari DOM (tampilan Maps berubah), lihat gambar ya.`);
    }
    await m.reply(claraWrap("Google Maps Search", lines.join("\n")));
    await m.react("⚡");
  } catch (error) {
    await m.react("❌");
    return m.reply(claraWrap("Google Maps Search", te(m.prefix, m.command, m.pushName), "error"));
  }
}

// ringkasan detail → baris-baris rapi (pesan plain text pertama)
function detailSummary(d, n) {
  const reviews = String(d.reviews || "").replace(/[()]/g, "").trim();
  const out = [`📍 *${d.name || "Tempat"}*  (hasil no. ${n})`, ""];
  if (d.rating) out.push(`⭐ Rating: ${d.rating}${reviews ? ` (${reviews} ulasan)` : ""}`);
  if (d.category) out.push(`🏷️ ${d.category}`);
  if (d.address) out.push(`📌 Alamat: ${d.address}`);
  if (d.phone) out.push(`☎️ Telp: ${d.phone}`);
  if (d.website) out.push(`🌐 ${d.website}`);
  if (d.hours) out.push(`🕒 Jam: ${d.hours}`);
  return out.join("\n");
}

// isi halaman (setelah readmore) — ulasan + teks mentah fallback
function detailContent(d) {
  const out = [];
  if (Array.isArray(d.reviewsList) && d.reviewsList.length) {
    out.push("", "──────────", "💬 *Ulasan:*");
    d.reviewsList.forEach((r, i) => {
      out.push(`${i + 1}. ${r.author ? `*${r.author}* — ` : ""}${r.stars || ""}`);
      out.push(`   "${r.text}"`);
      out.push("");
    });
  }
  return out.join("\n");
}

// ── ANSWER HANDLER: balas nomor → buka halaman place ─────────
export async function answerHandler(m, sock) {
  try {
    const text = String(m.text || "").trim().toLowerCase();
    if (!text) return false;
    if (!getMapsSession(m.chat)) return false; // gak ada sesi → gak urus

    // keluar sesi manual
    if (/^(stop|batal|x|cancel|keluar)$/.test(text)) {
      clearMapsChoice(m.chat);
      await m.reply(claraWrap("Google Maps Search", "Sesi Maps ditutup. Ketik ulang .mapss <tempat> buat cari lagi."));
      return true;
    }

    // cuma angka 1-999 yang dianggap pilihan
    if (!/^\d{1,3}$/.test(text)) return false;
    const n = Number(text);
    const item = takeMapsChoice(m.chat, n);
    if (!item) {
      await m.reply(claraWrap("Google Maps Search", [
        `Nomor ${n} gak ada di hasil pencarian.`,
        `Balas nomor yang bener, atau "stop" buat keluar sesi.`,
      ]));
      return true;
    }

    await m.react("🕒");
    const { image, detail } = await mapsPlaceDetail(item.url);

    // [1] screenshot isi halaman duluan
    const cap = detail?.name
      ? `📸 ${detail.name} — isi halaman lengkap di pesan berikutnya.`
      : `📸 Isi halaman: ${item.name} — detail di pesan berikutnya.`;
    await sock.sendMedia(m.chat, image, cap, m, { type: "image" });

    // [2] plain text isi — ringkasan + readmore + ulasan,
    //     pesan panjang dipecah (chat lanjutan, pola splitChatChunks ai agent)
    const d = detail || {};
    let full = detailSummary(d, n);
    const content = detailContent(d);
    if (content) {
      full += `\n${READMORE}${content}`; // konten ke-collapse "read more" di preview
    } else {
      // ulasan gak ke-ekstrak → fallback teks mentah halaman (dipotong)
      const raw = String(d.rawText || "").slice(0, 3000);
      if (raw) full += `\n${READMORE}${raw}`;
    }
    full += `\n\n🌐 Buka di Maps: ${item.url}`;

    // chunkChars 6000 (standar ai agent) — WAJIB > readmore (4001 char
    // invisible) biar blok readmore gak pernah kepotong antar pesan
    const chunks = splitChatChunks(full, { chunkChars: 6000 });
    for (const chunk of chunks) {
      await sock.sendMessage(m.chat, { text: chunk }, { quoted: m });
    }

    // [3] pin lokasi native WhatsApp (peta interaktif — tap langsung
    // kebuka di app Maps) — koordinat diparse dari URL place Google
    // Maps; gak ketemu → skip senyap (screenshot + teks udah cukup)
    const coords = parseMapCoords(item.url);
    if (coords) {
      await sock.sendMessage(m.chat, {
        location: {
          degreesLatitude: coords.lat,
          degreesLongitude: coords.lng,
          name: d.name || item.name || "Lokasi",
          address: d.address || "",
        },
      }, { quoted: m }).catch(() => {});
    }
    await m.react("⚡");
    return true;
  } catch (error) {
    await m.react("❌").catch(() => {});
    await m.reply(claraWrap("Google Maps Search", te(m.prefix, "mapss", m.pushName), "error")).catch(() => {});
    return true; // sesi mapss aktif → tetap dianggap tertangani
  }
}

export { pluginConfig as config, handler };
export default handler;
