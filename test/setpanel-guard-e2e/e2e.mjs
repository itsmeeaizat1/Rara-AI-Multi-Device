// RARA AI - MULTI DEVICE — E2E: guard .setpanel anti domain-salah
// (8 Okt 2026): insiden `.setpanel v1 <ptla_key>` tanpa kata apikey → domain = https://ptla_...
// → .cpanel create gagal ENOTFOUND ptla_... Guard: value ptla_/ptlc_ sebagai domain DITOLAK
// di lib (setPanelField) + pesan arahan di plugin.
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
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

const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "setpanel-guard-e2e-db-" + Date.now()));

const { setPanelField, getPanel, _setPanelStoreForTest } = await import(R + "/src/lib/panel/index.js");
const tmpStore = path.join(os.tmpdir(), "setpanel-guard-e2e-store-" + Date.now() + ".json");
fs.writeFileSync(tmpStore, "{}", "utf8");
_setPanelStoreForTest(tmpStore);

// ═══ SECTION 1: guard lib setPanelField ═══
section("1. lib: setPanelField menolak key sebagai domain");

let r = setPanelField(1, "domain", "ptla_gityy8CtyMjYvDd0CAf9iYLChS9cfsNnqAhDamL4iWN");
t("1a. domain ptla_ ditolak", r.success === false && /API key/i.test(r.error || ""), r);
r = setPanelField(1, "domain", "https://ptla_gityy8CtyMjYvDd0CAf9iYLChS9cfsNnqAhDamL4iWN");
t("1b. domain https://ptla_ (korup lama) ditolak", r.success === false && /API key/i.test(r.error || ""), r);
r = setPanelField(1, "domain", "ptlc_SfPqcdejaqrW7MIECUFRpvlzzPJQtrvdrsezTBQH0U6");
t("1c. domain ptlc_ ditolak", r.success === false && /API key/i.test(r.error || ""), r);
const store1 = JSON.parse(fs.readFileSync(tmpStore, "utf8"));
t("1d. store gak kena imbas tolakan", !store1.server1 || (store1.server1.domain === undefined), store1);

r = setPanelField(1, "domain", "http://aizatstore.pteroqdactyl.my.id");
t("1e. domain bener diterima", r.success === true && getPanel(1).domain === "http://aizatstore.pteroqdactyl.my.id", r);
r = setPanelField(1, "apikey", "ptla_gityy8CtyMjYvDd0CAf9iYLChS9cfsNnqAhDamL4iWN");
t("1f. apikey ptla_ tetap boleh", r.success === true && getPanel(1).apikey?.startsWith("ptla_"), r);
r = setPanelField(1, "capikey", "ptlc_SfPqcdejaqrW7MIECUFRpvlzzPJQtrvdrsezTBQH0U6");
t("1g. capikey ptlc_ tetap boleh", r.success === true && getPanel(1).capikey?.startsWith("ptlc_"), r);
r = setPanelField(1, "egg", "16");
t("1h. field egg jalan", r.success === true && getPanel(1).egg === "16", r);

// ═══ SECTION 2: handler .setpanel ═══
section("2. handler: pesan arahan + domain benar");

const { handler } = await import(R + "/plugins/owner/setpanel.js");
const { default: appConfig } = await import(R + "/config.js");

let replies = [];
function mkM(text) {
  return {
    command: "setpanel", args: text.split(/\s+/), text, prefix: ".",
    sender: "628000111222@s.whatsapp.net", chat: "628000111222@s.whatsapp.net",
    isOwner: true, isGroup: false, mentionedJid: null, quoted: null,
    react: async () => {},
    reply: async (x) => replies.push(String(x)),
  };
}
const lastReply = () => replies.at(-1) || "";

// 2a. insiden: key tanpa kata apikey → ditolak + arahan
await handler(mkM("v1 ptla_gityy8CtyMjYvDd0CAf9iYLChS9cfsNnqAhDamL4iWN"), {});
t("2a. key ptla_ tanpa kata apikey → ditolak + saran apikey",
  /API key/i.test(lastReply()) && /apikey ptla_/i.test(lastReply()), lastReply().slice(0, 160));
t("2b. domain di store gak berubah jadi key", getPanel(1).domain === "http://aizatstore.pteroqdactyl.my.id", getPanel(1).domain);

// 2b. capikey keliru juga diarahkan
await handler(mkM("v1 ptlc_SfPqcdejaqrW7MIECUFRpvlzzPJQtrvdrsezTBQH0U6"), {});
t("2c. key ptlc_ → saran capikey", /capikey ptlc_/i.test(lastReply()), lastReply().slice(0, 160));

// 2c. domain benar → sukses
await handler(mkM("v1 panel.contoh.com"), {});
t("2d. domain tanpa scheme → auto https:// + sukses",
  /berhasil/i.test(lastReply()) && getPanel(1).domain === "https://panel.contoh.com", getPanel(1).domain);

// 2d. apikey via keyword → sukses (jalur normal)
await handler(mkM("v1 apikey ptla_betul12345678"), {});
t("2e. .setpanel v1 apikey ptla_ → sukses", /berhasil/i.test(lastReply()) && getPanel(1).apikey === "ptla_betul12345678", lastReply().slice(0, 120));

// 2e. config memori ikut ter-update (jalur legacy)
t("2f. config.pterodactyl ikut sync", appConfig.pterodactyl?.server1?.domain === "https://panel.contoh.com", appConfig.pterodactyl?.server1);

// ═══ HASIL ═══
console.log(`\n${"=".repeat(50)}\nSETPANEL-GUARD E2E: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
