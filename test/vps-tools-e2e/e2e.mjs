// RARA AI - MULTI DEVICE — E2E: VPS tools expand (7 Okt 2026):
// owner: "biar bot support fitur instal panel, instal tema panel, ganti pw vps
// buat user lain yg ingin pw vps diganti, dll lengkap"
// Lib src/lib/rara-vps-registry.js + plugin .gantipwvps/.myvps
// // + wiring registerVps di createvps/linode. SSH di-mock via seam.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 220) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const REG_FILE = path.join(os.tmpdir(), "vps-registry-e2e-" + Date.now() + ".json");
const lib = await import(R + "/src/lib/rara-vps-registry.js");
lib._setRegistryFileForTest(REG_FILE);

// ═══ SECTION 1: lib registry ═══
section("1. lib rara-vps-registry");
t("1a. registerVps → id 1 + owner kebersihkan jid", (() => {
  const e = lib.registerVps({ ip: "103.10.1.1", password: "lama", owner: "628111222333@s.whatsapp.net", provider: "do", label: "vps-a" });
  return e.id === "1" && e.owner === "628111222333";
})());
t("1b. findVps by ip & by id", lib.findVps("103.10.1.1").id === "1" && lib.findVps("1").ip === "103.10.1.1");
t("1c. findVps gak ketemu → null", lib.findVps("999.9.9.9") === null);
t("1d. isOwnerOf pemilik benar / salah nomor", lib.isOwnerOf("628111222333", lib.findVps("103.10.1.1")) === true && lib.isOwnerOf("628777000111", lib.findVps("103.10.1.1")) === false);
t("1e. listByOwner", lib.listByOwner("628111222333").length === 1 && lib.listByOwner("628000000000").length === 0);
t("1f. updateVpsPassword persist", lib.updateVpsPassword("103.10.1.1", "pwnew") && lib.findVps(1).password === "pwnew");
t("1g. re-register ip sama → update ownership (bukan duplikat)", (() => {
  const e = lib.registerVps({ ip: "103.10.1.1", password: "x2", owner: "628777000111", provider: "manual" });
  return e.id === "1" && e.owner === "628777000111" && lib.listAll().length === 1;
})());
t("1h. registerVps tanpa ip/owner → null", lib.registerVps({ password: "x" }) === null);
t("1i. removeVps by id", lib.removeVps(1) === true && lib.findVps("103.10.1.1") === null && lib.removeVps(1) === false);

// ═══ SECTION 2: fake SSH + .gantipwvps ═══
section("2. plugin .gantipwvps");
const gp = await import(R + "/plugins/vps/gantipwvps.js");

// fake ssh2 Client: exec → catat command, close code configurable
let sshCloseCode = 0;
class FakeSsh {
  constructor() { this.handlers = {}; this.execs = []; }
  on(ev, cb) { this.handlers[ev] = cb; return this; }
  connect(opts) { this.opts = opts; setImmediate(() => this.handlers.ready?.()); return this; }
  exec(cmd, _o, cb) {
    this.execs.push(cmd);
    const stream = {
      on(ev, cb2) { if (ev === "close") setImmediate(() => cb2(sshCloseCode)); return stream; },
      stderr: { on: () => {} },
    };
    cb(null, stream);
  }
  end() {}
}
gp._setSshClientForTest(FakeSsh);

// seed registry: vps 1 milik 628111222333, vps 2 milik 628777000111
lib.registerVps({ ip: "1.2.3.4", password: "pwLama", owner: "628111222333", provider: "do", label: "vps-satu" });
lib.registerVps({ ip: "5.6.7.8", password: "pwDua", owner: "628777000111", provider: "linode", label: "vps-dua" });

const replies = [];
const dmSent = [];
function mkM(command, text, opts = {}) {
  return {
    command, args: String(text).split(/\s+/).filter(Boolean), text: String(text),
    prefix: ".", pushName: "Tes",
    sender: opts.sender || "628111222333@s.whatsapp.net", chat: opts.chat || (opts.sender || "628111222333@s.whatsapp.net"),
    isOwner: opts.isOwner ?? false, isGroup: opts.isGroup || false,
    react: async () => {},
    reply: async (x) => replies.push(String(x)),
  };
}
const fakeSock = { sendMessage: async (to, x) => dmSent.push({ to, text: String(x?.text || "") }) };
const replyTxt = () => replies.join("\n");
// flow SSH mock jalan via setImmediate setelah handler balik → tunggu settle
const waitTick = () => new Promise((r) => setTimeout(r, 25));

