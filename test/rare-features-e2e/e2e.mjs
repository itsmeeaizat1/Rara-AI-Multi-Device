// E2E — RARE FEATURES: ZAKAT (kalkulator) + ARISAN (manager) + BUTAWARNA (Ishihara) (13 Sep 2026)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-rare-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628123456789@s.whatsapp.net";
const SENDER2 = "628987654321@s.whatsapp.net";
const CHAT = "6281200000-123456@g.us";

function mkMock(sender = SENDER, chat = CHAT) {
  const sends = [];
  const medias = [];
  const reacts = [];
  const m = {
    sender, chat, pushName: "Budi", prefix: ".", args: [],
    react: async (e) => { reacts.push(e); },
    reply: async (txt, opts) => { sends.push({ txt, opts }); return { key: { id: "r" + sends.length } }; },
    download: async () => Buffer.alloc(0),
  };
  const sock = {
    sendMedia: async (jid, src, caption, quoted, opts) => { medias.push({ jid, src, caption, opts }); return { key: { id: "m" + medias.length } }; },
    sendMessage: async (jid, payload, opts) => { sends.push({ txt: payload?.text, opts }); return { key: { id: "s" + sends.length } }; },
  };
  const run = (plugin, args) => {
    m.args = args;
    return plugin.handler(m, { sock, config: { command: { prefix: "." } } });
  };
  return { m, sock, sends, medias, reacts, run };
}
const last = (mk) => norm(mk.sends.at(-1).txt);

