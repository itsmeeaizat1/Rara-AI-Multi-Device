// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
} from "../../src/lib/nova-websearch.js";
import {
  buildRichResponse, sendRichMessage, getWikiSummary, getGoogleSuggest,
} from "../../src/lib/nova-rich-response.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "search",
  alias: ["serach", "googlesearch", "googleserach", "searchweb", "websearch", "gsearch", "gsweb", "caridweb", "gogleserach"],
  category: "browser",
  description: "Nyari web pake mesin pilihan — hasil dirender DI DALAM CHAT ala rich AI (gambar + ringkasan + chips), ketik nomor buat baca halaman",
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
  return claraWrap("Google Search", [
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
    return m.reply(claraWrap("Google Search", [
      `❌ ${r.error || "hasil gak ketemu"}.`,
      ``,
      `💡 Coba kata kunci lain / mesin lain (${ENGINE_KEYS.join(", ")}).`,
    ]));
  }
  saveSearchSession(m.chat, query, r.items);

  // ── RICH RESPONSE ALA META AI (request owner 10 Sep 2026) ──
  // Hasil pencarian dirender DI DALAM CHAT kayak rich AI: gambar +
  // ringkasan Wikipedia + list hasil + suggest chips pencarian terkait.
  // Gagal/throw (client gak dukung rich) → fallback format list lama.
  const richOk = await sendSearchRich(m, sock, query, r);
  if (richOk) {
    await m.react("🐣");
    return;
  }

  const srcNote = r.engineNote
    ? `\n📡 *${r.source}* (google dialihkan — google ngeblok bot)`
    : `\n📡 Mesin: *${r.source}* • ${r.items.length} hasil`;
  const lines = r.items.map((it, i) =>
    `${i + 1}. *${it.title.slice(0, 60)}*\n   🔗 ${domainOf(it.url)}` +
    (it.snippet ? `\n   💬 ${it.snippet.slice(0, 90)}` : "")
  );
  const text = claraWrap("Google Search", [
    `🔎 *${query}*`,
    srcNote.trim(),
    ``,
    ...lines,
    ``,
    `💡 Ketik *${m.prefix}search <nomor>* buat buka halamannya`,
    `(contoh: ${m.prefix}search 2) — hasil nyimpen 15 menit`,
  ]);

  // popup tap-list (fallback — tap = auto-run ${prefix}search buka <n>)
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

/**
 * Rich response buat hasil pencarian (ala contoh owner — google search rich).
 * Bagian: [image wiki (kalau ada)] [ringkasan wiki] [judul + list hasil]
 * [link sumber] [suggest chips pencarian terkait].
 * Return true kalau rich kekirim, false kalau gagal → caller fallback.
 */
async function sendSearchRich(m, sock, query, r) {
  try {
    const parts = [];
    // Wikipedia summary (gratis) — gambar + ringkasan ala contoh owner
    const wiki = await getWikiSummary(query);
    if (wiki?.thumbnail) parts.push({ type: "image", url: wiki.thumbnail });
    parts.push({ type: "text", content: `🔎 Hasil pencarian: "${query}" (${r.source})` });
    if (wiki?.extract) {
      let wikiText = `📖 ${wiki.title}\n\n${wiki.extract.slice(0, 400)}${wiki.extract.length > 400 ? "..." : ""}`;
      if (wiki.url) wikiText += `\n\n🔗 ${wiki.url}`;
      parts.push({ type: "text", content: wikiText });
    }
    const list = r.items.slice(0, 6).map((it, i) =>
      `${i + 1}. ${it.title.slice(0, 60)}\n   ${domainOf(it.url)}` +
      (it.snippet ? `\n   ${it.snippet.slice(0, 80)}` : "")
    ).join("\n\n");
    parts.push({ type: "text", content: `🌐 ${list}` });
    parts.push({ type: "text", content: `💡 Ketik ${m.prefix}search <nomor> buat buka halaman lengkap (hasil nyimpen 15 menit).` });
    // suggest chips: pencarian terkait dari Google Suggest — tap = auto-run .search baru
    const sug = await getGoogleSuggest(query, 4);
    if (sug.length) {
      parts.push({ type: "suggest", prompts: sug.map((s) => `${m.prefix}search ${s}`).slice(0, 4) });
    }
    const rich = buildRichResponse(parts, `🔎 ${query}`, "");
    return await sendRichMessage(sock, m.chat, rich);
  } catch {
    return false;
  }
}

async function handleOpen(m, sock, num) {
  const sess = getSearchSession(m.chat);
  if (!sess) {
    await m.react("❌");
    return m.reply(claraWrap("Google Search", [
      `❌ Belum ada hasil pencarian di chat ini (atau udah kedaluwarsa 15 menit).`,
      ``,
      `Cari dulu: *${m.prefix}search <engine> <query>*`,
      `Contoh: ${m.prefix}search bing daftar hp terkenal`,
    ]));
  }
  const idx = num - 1;
  if (idx < 0 || idx >= sess.items.length) {
    await m.react("❌");
    return m.reply(claraWrap("Google Search", [
      `❌ Nomor ${num} gak ada — hasil cuma 1 s/d ${sess.items.length} buat pencarian "${sess.query}".`,
    ]));
  }

  await m.react("🕒");
  const item = sess.items[idx];
  const p = await fetchPagePreview(item.url);
  if (p.error) {
    await m.react("❌");
    return m.reply(claraWrap("Google Search", [
      `❌ ${p.error}`,
      ``,
      `🔗 ${item.url}`,
      `💡 Buka link-nya langsung aja ya.`,
    ]));
  }

  // ── RICH PREVIEW (request owner 10 Sep 2026): isi halaman dirender
  // di dalam chat ala Meta AI — [image halaman] [judul + link + deskripsi]
  // [isi halaman] [suggest chips pencarian terkait]. Fallback → teks lama.
  const richOk = await sendPreviewRich(m, sock, num, sess, p);
  if (richOk) {
    await m.react("🐣");
    return;
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

/** Rich preview halaman — return true kalau kekirim, false → fallback. */
async function sendPreviewRich(m, sock, num, sess, p) {
  try {
    const parts = [];
    if (p.image) parts.push({ type: "image", url: p.image });
    parts.push({ type: "text", content: `📄 ${p.title}` });
    parts.push({ type: "text", content: `🔗 ${p.url}` });
    if (p.description) parts.push({ type: "text", content: `📝 ${p.description}` });
    if (p.text) parts.push({ type: "text", content: `📖 ${p.text.slice(0, 2000)}${p.text.length > 2000 ? "..." : ""}` });
    const sug = await getGoogleSuggest(sess.query, 4);
    if (sug.length) {
      parts.push({ type: "suggest", prompts: sug.map((s) => `${m.prefix}search ${s}`).slice(0, 4) });
    }
    const rich = buildRichResponse(parts, `📄 Hasil #${num} — ${sess.query}`, "");
    return await sendRichMessage(sock, m.chat, rich);
  } catch {
    return false;
  }
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const text = args.join(" ").trim();
  const prefix = m.prefix || ".";

  if (!text) {
    // user ketik .search doang → usage + daftar mesin
    return m.reply(novaGuide("search",
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
      return m.reply(claraWrap("Google Search", [`Format: *${prefix}search buka <nomor>*`]));
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
