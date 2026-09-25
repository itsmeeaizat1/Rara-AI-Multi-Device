// E2E Kalori AI (ide fitur no 2, 12 Sep 2026): estimasi kalori foto/teks
// + log harian + target + laporan 7 hari (chart) + hapus/reset.
// Estimator AI di-inject via seam — gak nyamber AI live.
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/kalori-e2e-db/nova.json");
const db = getDatabase();

const { config, handler, parseEstimate, _setKaloriEstimatorsForTest } = await import(R + "/plugins/ai/calories.js");
const { toSC } = await import(R + "/src/lib/nova-menu-style.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
// reply bot di-smallcaps guard global → normalize ke plain biar assert gampang
const norm = (s) => fromSC(String(s || ""));

t("1a. plugin name kalori + kategori ai", config.name === "kalori" && config.category === "ai");

// ═══ 2. parseEstimate — robust JSON dari jawaban AI ═══
out("\n— parseEstimate —");
const ok = parseEstimate('```json\n{"menu":[{"nama":"Nasi goreng","kalori":500},{"nama":"Es teh manis","kalori":90}],"total":590,"catatan":"Porsi standar warung"}\n```');
t("2a. parse dengan code fence", ok && ok.total === 590 && ok.menu.length === 2);
const noisy = parseEstimate('Berikut estimasi: {"menu":[{"nama":"Ayam goreng","kalori":250}],"total":250,"catatan":"x"} semoga membantu!');
t("2b. parse dengan teks ngambang", noisy && noisy.total === 250);
t("2c. total auto-hitung kalau total kosong", parseEstimate('{"menu":[{"nama":"Sate","kalori":300},{"nama":"Bakso","kalori":400}],"total":0}').total === 700);
t("2d. bukan JSON → null", parseEstimate("maaf saya tidak bisa") === null);
t("2e. menu kosong → null", parseEstimate('{"menu":[],"total":0}') === null);

// ═══ 3. handler — flow estimasi teks (estimator injected) ═══
out("\n— estimasi + log —");
const replies = [];
const sent = [];
function mockM(args, opts = {}) {
  return {
    command: "kalori", args, text: args.join(" "), prefix: ".",
    chat: "6287777@s.whatsapp.net", sender: "6287777@s.whatsapp.net", pushName: "Tester",
    isGroup: false, isOwner: false, isImage: !!opts.isImage,
    quoted: opts.quoted || null,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = {
  sendMedia: async (chat, buf, q, m, opts) => { sent.push({ chat, buf, opts }); },
  sendMessage: async () => {},
};

// estimator teks: jawab sesuai makanan yang ditanya
let fakeReply = '{"menu":[{"nama":"Nasi goreng spesial","kalori":600},{"nama":"Telur mata sapi","kalori":90}],"total":690,"catatan":"Porsi besar"}';
_setKaloriEstimatorsForTest({ text: async () => fakeReply });

await handler(mockM(["nasi goreng spesial + telur"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r1 = replies.at(-1) || "";
t("3a. estimasi teks: total 690 kkal tampil", r1.includes("690"), r1.slice(0, 120));
t("3b. item menu tampil", r1.includes("Nasi goreng spesial"));
t("3c. auto-log: sisa target default 2000 → 1310", r1.includes("1310"), r1.slice(0, 200));

// entry kedua — log hari ini numpuk
fakeReply = '{"menu":[{"nama":"Es teh manis","kalori":90}],"total":90,"catatan":""}';
await handler(mockM(["es teh manis"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r2 = replies.at(-1) || "";
t("3d. estimasi kedua: sisa 1220 (690+90 dari 2000)", r2.includes("1220"), r2.slice(0, 200));

// log hari ini
await handler(mockM(["log"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r3 = replies.at(-1) || "";
t("3e. log: 2 entri + total 780", norm(r3).includes("780") && /2x makan/.test(norm(r3)), norm(r3).slice(0, 150));

// target
await handler(mockM(["target", "1800"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3f. target 1800 disimpan", (replies.at(-1) || "").includes("1800"));
await handler(mockM(["target", "10"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3g. target 10 ditolak (< 500)", /(500-10000|Target sekarang)/.test(replies.at(-1) || ""));

// lewat target → warning
fakeReply = '{"menu":[{"nama":"Mie ayam jumbo","kalori":1500}],"total":1500,"catatan":""}';
await handler(mockM(["mie ayam jumbo"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r4 = replies.at(-1) || "";
t("3h. total 2280 > target 1800 → warning lewat", r4.includes("Melebihi target") || r4.includes("480"), r4.slice(0, 250));

// ═══ 4. estimasi foto (vision injected) ═══
out("\n— estimasi foto —");
const fakeImg = Buffer.from("89504e470d0a1a0a" + "00".repeat(20), "hex");
const quotedImg = { isImage: true, download: async () => fakeImg };
_setKaloriEstimatorsForTest({ vision: async ({ imageBuffer }) => {
  if (!Buffer.isBuffer(imageBuffer)) return { status: false, error: "no buffer" };
  return { status: true, engine: "gemini-vision", text: '{"menu":[{"nama":"Nasi padang","kalori":800},{"nama":"Rendang","kalori":350}],"total":1150,"catatan":"Kuah gurih"}' };
} });
await handler(mockM([], { isImage: true, quoted: quotedImg }), { sock: sockMock, config: { command: { prefix: "." } } });
const r5 = replies.at(-1) || "";
t("4a. estimasi foto: total 1150 + engine vision", r5.includes("1150") && r5.includes("gemini-vision"), r5.slice(0, 150));
t("4b. format foto pake 📸", r5.includes("📸"));

// foto tanpa buffer → error sopan
const quotedBad = { isImage: true, download: async () => Buffer.alloc(0) };
await handler(mockM([], { isImage: true, quoted: quotedBad }), { sock: sockMock, config: { command: { prefix: "." } } });
t("4c. download gagal → pesan error", /(gagal)/i.test(norm(replies.at(-1))));

// AI balas sampah → estimasi gagal sopan
_setKaloriEstimatorsForTest({ vision: async () => ({ status: true, engine: "x", text: "saya tidak melihat makanan" }) });
await handler(mockM([], { isImage: true, quoted: quotedImg }), { sock: sockMock, config: { command: { prefix: "." } } });
t("4d. jawaban bukan JSON → pesan gagal estimasi", /(tidak bisa estimasi|lebih spesifik)/i.test(norm(replies.at(-1))));

// ═══ 5. hapus + reset ═══
out("\n— hapus / reset —");
const user1 = db.getUser("6287777@s.whatsapp.net") || {};
t("5a. persist: entri tersimpan di user.kalori", Array.isArray(user1.kalori?.entries) && user1.kalori.entries.length >= 3, JSON.stringify(user1.kalori?.entries?.length));
t("5b. persist: target 1800 tersimpan", Number(user1.kalori?.target) === 1800);

const beforeDel = ((db.getUser("6287777@s.whatsapp.net") || {}).kalori?.entries || []).length;
await handler(mockM(["hapus"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("5c. hapus: entri terakhir dihapus (balasan nunjukin item)", /(dihapus)/i.test(norm(replies.at(-1))), norm(replies.at(-1)).slice(0, 80));
const afterDel = ((db.getUser("6287777@s.whatsapp.net") || {}).kalori?.entries || []).length;
t("5d. jumlah entri berkurang 1", afterDel === beforeDel - 1, `${beforeDel} → ${afterDel}`);

await handler(mockM(["reset"]), { sock: sockMock, config: { command: { prefix: "." } } });
const afterReset = (db.getUser("6287777@s.whatsapp.net") || {}).kalori;
t("5e. reset: log kosong, target tetap 1800", Array.isArray(afterReset?.entries) && afterReset.entries.length === 0 && Number(afterReset?.target) === 1800, JSON.stringify(afterReset));

await handler(mockM(["hapus"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("5f. hapus saat kosong → pesan log kosong", /(masih kosong|gak ada)/i.test(norm(replies.at(-1))));

// ═══ 6. laporan 7 hari (chart) ═══
out("\n— laporan —");
// seed 3 hari entri manual
const now = Date.now();
for (const [off, tot] of [[2, 2000], [1, 2200], [0, 1500]]) {
  db.setUser("6287777@s.whatsapp.net", {
    kalori: {
      target: 1800,
      entries: [...((db.getUser("6287777@s.whatsapp.net") || {}).kalori?.entries || []), { ts: now - off * 86400_000, name: "makanan", items: [], total: tot }],
    },
  });
}
await handler(mockM(["laporan"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("6a. chart PNG dikirim (sendMedia)", sent.length >= 1 && Buffer.isBuffer(sent.at(-1)?.buf) && sent.at(-1).buf[0] === 0x89, `sent=${sent.length}`);
const r6 = replies.at(-1) || "";
t("6b. rekap: total 5700 kkal", r6.includes("5700"), r6.slice(0, 150));
t("6c. rekap: rata-rata 1900", r6.includes("1900"), r6.slice(0, 150));
t("6d. rekap: 3/7 hari tercatat", r6.includes("3/7"));

// ═══ 7. panduan no-arg ═══
await handler(mockM([]), { sock: sockMock, config: { command: { prefix: "." } } });
t("7a. no-arg → panduan fitur", /kalori/i.test(norm(replies.at(-1))) && /(reply|log)/i.test(norm(replies.at(-1))), norm(replies.at(-1)).slice(0, 80));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
await new Promise((r) => setTimeout(r, 400));
process.exit(fail ? 1 : 0);