replies.length = 0;
await gp.handler(mkM("gantipwvps", ""), { sock: fakeSock });
t("2a. tanpa arg → kartu panduan", /Ganti Password VPS/.test(replyTxt()) && /myvps/.test(replyTxt()) && /gantipwvps/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await gp.handler(mkM("gantipwvps", "999.1.1.1"), { sock: fakeSock });
t("2b. VPS gak ditemukan → kartu jelas", /gak ditemukan/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await gp.handler(mkM("gantipwvps", "5.6.7.8", { sender: "628111222333@s.whatsapp.net" }), { sock: fakeSock });
t("2c. VPS milik orang lain → ditolak (bukan pemilik)", /Akses Ditolak/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await gp.handler(mkM("gantipwvps", "2", { sender: "628777000111@s.whatsapp.net" }), { sock: fakeSock });
await waitTick();
t("2d. pemilik VPS bisa ganti pw sendiri → chpasswd jalan", /Password Baru/.test(replyTxt()) && /5\.6\.7\.8/.test(replyTxt()), replyTxt().slice(0, 200));
const pwBaruAuto = lib.findVps("5.6.7.8").password;
t("2e. password acak ke-update di registry", pwBaruAuto !== "pwDua" && /^[A-Za-z0-9]{14}$/.test(pwBaruAuto), pwBaruAuto);

replies.length = 0;
await gp.handler(mkM("gantipwvps", "1 PassBaru99", { sender: "628111222333@s.whatsapp.net" }), { sock: fakeSock });
await waitTick();
t("2f. password custom dipakai (bukan random)", /PassBaru99/.test(replyTxt()) && lib.findVps("1.2.3.4").password === "PassBaru99", replyTxt().slice(0, 200));

replies.length = 0;
await gp.handler(mkM("gantipwvps", "1 pendek"), { sock: fakeSock });
t("2g. password < 8 karakter → ditolak", /gak valid/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await gp.handler(mkM("gantipwvps", '1 "berbahaya"'), { sock: fakeSock });
t("2h. password dengan kutip/dollar ditolak (anti injeksi)", /gak valid/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await gp.handler(mkM("gantipwvps", "1", { sender: "628111222333@s.whatsapp.net", isGroup: true, chat: "628120@g.us" }), { sock: fakeSock });
await waitTick();
t("2i. di grup → kredensial ke DM + notif di grup", dmSent.length >= 1 && /dikirim ke DM/.test(replyTxt()), { dm: dmSent.length, txt: replyTxt().slice(0, 160) });

replies.length = 0; dmSent.length = 0;
await gp.handler(mkM("gantipwvps", "1", { sender: "628555444333@s.whatsapp.net", isOwner: true }), { sock: fakeSock });
await waitTick();
t("2j. owner bot bisa ganti pw VPS siapa pun", /Password Baru/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
sshCloseCode = 1;
await gp.handler(mkM("gantipwvps", "2", { sender: "628777000111@s.whatsapp.net" }), { sock: fakeSock });
await waitTick();
t("2k. command gagal di VPS → error ASLI kelihatan (exit code)", /Gagal/.test(replyTxt()) && /exit 1/.test(replyTxt()), replyTxt().slice(0, 200));
t("2l. password registry GAK ke-update kalau gagal", lib.findVps("5.6.7.8").password === pwBaruAuto);
sshCloseCode = 0;

// ═══ SECTION 3: .myvps ═══
section("3. plugin .myvps");
const my = await import(R + "/plugins/vps/myvps.js");

replies.length = 0;
await my.handler(mkM("myvps", "", { sender: "628000111999@s.whatsapp.net" }), { sock: fakeSock });
t("3a. tanpa VPS → kartu 'belum punya'", /belum punya VPS terdaftar/i.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await my.handler(mkM("myvps", "", { sender: "628111222333@s.whatsapp.net" }), { sock: fakeSock });
t("3b. pemilik lihat VPS miliknya (ip + hint gantipwvps)", /1\.2\.3\.4/.test(replyTxt()) && /gantipwvps 1/.test(replyTxt()) && !/5\.6\.7\.8/.test(replyTxt()), replyTxt().slice(0, 220));

replies.length = 0;
await my.handler(mkM("myvps", "all", { sender: "628111222333@s.whatsapp.net", isOwner: true }), { sock: fakeSock });
t("3c. owner + arg 'all' → semua VPS + baris Pemilik", /5\.6\.7\.8/.test(replyTxt()) && /Pemilik/.test(replyTxt()), replyTxt().slice(0, 260));

replies.length = 0;
await my.handler(mkM("myvps", "all", { sender: "628111222333@s.whatsapp.net", isOwner: false }), { sock: fakeSock });
t("3d. bukan owner + arg 'all' → tetap cuma miliknya", !/5\.6\.7\.8/.test(replyTxt()) && /1\.2\.3\.4/.test(replyTxt()), replyTxt().slice(0, 220));

// ═══ SECTION 4: wiring registerVps di creator ═══
section("4. wiring creator (createvps/linode)");
const cvps = fs.readFileSync(R + "/plugins/vps/createvps.js", "utf-8");
t("4a. createvps: import + registerVps dipanggil setelah sukses", /rara-vps-registry/.test(cvps) && /registerVps\(\{ ip, password, owner: m\.sender, provider: "do"/.test(cvps));
t("4b. createvps: register SEBELUM kirim kartu (kredensial konsisten)", cvps.indexOf("registerVps") < cvps.indexOf("sendMessage(m.sender"));
const lino = fs.readFileSync(R + "/plugins/panel/linode.js", "utf-8");
t("4c. linode: import + registerVps dipanggil", /rara-vps-registry/.test(lino) && /registerVps\(\{ ip: ipAddress, password: rootPass/.test(lino));
t("4d. linode: kartu sukses yang tadinya GAK kekirim ((raraWrap(...)) ekspresi mati) sekarang di-reply", /m\.reply\(raraWrap\("linode", msg\)/.test(lino));

// ═══ SUMMARY ═══
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