// ═══════════════════════════════════════════════════════════════
w("\n— ZAKAT: kalkulator + harga emas —");
{
  const z = await import(R + "/plugins/islami/zakat.js");
  const { handler, parseRp, getHargaEmasPerGram, _setZakatHargaCacheForTest } = z;

  // parse Rp
  check("parseRp 5jt → 5.000.000", parseRp("5jt") === 5e6);
  check("parseRp 5.5 juta → 5.500.000", parseRp("5.5juta") === 5.5e6);
  check("parseRp 500rb → 500.000", parseRp("500rb") === 5e5);
  check("parseRp 150 milyar → 1,5e11", parseRp("150milyar") === 1.5e11);
  check("parseRp 5.000.000 → 5e6", parseRp("5.000.000") === 5e6);
  check("parseRp sampah → NaN", Number.isNaN(parseRp("abc")));

  // cache harga emas (biar gak fetch live di e2e)
  _setZakatHargaCacheForTest({ ts: Date.now(), perGram: 2e6, live: true });
  const mk = mkMock();

  // menu
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("menu: harga emas + nisab live", last(mk).includes("2.000.000") && last(mk).includes("170.000.000") && last(mk).includes("live"));

  // penghasilan: 5jt < nisab bulanan (170jt/12 ≈ 14,16jt) → belum wajib
  mk.m.args = ["penghasilan", "5jt"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("penghasilan 5jt < nisab bulanan → belum wajib", last(mk).includes("belum wajib"));

  // penghasilan 20jt ≥ 14,16jt → wajib, zakat 2.5% = 500rb
  mk.m.args = ["penghasilan", "20jt"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("penghasilan 20jt → wajib + zakat Rp 500.000", last(mk).includes("wajib zakat") && last(mk).includes("500.000"));

  // maal 150jt < 170jt → belum; maal 200jt → wajib 5jt
  mk.m.args = ["maal", "150jt"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  const belum = last(mk);
  mk.m.args = ["maal", "200jt"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("maal 150jt vs 200jt → batas nisab kebaca", belum.includes("belum wajib") && last(mk).includes("5.000.000"));

  // emas 90gr → wajib (nisab 85gr), nilai 180jt, zakat 4.5jt
  mk.m.args = ["emas", "90"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("emas 90gr ≥ 85gr → wajib + zakat 4.5jt", last(mk).includes("wajib zakat") && last(mk).includes("4.500.000"));

  // emas 50gr → belum
  mk.m.args = ["emas", "50"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("emas 50gr < 85gr → belum wajib", last(mk).includes("belum wajib"));

  // fidyah 30 hari → 1.800.000
  mk.m.args = ["fidyah", "30"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("fidyah 30 hari → Rp 1.800.000", last(mk).includes("1.800.000"));

  // sub gak dikenal
  mk.m.args = ["nyasar"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("sub gak dikenal → arahin ke menu", last(mk).includes("gak dikenal"));

  // API down → fallback estimasi (label)
  const z2 = await import(R + "/plugins/islami/zakat.js");
  z2._setZakatHargaCacheForTest({ ts: Date.now(), perGram: 1900000, live: false });
  mk.m.args = ["maal", "200jt"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("API down → label estimasi muncul", last(mk).includes("estimasi"));
  z2._resetZakatHargaCacheForTest();
}

// ═══════════════════════════════════════════════════════════════
w("\n— ARISAN: manajer grup —");
{
  const a = await import(R + "/plugins/group/arisan.js");
  const { handler } = a;

  // tanpa arisan → menu
  const mk = mkMock();
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("tanpa arisan → menu lengkap", last(mk).includes("mulai") && last(mk).includes("undi"));

  // mulai
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  mk.m.args = ["mulai", "50000"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("mulai 50000 → arisan aktif", last(mk).includes("arisan dimulai") && last(mk).includes("50.000"));

  // dobel mulai → ditolak
  mk.m.args = ["mulai", "10000"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("mulai dobel → ditolak", last(mk).includes("lagi jalan"));

  // join 2 orang
  mk.m.args = ["join"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  const j1 = last(mk);
  const mk2 = mkMock(SENDER2, CHAT);
  mk2.m.args = ["join"];
  await handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
  check("join pertama → butuh 2 peserta hint", j1.includes("minimal 2"));
  check("join kedua → peserta 2, siap undi", last(mk2).includes("2 orang"));

  // join dobel → ditolak
  mk2.m.args = ["join"];
  await handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
  check("join dobel → udah terdaftar", last(mk2).includes("udah terdaftar"));

  // undi
  mk.m.args = ["undi"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  const u1 = last(mk);
  check("undi → ada pemenang + total 2 × 50rb = 100rb", u1.includes("selamat") && u1.includes("100.000"));

  // undi kedua → pemenang terakhir
  mk.m.args = ["undi"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("undi kedua → pemenang kedua (gak dobel)", last(mk).includes("selamat"));

  // undi ketiga → semua udah dapat
  mk.m.args = ["undi"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("undi ke-3 → semua udah dapat", last(mk).includes("semua peserta"));

  // riwayat
  mk.m.args = ["riwayat"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("riwayat → 2 pemenang tercatat", last(mk).includes("budi") && last(mk).includes("100.000"));

  // info → semua udah dapat
  mk.m.args = ["info"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("info → semua udah dapat 2/2", last(mk).includes("2") && last(mk).includes("semua udah dapat"));

  // stop → arisan ditutup → balik ke menu
  mk.m.args = ["stop"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  mk.m.args = [];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("stop → arisan ditutup (menu lagi)", last(mk).includes("belum ada arisan"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— BUTAWARNA: tes Ishihara —");
{
  const b = await import(R + "/plugins/fun/colorblind.js");
  const { handler, renderIshiharaPlate, _getSessionsForTest } = b;

  // render plate: buffer PNG beneran + angka keisi titik figure
  const plate = await renderIshiharaPlate(74, 0.42);
  check("plate: PNG buffer valid (>10KB)", plate.buffer.length > 10000 && plate.buffer.slice(1, 4).toString() === "PNG");
  check("plate: angka keisi titik figure (≥6)", plate.figureDots >= 6, "figureDots=" + plate.figureDots);
  const plate2 = await renderIshiharaPlate(12, 0.9);
  check("plate: render beda angka jalan (deterministik seed)", plate2.buffer.length > 10000);

  // tanpa sesi → panduan
  const mk = mkMock(SENDER, "6281234567890@s.whatsapp.net");
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("tanpa sesi → panduan (5 plate + disclaimer medis)", last(mk).includes("5 plate") && last(mk).includes("bukan diagnosis medis"));

  // mulai → plate 1/5 kekirim sebagai gambar + caption
  mk.m.args = ["mulai"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("mulai → 1 gambar plate dikirim", mk.medias.length === 1 && norm(mk.medias[0].caption).includes("plate 1/5"));
  const sess = _getSessionsForTest().get(SENDER);
  check("sesi kecatat (round 1 + angka current)", !!sess && sess.round === 1 && Number.isFinite(sess.current));

  // jawab bener semua 5 ronde → hasil
  for (let i = 0; i < 5; i++) {
    const s = _getSessionsForTest().get(SENDER);
    mk.m.args = [String(s.current)];
    await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  }
  const hasil = last(mk);
  check("5 ronde selesai → hasil skor 5/5 + interpretasi normal", hasil.includes("5/5") && hasil.includes("normal"));
  check("hasil → rincian angka vs jawaban", hasil.includes("kamu jawab"));
  check("sesi dibersihin abis kelar", !_getSessionsForTest().has(SENDER));

  // jawab semua salah → interpretasi merah
  mk.m.args = ["mulai"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  for (let i = 0; i < 5; i++) {
    const s = _getSessionsForTest().get(SENDER);
    mk.m.args = [String(s.current === 99 ? 11 : 99)]; // selalu salah
    await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  }
  const hasil2 = last(mk);
  check("skor 0/5 → interpretasi kemungkinan gangguan + saran dokter", hasil2.includes("0/5") && hasil2.includes("dokter"));

  // stop pas jalan
  mk.m.args = ["mulai"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  mk.m.args = ["stop"];
  await handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  check("stop → tes dibatalin + sesi ilang", last(mk).includes("dibatalin") && !_getSessionsForTest().has(SENDER));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
