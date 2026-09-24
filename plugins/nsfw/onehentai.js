// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// onehentai.js — Onepunya API: HENTAI_SEARCH + HENTAI_EPISODE + HENTAI_DOWNLOAD (nhentai).
// .hentaisearch <q>   — cari doujin di nhentai (list judul + id)
// .hentaiep <url>     — ambil info episode/doujin dari link nhentai
// .hentaidl <url>     — link download media doujin
// KONTEN DEWASA 🔞 — fitur nsfw, key .setkey onepunya. Beda dari .nhentai
// (engine lama) — ini numpang engine Onepunya.
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { hentaiSearch, hentaiEpisode, hentaiDownload } from "../../src/lib/nova-onepunya.js";

const pluginConfig = {
  name: "onehentai",
  alias: ["hentaisearch", "hentaiep", "hentaidl", "onehentaisearch"],
  category: "nsfw",
  description: "Cari & info doujin nhentai via Onepunya API (konten dewasa)",
  usage: ".hentaisearch <q> · .hentaiep <url nhentai> · .hentaidl <url nhentai>",
  example: ".hentaisearch query",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 12,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const args = m.args || [];
  const apiKey = getApiKey("onepunya");

  try {
    if (cmd === "hentaisearch" || cmd === "onehentaisearch") {
      const q = args.join(" ").trim();
      if (!q) return m.reply(claraWrap("Onepunya Hentai", `Masukkan kata kunci!\n\nContoh: .hentaisearch ${"query"}`));
      const res = await hentaiSearch(apiKey, q);
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (!list.length) return m.reply(claraWrap("Onepunya Hentai", `Gak ada hasil untuk: ${q}`));
      let text = `🔞 nhentai search — "${q}" (${res?.total ?? list.length})\n\n`;
      list.slice(0, 10).forEach((d, i) => {
        const title = d.title || d.fullTitle || d.title_english || `#${d.id}`;
        text += `${i + 1}. ${String(title).slice(0, 60)}\n   #${d.id} · ${d.page_count || d.pages || "?"} halaman · ${d.tags ? String(d.tags).slice(0, 0) : ""}\n`;
      });
      text += `\nLink: https://nhentai.net/g/<id>\nDetail: .hentaiep <url>`;
      return m.reply(claraWrap("Onepunya Hentai", text));
    }

    if (cmd === "hentaiep") {
      const url = (args[0] || "").trim();
      if (!/^https?:\/\//.test(url)) return m.reply(claraWrap("Onepunya Hentai", "Kirim URL nhentai yang valid.\n\nContoh: .hentaiep https://nhentai.net/g/177013/"));
      const res = await hentaiEpisode(apiKey, url);
      const list = Array.isArray(res) ? res : [res];
      let text = `📚 Hasil untuk: ${url}\n\n`;
      list.slice(0, 10).forEach((d, i) => {
        const title = d.title || d.fullTitle || d.name || `#${d.id}`;
        text += `${i + 1}. ${String(title).slice(0, 65)}\n`;
        for (const [k, v] of Object.entries(d || {})) {
          if (["title", "fullTitle", "name"].includes(k)) continue;
          if (typeof v === "string" && v.length > 0 && v.length < 80 && !Array.isArray(v)) text += `   ${k}: ${v}\n`;
        }
        text += "\n";
      });
      return m.reply(claraWrap("Onepunya Hentai", text.slice(0, 3000)));
    }

    if (cmd === "hentaidl") {
      const url = (args[0] || "").trim();
      if (!/^https?:\/\//.test(url)) return m.reply(claraWrap("Onepunya Hentai", "Kirim URL nhentai yang valid.\n\nContoh: .hentaidl https://nhentai.net/g/177013/"));
      const res = await hentaiDownload(apiKey, url);
      const list = Array.isArray(res) ? res : [res];
      let text = `⬇️ Link download — ${url}\n\n`;
      list.slice(0, 10).forEach((d, i) => {
        text += `${i + 1}. ${String(d.title || d.name || d.quality || "media").slice(0, 60)}\n`;
        const dlUrl = d.url || d.link || d.download_url || "";
        if (dlUrl) text += `   ${dlUrl}\n`;
      });
      return m.reply(claraWrap("Onepunya Hentai", text.slice(0, 3000)));
    }
  } catch (e) {
    return m.reply(claraWrap("Onepunya Hentai", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
