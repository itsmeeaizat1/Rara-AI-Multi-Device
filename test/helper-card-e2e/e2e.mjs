// E2E: m.reply asli — pesan helper otomatis jadi kartu thumbnail ala .menu
import fs from "fs"; import path from "path"; import os from "os";
const R = path.resolve("."); process.chdir(R);
let pass = 0, fail = 0; const w = (s) => process.stdout.write(s + "\n");
const t = (n, c, x) => { c ? (pass++, w("  ✅ " + n)) : (fail++, w("  ❌ " + n + (x ? " — " + x : ""))); };
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(fs.mkdtempSync(path.join(os.tmpdir(), "helpercard-")) + "/db.json");
const ms = await import(R + "/src/lib/rara-menu-style.js");
const ta = await import(R + "/src/lib/rara-thumb-asset.js");
const { serialize } = await import(R + "/src/lib/rara-serialize.js");
const np = await import(R + "/src/lib/rara-plugins.js");
np.registerPlugin({ config: { name: "zzhelp", alias: [], category: "zzcat" }, handler() {} });

// 1. helper TIDAK berubah (gak ada karakter aneh) + terdeteksi pola
const H = {
  raraError: ms.raraError("zzhelp", "gagal bro"), raraEmpty: ms.raraEmpty("zzhelp", "x"),
  raraNoInput: ms.raraNoInput("zzhelp", "h", ".zzhelp a"), raraNoQuoted: ms.raraNoQuoted("zzhelp", "image"),
  raraSuccess: ms.raraSuccess("zzhelp", "ok"), raraSalah: ms.raraSalah("zzhelp", "salah"),
};
for (const [n, v] of Object.entries(H)) {
  t("1. " + n + " terdeteksi helper, nama zzhelp", ta.detectHelper(v, "zzhelp")?.name === "zzhelp", JSON.stringify(ta.detectHelper(v, "zzhelp")));
  t("1. " + n + " output bersih (tanpa penanda)", !/[\u2063\u2064\u200b]/.test(v));
}
t("1g. raraGuide terdeteksi", !!ta.detectHelper(ms.raraGuide("zzhelp", "intro", ".zzhelp a"), "zzhelp"));
t("1h. teks biasa BUKAN helper", ta.detectHelper("halo kak apa kabar", "x") === null && ta.detectHelper("「 ✦ MENU ✦ 」\nisi biasa", "x") === null);
t("1i. teks panjang (>1500) bukan helper", ta.detectHelper("❗ Cara pemakaian salah " + "x".repeat(2000), "x") === null);

// 2. m.reply asli
const dir = path.join(R, "assets/image/usage/zzcat"); fs.mkdirSync(dir, { recursive: true });
const mkSock = (rec) => ({
  user: { id: "628999999999:1@s.whatsapp.net", jid: "628999999999@s.whatsapp.net" },
  sendMessage: async (jid, c) => { rec.push({ kind: "send", c }); return { key: { id: "x" } }; },
  relayMessage: async (j, st) => { rec.push({ kind: "relay", st }); return {}; },
  waUploadToServer: async () => ({ url: "u", mediaKey: Buffer.alloc(32), fileSha256: Buffer.alloc(32), fileEncSha256: Buffer.alloc(32), directPath: "/x" }),
});
const ser = (rec) => serialize(mkSock(rec), { key: { remoteJid: "628555000111@s.whatsapp.net", fromMe: false, id: "A1" }, message: { conversation: ".zzhelp" }, pushName: "A" }, {});
const card = (rec) => rec.find((r) => r.kind === "relay")?.st?.viewOnceMessage?.message?.interactiveMessage;
try {
  fs.writeFileSync(path.join(dir, "zzhelp.gif"), "GIF89a-x");
  let rec = []; let m = await ser(rec);
  await m.reply(H.raraError);
  let c = card(rec);
  t("2a. m.reply(raraError) → kartu header VIDEO dari asset zzcat/zzhelp.gif", !!c?.header?.videoMessage);
  t("2b. chip tag di bawah (messageParamsJson) terisi", !!c?.nativeFlowMessage?.messageParamsJson);
  t("2c. body kartu = teks helper", /gagal bro/i.test(c?.body?.text || "") || /ɢᴀɢᴀʟ/.test(c?.body?.text || ""));

  fs.rmSync(path.join(dir, "zzhelp.gif")); fs.writeFileSync(path.join(dir, "zzhelp.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  rec = []; m = await ser(rec); await m.reply(H.raraSalah);
  t("2d. raraSalah + jpg asset → header IMAGE", !!card(rec)?.header?.imageMessage);

  rec = []; m = await ser(rec); await m.reply("halo biasa bukan helper");
  t("2e. teks biasa TIDAK jadi kartu usage (jalur reply lama)", !(card(rec)?.header?.imageMessage || card(rec)?.header?.videoMessage));

  rec = []; m = await ser(rec); await m.reply(H.raraError, { raw: true });
  t("2f. opsi raw → tidak jadi kartu usage", !(card(rec)?.header?.imageMessage || card(rec)?.header?.videoMessage));

  rec = []; const sk = mkSock(rec); sk.relayMessage = async () => { throw new Error("boom"); };
  m = await serialize(sk, { key: { remoteJid: "628555000111@s.whatsapp.net", fromMe: false, id: "A2" }, message: { conversation: ".zzhelp" }, pushName: "A" }, {});
  const r = await m.reply(H.raraError);
  t("2g. kartu gagal → pesan TETAP terkirim (teks), gak mati senyap", rec.some((x) => x.kind === "send") && r !== undefined);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }

w(`\n===== ${pass} PASS, ${fail} FAIL =====`); process.exit(fail ? 1 : 0);
