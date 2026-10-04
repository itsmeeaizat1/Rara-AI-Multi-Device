// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "comicsanka",
  alias: ["comicsanka"],
  category: "tools",
  description: "Comic Sanka - baca & cari komik (Sanka API)",
  usage: ".comicsanka <command> [args]",
  example: ".comicsanka search naruto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

async function apiGet(endpoint) {
  const url = `${API_BASE}${endpoint}?apikey=${API_KEY}`;
  const res = await axios.get(url, {
    timeout: 25000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return res;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data?.list) return data.list;
  if (data?.komik) return data.komik;
  if (data?.results) return data.results;
  if (data?.data) return data.data;
  return [];
}

function getTitle(c) {
  return c.title || c.judul || c.name || "?";
}

function getSlug(c) {
  return c.slug || c.id || c.endpoint || "";
}

async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Comic Sanka\n\n`;
    txt += `Baca & cari komik dari Sanka API\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}comicsanka search <judul>\` - Cari komik\n`;
    txt += `2. \`${m.prefix}comicsanka detail <slug>\` - Detail komik + chapter\n`;
    txt += `3. \`${m.prefix}comicsanka chapter <slug>\` - Baca chapter\n`;
    txt += `4. \`${m.prefix}comicsanka terbaru\` - Komik terbaru\n`;
    txt += `5. \`${m.prefix}comicsanka populer\` - Komik populer\n`;
    txt += `6. \`${m.prefix}comicsanka trending\` - Komik trending\n`;
    txt += `7. \`${m.prefix}comicsanka random\` - Komik random\n`;
    txt += `8. \`${m.prefix}comicsanka recommendations\` - Rekomendasi\n`;
    txt += `9. \`${m.prefix}comicsanka homepage\` - Halaman utama\n`;
    txt += `10. \`${m.prefix}comicsanka genres\` - Daftar genre\n`;
    txt += `11. \`${m.prefix}comicsanka genre <nama>\` - Komik per genre\n`;
    txt += `12. \`${m.prefix}comicsanka type <manga|manhwa|manhua>\` - Filter tipe\n`;
    txt += `13. \`${m.prefix}comicsanka berwarna <halaman>\` - Komik berwarna\n`;
    txt += `14. \`${m.prefix}comicsanka pustaka <halaman>\` - Perpustakaan\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}comicsanka search naruto\`\n`;
    txt += `\`${m.prefix}comicsanka detail naruto-manga\`\n`;
    txt += `\`${m.prefix}comicsanka berwarna 1\``;
    return await m.reply( txt, { commandName: "comicsanka" });
  }
  try {
    await m.react("🕒");
    // === SEARCH ===
    if (cmd === "search" || cmd === "cari" || cmd === "s") {
      const query = cmdArgs.join(" ").trim();
      if (!query) return m.reply(raraWrap("Comicsanka", "Masukkan judul komik!\n\n💡 *Contoh:* `.comicsanka search naruto`"));

      const res = await apiGet(`/comic/search?q=${encodeURIComponent(query)}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Comic Search: ${query}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.status) txt += `   Status: ${c.status}\n`;
        if (c.type) txt += `   Type: ${c.type}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === DETAIL ===
    else if (cmd === "detail" || cmd === "d" || cmd === "info") {
      const slug = cmdArgs[0];
      if (!slug) return m.reply(raraWrap("Comicsanka", "Masukkan slug komik!\n\n💡 *Contoh:* `.comicsanka detail naruto-manga`"));

      const res = await apiGet(`/comic/comic/${slug}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const data = res.data.result || res.data.data;
      let txt = `${getTitle(data)}\n\n`;
      if (data.sinopsis || data.description) txt += `Sinopsis: ${(data.sinopsis || data.description).slice(0, 300)}...\n\n`;
      if (data.status) txt += `Status: ${data.status}\n`;
      if (data.type) txt += `Type: ${data.type}\n`;
      if (data.rating) txt += `Rating: ${data.rating}\n`;
      if (data.genre) txt += `Genre: ${Array.isArray(data.genre) ? data.genre.join(", ") : data.genre}\n`;
      if (data.author) txt += `Author: ${data.author}\n`;

      const chapters = data.chapters || data.chapter || [];
      if (chapters.length) {
        txt += `\nChapter (${chapters.length} total):\n`;
        for (let i = 0; i < Math.min(chapters.length, 15); i++) {
          const ch = chapters[i];
          const chSlug = typeof ch === "string" ? ch : (ch.slug || ch.id || ch.endpoint || "");
          const chName = typeof ch === "string" ? ch : (ch.name || ch.title || ch.chapter || ch);
          txt += `   \`${m.prefix}comicsanka chapter ${chSlug}\`\n`;
        }
        if (chapters.length > 15) txt += `   ...dan ${chapters.length - 15} chapter lainnya\n`;
      }

      // Thumbnail
      const thumb = data.thumbnail || data.image || data.cover;
      if (thumb) {
        try {
          const imgRes = await axios.get(thumb, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true });
          if (imgRes.status === 200) {
            const buf = Buffer.from(imgRes.data);
            let card = "";
            try {
              const info = await probeBuffer(buf);
              card = mediaResultCard({
                header: "comicsanka",
                type: "gambar",
                size: info.size, mime: info.mime, width: info.width, height: info.height,
              });
            } catch { /* best-effort */ }
            await sock.sendMessage(m.chat, { image: buf, caption: (card || txt) }, { quoted: m });
            return;
          }
        } catch (e) { console.error('[comicsanka.js]:', e.message); }
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === CHAPTER (baca) ===
    else if (cmd === "chapter" || cmd === "read" || cmd === "baca") {
      const slug = cmdArgs[0];
      if (!slug) return m.reply(raraWrap("Comicsanka", "Masukkan slug chapter!\n\n💡 *Contoh:* `.comicsanka chapter naruto-chapter-1`"));

      const res = await apiGet(`/comic/chapter/${slug}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const data = res.data.result || res.data.data;
      const images = data.images || data.image || data.pages || [];


      let txt = `${data.title || data.name || slug}\n`;
      txt += `${images.length} halaman\n`;
      txt += `Mengirim ${Math.min(images.length, 10)} halaman pertama...`;
      await m.reply(raraWrap("comicsanka", txt));

      for (let i = 0; i < Math.min(images.length, 10); i++) {
        try {
          const imgUrl = typeof images[i] === "string" ? images[i] : (images[i].url || images[i].src || images[i].image);
          const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 20000, validateStatus: () => true });
          if (imgRes.status === 200) {
            const buf = Buffer.from(imgRes.data);
            await sock.sendMessage(m.chat, { image: buf, caption: `Halaman ${i + 1}/${images.length}` }, { quoted: m });
          }
        } catch (e) { console.error('[comicsanka.js]:', e.message); }
        await new Promise(r => setTimeout(r, 500));
      }

      if (images.length > 10) {
        await m.reply(`Tersisa ${images.length - 10} halaman lagi. Ketik \`${m.prefix}comicsanka chapter ${slug} 11\` untuk lanjut (soon).`);
      }
    }

    // === TERBARU ===
    else if (cmd === "terbaru" || cmd === "latest" || cmd === "baru") {
      const page = parseInt(cmdArgs[0]) || 1;
      const res = await apiGet(`/comic/terbaru?page=${page}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Terbaru\n`;
      txt += `Halaman ${page}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.status) txt += `   Status: ${c.status}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      txt += `Halaman ${page} | Next: \`${m.prefix}comicsanka terbaru ${page + 1}\``;
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === POPULER ===
    else if (cmd === "populer" || cmd === "popular" || cmd === "hot") {
      const res = await apiGet(`/comic/populer`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Populer\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.rating) txt += `   Rating: ${c.rating}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === TRENDING ===
    else if (cmd === "trending" || cmd === "trend") {
      const res = await apiGet(`/comic/trending`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Trending\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === RANDOM ===
    else if (cmd === "random" || cmd === "rnd" || cmd === "acak") {
      const res = await apiGet(`/comic/random`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const data = res.data.result || res.data.data;
      let txt = `Komik Random\n\n`;
      txt += `${getTitle(data)}\n`;
      if (data.sinopsis || data.description) txt += `Sinopsis: ${(data.sinopsis || data.description).slice(0, 200)}...\n`;
      if (data.status) txt += `Status: ${data.status}\n`;
      if (data.genre) txt += `Genre: ${Array.isArray(data.genre) ? data.genre.join(", ") : data.genre}\n`;
      const slug = getSlug(data);
      if (slug) txt += `\n\`${m.prefix}comicsanka detail ${slug}\``;

      const thumb = data.thumbnail || data.image || data.cover;
      if (thumb) {
        try {
          const imgRes = await axios.get(thumb, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true });
          if (imgRes.status === 200) {
            const buf = Buffer.from(imgRes.data);
            let card2 = "";
            try {
              const info = await probeBuffer(buf);
              card2 = mediaResultCard({
                header: "comicsanka",
                type: "gambar",
                size: info.size, mime: info.mime, width: info.width, height: info.height,
              });
            } catch { /* best-effort */ }
            await sock.sendMessage(m.chat, { image: buf, caption: (card2 || txt) }, { quoted: m });
            return;
          }
        } catch (e) { console.error('[comicsanka.js]:', e.message); }
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === RECOMMENDATIONS ===
    else if (cmd === "recommendations" || cmd === "recomen" || cmd === "rekomendasi" || cmd === "recom") {
      const res = await apiGet(`/comic/recommendations`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Rekomendasi Komik\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.rating) txt += `   Rating: ${c.rating}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === HOMEPAGE ===
    else if (cmd === "homepage" || cmd === "home" || cmd === "beranda") {
      const res = await apiGet(`/comic/homepage`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const data = res.data.result || res.data.data;
      let txt = `Comic Homepage\n\n`;

      const popular = data.popular || data.populer || [];
      if (popular.length) {
        txt += `Populer:\n`;
        for (let i = 0; i < Math.min(popular.length, 5); i++) {
          txt += `   ${i + 1}. ${getTitle(popular[i])}\n`;
        }
        txt += `\n`;
      }

      const latest = data.latest || data.terbaru || [];
      if (latest.length) {
        txt += `Terbaru:\n`;
        for (let i = 0; i < Math.min(latest.length, 5); i++) {
          txt += `   ${i + 1}. ${getTitle(latest[i])}\n`;
        }
        txt += `\n`;
      }

      const ranking = data.ranking || data.rank || [];
      if (ranking.length) {
        txt += `Ranking:\n`;
        for (let i = 0; i < Math.min(ranking.length, 5); i++) {
          txt += `   ${i + 1}. ${getTitle(ranking[i])}\n`;
        }
      }

      await m.reply(raraWrap("comicsanka", txt));
    }

    // === GENRES (list) ===
    else if (cmd === "genres" || cmd === "genrelst") {
      const res = await apiGet(`/comic/genres`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const data = res.data.result || res.data.data;
      let genres = Array.isArray(data) ? data : (data?.genres || data?.list || []);

      let txt = `Daftar Genre\n\n`;
      for (let i = 0; i < Math.min(genres.length, 30); i++) {
        const g = genres[i];
        const name = typeof g === "string" ? g : (g.name || g.title || g.genre || "?");
        const slug = typeof g === "string" ? g.toLowerCase() : (g.slug || g.id || g.link || "");
        txt += `${i + 1}. ${name}\n`;
        if (slug) txt += `   \`${m.prefix}comicsanka genre ${slug}\`\n`;
      }
      if (genres.length > 30) txt += `\n...dan ${genres.length - 30} genre lainnya.`;
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === GENRE (by name) ===
    else if (cmd === "genre" || cmd === "g") {
      const genreSlug = cmdArgs[0];
      if (!genreSlug) return m.reply(raraWrap("Comicsanka", "Masukkan nama genre!\n\n💡 *Contoh:* `.comicsanka genre action`"));

      const res = await apiGet(`/comic/genre/${encodeURIComponent(genreSlug)}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Genre: ${genreSlug}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === TYPE (manga/manhwa/manhua) ===
    else if (cmd === "type" || cmd === "tipe") {
      const type = (cmdArgs[0] || "").toLowerCase();
      const validTypes = ["manga", "manhwa", "manhua"];
      if (!validTypes.includes(type)) {
        return m.reply(`Tipe tidak valid!\n\nPilihan: manga, manhwa, manhua\n\n💡 *Contoh:* \`${m.prefix}comicsanka type manhwa\``);
      }

      const res = await apiGet(`/comic/type/${type}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Tipe: ${type}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.status) txt += `   Status: ${c.status}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === BERWARNA ===
    else if (cmd === "berwarna" || cmd === "color" || cmd === "bw") {
      const page = parseInt(cmdArgs[0]) || 1;
      const res = await apiGet(`/comic/berwarna/${page}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Komik Berwarna\n`;
      txt += `Halaman ${page}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      txt += `Halaman ${page} | Next: \`${m.prefix}comicsanka berwarna ${page + 1}\``;
      await m.reply(raraWrap("comicsanka", txt));
    }

    // === PUSTAKA ===
    else if (cmd === "pustaka" || cmd === "library" || cmd === "lib") {
      const page = parseInt(cmdArgs[0]) || 1;
      const res = await apiGet(`/comic/pustaka/${page}`);
      if (res.status !== 200 || !res.data?.status) throw new Error(res.data?.message || "API error");

      const list = extractList(res.data.result || res.data.data);

      let txt = `Pustaka Komik\n`;
      txt += `Halaman ${page}\n\n`;
      for (let i = 0; i < Math.min(list.length, 15); i++) {
        const c = list[i];
        txt += `${i + 1}. ${getTitle(c)}\n`;
        if (c.status) txt += `   Status: ${c.status}\n`;
        if (c.type) txt += `   Type: ${c.type}\n`;
        const slug = getSlug(c);
        if (slug) txt += `   \`${m.prefix}comicsanka detail ${slug}\`\n`;
        txt += `\n`;
      }
      txt += `Halaman ${page} | Next: \`${m.prefix}comicsanka pustaka ${page + 1}\``;
      await m.reply(raraWrap("comicsanka", txt));
    }

    else {
      await m.react("🐣");
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}comicsanka help\` untuk melihat semua perintah.`);
    }
  } catch (e) {
    await m.react("❌");
    console.error("[COMICSANKA] Error:", e.message);
    let txt = `Gagal memproses!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(raraWrap("comicsanka", txt));
  }
}

export { pluginConfig as config, handler };
