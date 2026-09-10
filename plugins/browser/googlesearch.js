// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// googlesearch — nyari web + preview halaman (request owner 2026-09-10)
// ".googleserach fungisnya buat nyari web, contoh .searchweb fb muncul list
//  1 sampai berapa halaman web yang kecari, user ketik 2 buka halaman 2,
//  lalu bot kirim preview link thumbnail dan plain text isi halaman
//  ditambah %readmore".
// Command: .googlesearch <query> → list 1..N (+ popup tap)
//          .googlesearch <nomor> | buka <nomor> → preview halaman
import {
  searchWeb,
  fetchPagePreview,
  saveSearchSession,
  getSearchSession,
} from "../../src/lib/nova-websearch.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "googlesearch",
  alias: ["googlesearch", "googleserach", "searchweb", "websearch", "gsearch", "gsweb", "caridweb", "gogleserach"],
  category: "browser",
  description: "Nyari web — list hasil 1..N, ketik nomor buat buka preview halaman (thumbnail + isi plain text)",
  usage: ".googlesearch <query> | .googlesearch <nomor>",
  example: ".searchweb facebook",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

const READMORE = "\u200E".repeat(4001);

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function handleSearch(m, sock, query) {
  const r = await searchWeb(query);
  if (r.error || !r.items.length) {
    await m.react("❌");
    return m.reply(claraWrap("Google Search", [
      `❌ ${r.error || "hasil gak ketemu"}.`,
      ``,
      `💡 Coba kata kunci lain.`,
    ]));
  }
  saveSearchSession(m.chat, query, r.items);

  const lines = r.items.map((it, i) =>
    `${i + 1}. *${it.title.slice(0, 60)}*\n   🔗 ${domainOf(it.url)}` +
    (it.snippet ? `\n   💬 ${it.snippet.slice(0, 90)}` : "")
  );
  const text = claraWrap("Google Search", [
    `🔎 *${query}*`,
    `📡 Sumber: ${r.source} • ${r.items.length} hasil`,
    ``,
    ...lines,
    ``,
    `💡 Ketik *${m.prefix}googlesearch <nomor>* buat buka halamannya`,
    `(contoh: ${m.prefix}googlesearch 2) — hasil nyimpen 15 menit`,
  ]);

  // popup tap-list (tap = auto-run ${prefix}googlesearch buka <n>)
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
                id: `${m.prefix}googlesearch buka ${i + 1}`,
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
    return m.reply(claraWrap("Google Search", [
      `❌ Belum ada hasil pencarian di chat ini (atau udah kedaluwarsa 15 menit).`,
      ``,
      `Cari dulu: *${m.prefix}googlesearch <query>*`,
      `Contoh: ${m.prefix}searchweb facebook`,
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
    return m.reply(novaGuide("googlesearch",
      "Nyari web — hasil jadi list 1..N, ketik nomor buat lihat isi halaman.",
      `${prefix}googlesearch facebook`,
      `Setelah list muncul: ${prefix}googlesearch 2 (buka hasil #2) — preview thumbnail + isi halaman.`));
  }

  // buka hasil: ".googlesearch buka 3" / ".googlesearch 3"
  if (/^buka$/i.test(args[0])) {
    if (!args[1] || !/^\d+$/.test(args[1])) {
      await m.react("❌");
      return m.reply(claraWrap("Google Search", [`Format: *${prefix}googlesearch buka <nomor>*`]));
    }
    return handleOpen(m, sock, parseInt(args[1], 10));
  }
  if (/^\d+$/.test(args[0]) && args.length === 1) {
    return handleOpen(m, sock, parseInt(args[0], 10));
  }

  await m.react("🕒");
  return handleSearch(m, sock, text);
}

export { pluginConfig as config, handler };
