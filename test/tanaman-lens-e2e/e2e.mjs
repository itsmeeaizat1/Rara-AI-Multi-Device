// E2E — TANAMAN (AI plant ID) + LENS (reverse image trace) (13 Sep 2026)
// Fitur baru batch 2 pilihan owner. Seam-based, gak nyamber AI live.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-tanlens-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = SENDER;
const PNG = Buffer.from("89504e470d0a1a0a" + "ab".repeat(6000), "hex");

function mkMock() {
  const sends = [];
  const medias = [];
  const reacts = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".",
    isImage: false, quoted: null,
    react: async (e) => { reacts.push(e); },
    reply: async (txt, opts) => { sends.push({ txt, opts }); return { key: { id: "r" + sends.length } }; },
    download: async () => PNG,
  };
  const sock = {
    sendMedia: async (jid, src, caption, quoted, opts) => { medias.push({ jid, src, caption, opts }); return { key: { id: "md" + medias.length } }; },
    sendMessage: async (jid, payload, opts) => { sends.push({ txt: payload?.text, opts }); return { key: { id: "m" + sends.length } }; },
  };
  return { m, sock, sends, medias, reacts };
}
const withPhoto = (mk) => { mk.m.isImage = true; return mk; };
const ctx = (sock) => ({ sock, config: { command: { prefix: "." } } });

// ═══════════════════════════════════════════════════════════════
w("\n— TANAMAN: AI plant identifier —");
{
  const t = await import(R + "/plugins/ai/plants.js");
  const { handler, _setTanamanVisionForTest, _resetTanamanVisionForTest } = t;

  // tanpa foto → panduan
  {
    const mk = mkMock();
    await handler(mk.m, ctx(mk.sock));
    const txt = norm(mk.sends.at(-1).txt);
    // REWORK 24 Sep: panduan kini raraGuide (intro/note di-smallcaps; contoh
    // verbatim) — asersi harus smallcaps-aware (GOTCHA: teks smallcaps gak
    // bisa di-lowercase balik, jadi bandingkan dua-duanya).
    const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
    const sc = (x) => String(x).replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);
    const has = (w) => txt.includes(w) || txt.includes(sc(w));
    check("tanpa foto → panduan (cara pakai + hasil)", has("tanaman") && has("kucing"), txt.slice(0, 60));
  }

  // foto tanaman → kartu lengkap
  {
    const mk = withPhoto(mkMock());
    let got = {};
    _setTanamanVisionForTest(async ({ imageBuffer }) => {
      got.bufLen = imageBuffer.length;
      return { status: true, text: JSON.stringify({
        nama: "Monstera Deliciosa", latin: "Monstera deliciosa", jenis: "tanaman hias daun",
        sirah: "1-2x seminggu", cahaya: "indirect terang", pupuk: "pupuk cair 1x/bulan",
        racun: "beracun buat kucing & anjing kalau dimakan", fakta: "lobang daunnya biar tahan angin kencang", confident: true,
      }), engine: "gemini-vision", model: "x" };
    });
    await handler(mk.m, ctx(mk.sock));
    const card = norm(mk.sends.at(-1).txt);
    check("vision kepanggil dengan buffer foto beneran", got.bufLen === PNG.length);
    check("kartu: nama + latin + perawatan", card.includes("monstera") && card.includes("monstera deliciosa") && card.includes("indirect terang"));
    check("kartu: sirah + pupuk + racun hewan + fakta", card.includes("1-2x seminggu") && card.includes("1x/bulan") && card.includes("kucing") && card.includes("lobang"));
    check("react 🧠 → 🛠️ → 🐣", mk.reacts.join(",") === "🧠,🛠️,🐣", mk.reacts.join(","));

    // confident false → disclaimer
    _setTanamanVisionForTest(async () => ({ status: true, text: JSON.stringify({ nama: "Mungkin Lidah Buaya", confident: false }) }));
    await handler(mk.m, ctx(mk.sock));
    check("confident false → disclaimer perkiraan", norm(mk.sends.at(-1).txt).includes("bukan identifikasi"));

    // bukan tanaman → tolak sopan
    _setTanamanVisionForTest(async () => ({ status: true, text: '{"error":"BUKAN_TANAMAN"}' }));
    await handler(mk.m, ctx(mk.sock));
    const txt = norm(mk.sends.at(-1).txt);
    check("BUKAN_TANAMAN → tolak (react ❌)", txt.includes("bukan tanaman") && mk.reacts.at(-1) === "❌");

    // AI JSON kebablasan markdown fence → tetep keparse
    _setTanamanVisionForTest(async () => ({ status: true, text: '```json\n{"nama":"Melati","confident":true}\n```' }));
    await handler(mk.m, ctx(mk.sock));
    check("markdown fence di-resilien (tetep keparse)", norm(mk.sends.at(-1).txt).includes("melati"));

    // AI error → kartu gagal
    _setTanamanVisionForTest(async () => { throw new Error("down"); });
    await handler(mk.m, ctx(mk.sock));
    check("AI error → ❌ + kartu gagal sopan", norm(mk.sends.at(-1).txt).includes("gagal") && mk.reacts.at(-1) === "❌");
    _resetTanamanVisionForTest();
  }
}

