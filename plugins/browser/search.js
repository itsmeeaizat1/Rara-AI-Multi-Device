// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// search — web search multi-engine + preview halaman (request owner 2026-09-10:
// ".serach jd klo user ketik serach doang g ada google/bing/search engine lain
//  muncul usage. .serach list nama search engine. contoh .serach bing daftar
//  hp terkenal brarti pakai mesin search bing").
// Command: .search <engine> <query> → list 1..N (+ popup tap)
//          .search <nomor> | buka <nomor> → preview halaman
//          .search list → daftar mesin search
import {
  searchWeb,
  fetchPagePreview,
  listEngines,
  saveSearchSession,
  getSearchSession,
} from "../../src/lib/rara-websearch.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "search",
  alias: ["serach", "googlesearch", "googleserach", "searchweb", "websearch", "gsearch", "gsweb", "caridweb", "gogleserach"],
  category: "browser",
  description: "Nyari web pake mesin pilihan (bing/brave/duckduckgo) — list 1..N, ketik nomor buat buka preview halaman",
  usage: ".search <engine> <query> | .search list | .search <nomor>",
  example: ".search bing daftar hp terkenal",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

const READMORE = "\u200E".repeat(4001);
const ENGINE_KEYS = ["bing", "brave", "duckduckgo", "google", "baidu", "sogou"];

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function engineListText(prefix) {
  return raraWrap("Google Search", [
    `🔍 *MESIN SEARCH TERSEDIA*`,
    ``,
    ...listEngines().map((e) => `• *${e.key}* — ${e.note}`),
    ``,
    `📌 *Cara pakai:*`,
    `${prefix}search <mesin> <yang dicari>`,
    `Contoh: ${prefix}search bing daftar hp terkenal`,
    ``,
    `Setelah list muncul: ${prefix}search 2 (buka hasil #2)`,
    `— preview thumbnail + isi halaman + readmore`,
  ]);
}

async function handleSearch(m, sock, query, engine) {
  const r = await searchWeb(query, { engine });
  if (r.error || !r.items.length) {
    await m.react("❌");
    return m.reply(raraWrap("Google Search", [
      `❌ ${r.error || "hasil gak ketemu"}.`,
      ``,
      `💡 Coba kata kunci lain / mesin lain (${ENGINE_KEYS.join(", ")}).`,
    ]));
  }
  saveSearchSession(m.chat, query, r.items);

  const srcNote = r.engineNote
    ? `\n📡 *${r.source}* (google dialihkan — google ngeblok bot)`
    : `\n📡 Mesin: *${r.source}* • ${r.items.length} hasil`;
  const lines = r.items.map((it, i) =>
    `${i + 1}. *${it.title.slice(0, 60)}*\n   🔗 ${domainOf(it.url)}` +
    (it.snippet ? `\n   💬 ${it.snippet.slice(0, 90)}` : "")
  );
  const text = raraWrap("Google Search", [
    `🔎 *${query}*`,
    srcNote.trim(),
    ``,
    ...lines,
    ``,
    `💡 Ketik *${m.prefix}search <nomor>* buat buka halamannya`,
    `(contoh: ${m.prefix}search 2) — hasil nyimpen 15 menit`,
  ]);

  // popup tap-list (tap = auto-run ${prefix}search buka <n>)
  try {
    await sock.sendButton(m.chat, null, text, m, {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Buka Halaman",
            sections: [{
              title: "Hasil Pencarian",
              rows: r.items.slice(0, 10).map((it, i) => ({
                title: it.title.slice(0, 25),
                description: domainOf(it.url),
                id: `${m.prefix}search buka ${i + 1}`,
              })),
            }],
          }),
        },
      ],
    });
  } catch {
    await m.reply(text);
  }
  await m.react("🐣");
}

async function handleOpen(m, sock, num) {
  const sess = getSearchSession(m.chat);
  if (!sess) {
    await m.react("❌");
    return m.reply(raraWrap("Google Search", [
      `❌ Belum ada hasil pencarian di chat ini (atau udah kedaluwarsa 15 menit).`,
      ``,
      `Cari dulu: *${m.prefix}search <engine> <query>*`,
      `Contoh: ${m.prefix}search bing daftar hp terkenal`,
    ]));
  }
  const idx = num - 1;
  if (idx < 0 || idx >= sess.items.length) {
    await m.react("❌");
    return m.reply(raraWrap("Google Search", [
      `❌ Nomor ${num} gak ada — hasil cuma 1 s/d ${sess.items.length} buat pencarian "${sess.query}".`,
    ]));
  }

  await m.react("🕒");
  const item = sess.items[idx];
  const p = await fetchPagePreview(item.url);
  if (p.error) {
    await m.react("❌");
    return m.reply(raraWrap("Google Search", [
      `❌ ${p.error}`,
      ``,
      `🔗 ${item.url}`,
      `💡 Buka link-nya langsung aja ya.`,
    ]));
  }

  const body =
    `📄 *${p.title}*\n` +
    `🔗 ${p.url}\n` +
    (p.description ? `\n📝 ${p.description}\n` : "") +
    `\n📖 *ISI HALAMAN:*${READMORE}\n${p.text || p.description}\n\n` +
    `📡 Hasil #${num} dari "${sess.query}"`;

  await sock.sendMessage(m.chat, {
    text: body,
    contextInfo: mediaPreviewCard({
      title: p.title,
      body: domainOf(p.url),
      sourceUrl: p.url,
      thumbnailUrl: p.image || "",
      mediaType: 2,
      renderLarger: true,
    }),
  }, { quoted: m });
  await m.react("🐣");
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const text = args.join(" ").trim();
  const prefix = m.prefix || ".";

  if (!text) {
    // user ketik .search doang → usage + daftar mesin
    return m.reply(raraGuide("search",
      "Nyari web — pilih mesin search dulu, hasil jadi list 1..N, ketik nomor buat lihat isi halaman.",
      `${prefix}search bing daftar hp terkenal`,
      `Mesin tersedia: ${ENGINE_KEYS.join(", ")}. Lihat ${prefix}search list buat detailnya.`));
  }

  // .search list → daftar mesin search
  if (/^(list|mesin|engine)$/i.test(args[0]) && args.length === 1) {
    return m.reply(engineListText(prefix));
  }

  // buka hasil: ".search buka 3" / ".search 3"
  if (/^buka$/i.test(args[0])) {
    if (!args[1] || !/^\d+$/.test(args[1])) {
      await m.react("❌");
      return m.reply(raraWrap("Google Search", [`Format: *${prefix}search buka <nomor>*`]));
    }
    return handleOpen(m, sock, parseInt(args[1], 10));
  }
  if (/^\d+$/.test(args[0]) && args.length === 1) {
    return handleOpen(m, sock, parseInt(args[0], 10));
  }

  // ".search <engine> <query>" — engine dikenali? kalau gak, semua teks = query (engine default bing)
  let engine = "bing";
  let query = text;
  if (ENGINE_KEYS.includes(args[0].toLowerCase()) && args.length >= 2) {
    engine = args[0].toLowerCase();
    query = args.slice(1).join(" ").trim();
  }

  await m.react("🕒");
  return handleSearch(m, sock, query, engine);
}

export { pluginConfig as config, handler };
