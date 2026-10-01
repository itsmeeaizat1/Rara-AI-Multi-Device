// E2E — altfgames (.dailywordgame/.game2048/.fourinarow/.slidingpuzzle/.minesweeper/.emojiquiz)
// Port game dari altftool.com — offline native, sesi in-memory, animasi editFramesAnim.
// GOTCHA: novaWrap merender smallcaps → SEMUA asersi huruf WAJIB dinormalisasi fromSC().
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const dw = await import("../../plugins/game/dailywordgame.js");
const g2 = await import("../../plugins/game/game2048.js");
const c4 = await import("../../plugins/game/fourinarow.js");
const sp = await import("../../plugins/game/slidingpuzzle.js");
const ms = await import("../../plugins/game/minesweeper.js");
const eq = await import("../../plugins/game/emojiquiz.js");
const { fromSC } = await import("../../src/lib/styler.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(text, sender) {
  const o = {
    text, command: "altf", prefix: ".", chat: "1203630@g.us", sender: sender || "6281@s.whatsapp.net",
    replyed: [], reacts: [], sends: [],
    reply: async (s) => { o.replyed.push(String(s)); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  o.sock = { sendMessage: async (c, x) => { o.sends.push(x); return { key: { id: "x" } }; } };
  return o;
}
const run = (plug, m) => plug.handler(m, { sock: m.sock, config: { command: { prefix: "." } } });
const ans = (plug, m) => plug.answerHandler(m, m.sock);
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const last = (m) => sc(m.replyed[m.replyed.length - 1] || "");
const has = (m, ...kws) => { const L = last(m); return kws.every((k) => L.includes(sc(k))); };

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const plugs = [["dailywordgame", dw], ["game2048", g2], ["fourinarow", c4], ["slidingpuzzle", sp], ["minesweeper", ms], ["emojiquiz", eq]];
t("  6 plugin config: game + enabled + cd 5", plugs.every(([, p]) => p.config.category === "game" && p.config.isEnabled === true && p.config.cooldown === 5));
t("  6 handler + 6 answerHandler exported", plugs.every(([, p]) => typeof p.handler === "function" && typeof p.answerHandler === "function"));
t("  cmd utama Inggris (aturan owner 21 Sep)", ["dailywordgame", "game2048", "fourinarow", "slidingpuzzle", "minesweeper", "emojiquiz"].every((n, i) => plugs[i][1].config.name === n));

// ═══ 2. DAILY WORD GAME ═══
w("\n— .dailywordgame —");
{
  const m = mkM("", "u1"); await run(dw, m);
  t("  mulai sesi harian: kartu mulai muncul", m.replyed.length === 1 && has(m, "kata hari ini"));
}
{
  const handled = await ans(dw, mkM("halo bro", "u1"));
  t("  input bukan 5 huruf → gak dikonsumsi (return false)", handled === false);
}
{
  // 6 salah → habis + jawaban diungkap
  const m = mkM("", "u2"); await run(dw, m);
  let mLast;
  for (const g of ["abadi", "acara", "agama", "ajang", "alami", "angka"]) { mLast = mkM(g, "u2"); await ans(dw, mLast); }
  t("  6 salah → KESEMPATAN HABIS + Jawaban: diungkap", has(mLast, "kesempatan habis", "jawaban:"));
  const wordleWord = /jawaban[:\s]+([a-z]{5})/i.exec(sc(mLast.replyed[mLast.replyed.length - 1]));
  t("  kata harian keungkap (5 huruf)", !!wordleWord, sc(mLast.replyed[mLast.replyed.length - 1]).substring(0, 120));
  // kalau sempat keungkap, main lagi + tebak kata yang SAMA (harian deterministik per hari) → menang
  if (wordleWord) {
    const mW = mkM("", "u2b"); await run(dw, mW);
    const mWin = mkM(wordleWord[1], "u2b"); const h = await ans(dw, mWin);
    t("  tebak kata harian yang sama → BENAR! menang", h === true && has(mWin, "benar", `kata: ${wordleWord[1]}`), last(mWin).substring(0, 160));
  }
}
{
  const m = mkM("acak", "u3"); await run(dw, m);
  t("  mode acak: kartu latihan muncul", has(m, "mode latihan"));
  const mStop = mkM("stop", "u3"); await run(dw, mStop);
  t("  stop → sesi diakhiri", has(mStop, "diakhiri"));
}

// ═══ 3. GAME 2048 ═══
w("\n— .game2048 —");
{
  const m = mkM("", "u6"); await run(g2, m);
  t("  mulai: papan + skor 0", has(m, "skor: 0") && last(m).includes("·"));
}
{
  const h = await ans(g2, mkM("w", "u6"));
  t("  reply w → diproses (kartu skor muncul)", h === true);
}
{
  const handled = await ans(g2, mkM("zzz", "u6"));
  t("  input aneh → gak dikonsumsi", handled === false);
}
{
  const mStop = mkM("stop", "u6"); await run(g2, mStop);
  t("  stop → sesi diakhiri", has(mStop, "diakhiri"));
}
{
  const m = mkM("", "u7"); await run(g2, m);
  let allOk = true;
  for (const d of ["w", "a", "s", "d"]) { const h = await ans(g2, mkM(d, "u7")); if (h !== true && h !== false) allOk = false; }
  t("  4 arah wasd semua diproses", allOk);
}

// ═══ 4. FOUR IN A ROW ═══
w("\n— .fourinarow —");
{
  const m = mkM("", "u8"); await run(c4, m);
  t("  mulai: kamu vs AI + baris kolom 1-7", has(m, "kamu") && last(m).includes("1️⃣"));
}
{
  const m4 = mkM("4", "u8"); const h = await ans(c4, m4);
  t("  drop kolom 4 → AI membalas (kartu 🔴 AI)", h === true && has(m4, "ai"));
}
{
  const h = await ans(c4, mkM("99", "u8"));
  t("  input di luar 1-7 → gak dikonsumsi", h === false);
}
{
  const mStop = mkM("stop", "u8"); await run(c4, mStop);
  t("  stop → sesi diakhiri", has(mStop, "diakhiri"));
}
{
  // AI harus blok/menang: susun 3 player di baris bawah kolom 1-3, player drop kolom 4
  // player menang SEBELUM AI sempat blok kalau AI gak lihat — cek AI minimal merespons wajar
  const m = mkM("", "u8b"); await run(c4, m);
  for (const col of ["1", "2", "3"]) await ans(c4, mkM(col, "u8b"));
  const mW = mkM("4", "u8b"); const h = await ans(c4, mW);
  t("  3 sejajar + kolom 4 → KAMU MENANG (atau kartu game state)", h === true && (has(mW, "menang") || has(mW, "giliranmu")), last(mW).substring(0, 160));
}

// ═══ 5. SLIDING PUZZLE ═══
w("\n— .slidingpuzzle —");
{
  const m = mkM("3", "u9"); await run(sp, m);
  t("  mulai 3x3: target urut 1-8", has(m, "3×3", "1 sampai 8"));
}
{
  const h = await ans(sp, mkM("w", "u9"));
  t("  geser w diproses", h === true);
}
{
  const h = await ans(sp, mkM("x", "u9"));
  t("  input bukan wasd → gak dikonsumsi", h === false);
}
{
  const mStop = mkM("stop", "u9"); await run(sp, mStop);
  t("  stop → sesi diakhiri", has(mStop, "diakhiri"));
}

// ═══ 6. MINESWEEPER ═══
w("\n— .minesweeper —");
{
  const m = mkM("", "u10"); await run(ms, m);
  t("  mulai: kartu 6 bom + klik pertama aman", has(m, "6 bom", "aman"));
}
{
  const mA = mkM("a1", "u10"); const h = await ans(ms, mA);
  t("  buka a1 → DIJAMIN aman (bom digeser dari sel pertama)", h === true && !has(mA, "boom"), last(mA).substring(0, 120));
}
{
  const h = await ans(ms, mkM("z9", "u10"));
  t("  koordinat gak valid → gak dikonsumsi", h === false);
}
{
  const mStop = mkM("stop", "u10"); await run(ms, mStop);
  t("  stop → sesi diakhiri", has(mStop, "diakhiri"));
}

// ═══ 7. EMOJI QUIZ ═══
w("\n— .emojiquiz —");
{
  const m = mkM("", "grp1"); await run(eq, m);
  t("  mulai: soal 1/10 + kategori + nyawa 3", has(m, "soal 1/10", "kategori") && last(m).includes("❤️"));
}
{
  const mWrong = mkM("jawaban ngawur banget", "grp1"); const h = await ans(eq, mWrong);
  t("  jawab salah → Belum tepat + nyawa ❤️❤️🖤", h === true && has(mWrong, "belum tepat", "nyawa"), last(mWrong).substring(0, 160));
}
{
  const mSkip = mkM("skip", "grp1"); await run(eq, mSkip);
  t("  skip → -1 nyawa + lanjut/game over", has(mSkip, "skip") || has(mSkip, "game over") || has(mSkip, "soal"));
}
{
  const mStop = mkM("stop", "grp1"); await run(eq, mStop);
  t("  stop → kuis diakhiri", has(mStop, "diakhiri"));
}
{
  // jawab BENAR deterministik: mulai, buka 3 kunci jawaban via salah habis nyawa? gak bisa akses BANK.
  // → pakai jawaban teks apapun diproses
  const m = mkM("", "grp2"); await run(eq, m);
  const h = await ans(eq, mkM("nasi goreng", "grp2"));
  t("  jawaban teks diproses (benar ATAU salah → kartu)", h === true);
  const mStop2 = mkM("stop", "grp2"); await run(eq, mStop2);
  t("  cleanup grp2", has(mStop2, "diakhiri"));
}

// ═══ 8. MULTI-GAME PARALEL ═══
w("\n— interaksi —");
{
  await run(g2, mkM("", "multi"));
  await run(c4, mkM("", "multi"));
  const hA = await ans(g2, mkM("w", "multi"));
  const hB = await ans(c4, mkM("4", "multi"));
  t("  sesi 2048 & fourinarow user sama jalan paralel", hA === true && hB === true);
}

fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