// ═══════════════════════════════════════════════════════════════
w("\n— LENS: reverse image trace —");
{
  const l = await import(R + "/plugins/search/lens.js");
  const { handler, _setLensDepsForTest, _resetLensDepsForTest, fmtTimestamp } = l;

  // pure
  check("fmtTimestamp 1317.19 → 21:57", fmtTimestamp(1317.19) === "21:57");

  // tanpa foto → panduan
  {
    const mk = mkMock();
    await handler(mk.m, ctx(mk.sock));
    const txt = norm(mk.sends.at(-1).txt);
    check("tanpa foto → panduan (anime + web trace)", txt.includes("trace.moe") && txt.includes("hoax"), txt.slice(0, 60));
  }

  // anime match + web results → kartu + preview frame
  {
    const mk = withPhoto(mkMock());
    _setLensDepsForTest({
      traceAnime: async () => ({ anilistId: 20955, filename: "Rokka no Yuusha - 10 (BD).mp4", episode: 10, at: 1320.57, similarity: 85, image: "https://x/img.jpg", video: "" }),
      traceWeb: async () => ({ desc: "a dog sitting on grass", results: [
        { title: "Dog - Wikipedia", url: "https://wikipedia.org/dog", snippet: "s" },
        { title: "Dog pics", url: "https://picsum.photos/dog", snippet: "s" },
      ] }),
      anilist: async () => "Rokka no Yuusha",
    });
    await handler(mk.m, ctx(mk.sock));
    const card = norm(mk.sends.at(-1).txt);
    check("kartu: anime ditemukan + judul + episode + menit", card.includes("anime ditemukan") && card.includes("rokka no yuusha") && card.includes("episode: 10"));
    check("kartu: kesamaan 85% + kandidat web + AI desc", card.includes("85%") && card.includes("wikipedia.org/dog") && card.includes("dog sitting"));
    check("preview frame kekirim via sendMedia", mk.medias.length === 1 && norm(mk.medias[0].caption).includes("rokka"));
    check("react 🧠 → 🛠️ → 🐣", mk.reacts.join(",") === "🧠,🛠️,🐣", mk.reacts.join(","));

    // similarity rendah → anime null → kartu web only
    _setLensDepsForTest({
      traceAnime: async () => null,
      traceWeb: async () => ({ desc: "monas jakarta", results: [{ title: "Monas", url: "https://x/monas", snippet: "" }] }),
    });
    await handler(mk.m, ctx(mk.sock));
    const card2 = norm(mk.sends.at(-1).txt);
    check("anime gak match → section web doang (tanpa anime)", card2.includes("kandidat sumber") && !card2.includes("anime ditemukan"));

    // dua-duanya gak nemu → kartu jujur
    _setLensDepsForTest({ traceAnime: async () => null, traceWeb: async () => ({ desc: "x", results: [] }) });
    await handler(mk.m, ctx(mk.sock));
    check("gak nemu apa2 → kartu jujur + ❌", norm(mk.sends.at(-1).txt).includes("gak ketemu") && mk.reacts.at(-1) === "❌");

    // engine error total → gak crash
    _setLensDepsForTest({ traceAnime: async () => { throw new Error("x"); }, traceWeb: async () => { throw new Error("y"); } });
    await handler(mk.m, ctx(mk.sock));
    check("engine error total → gak crash, tetep kasih jawaban", mk.sends.length > 0 && ["gak ketemu", "gagal"].some((k) => norm(mk.sends.at(-1).txt).includes(k)));
    _resetLensDepsForTest();
  }
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
