// E2E: .rules — rules berisi kalimat peraturan beneran (bukan "1. 1.tes\n2.tes"
// sisa tes) + gak ada emoji bahaya ⚠ (owner 20 Sep 2026).
// Jalankan: node test/rules-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { fromSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);

fs.rmSync("/tmp/rules-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-database.js")).href);
await initDatabase("/tmp/rules-e2e-db/nova.json");
const db = getDatabase();

const { config: cfg, handler } = await import(pathToFileURL(path.join(REPO, "plugins/main/rules.js")).href);

t("1a. config name = rules, kategori main", cfg.name === "rules" && cfg.category === "main");

const replies = [];
function mockM() {
  return {
    text: "rules", prefix: ".", command: "rules", args: ["rules"],
    chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
    pushName: "Uji", isGroup: false, isOwner: false, quoted: null,
    reply: async (txt) => replies.push(String(txt)),
  };
}
const botConfig = { bot: { name: "Nova-AI" } };

// ── case 2: tanpa custom rules → DEFAULT (kalimat peraturan beneran) ──
{
  replies.length = 0;
  await handler(mockM(), { sock: {}, config: botConfig });
  const r = fromSC(replies[0] || "");
  t("2a. default rules: ada 8 kalimat peraturan lengkap", /bijak/.test(r) && /spam/i.test(r) && /maintenance/i.test(r), r.slice(0, 120));
  t("2b. nomor urut jalan (1. 2. 3.), BUKAN dobel '1. 1.'", /\n1\. /.test(r) && !/1\. 1\./.test(r), r.slice(0, 120));
  t("2c. TANPA emoji bahaya ⚠ (owner: hapus aja)", !r.includes("⚠"), r.match(/⚠/g)?.[0] || "");
  t("2d. peringatan banned tetap ada (teks polos tanpa ⚠)", /banned/i.test(r));
}

// ── case 3: nilai tes lama literal \n (kasus settings.json lama "1.tes\n2. tes") ──
{
  db.setting("botRules", "1.tes\\n2. tes");
  replies.length = 0;
  await handler(mockM(), { sock: {}, config: botConfig });
  const r = fromSC(replies[0] || "");
  t("3a. literal \\n dipotong jadi item terpisah (bukan '1. 1.tes\\n2. tes')", !/1\. 1\.tes/.test(r), r.slice(0, 120));
  t("3b. nomor dobel gak terjadi", !/\d\. \d\./.test(r), r.slice(0, 120));
  t("3c. teks literal '\\n' gak muncul di output", !r.includes("\\n"));
}

// ── case 4: custom rules array dari owner ──
{
  db.setting("botRules", ["Jangan ngotori grup", "Sopan santun itu wajib"]);
  replies.length = 0;
  await handler(mockM(), { sock: {}, config: botConfig });
  const r = fromSC(replies[0] || "");
  t("4a. custom array dirender apa adanya", /ngotori grup/i.test(r) && /sopan santun/i.test(r), r.slice(0, 120));
}

// ── case 5: custom string pakai nomor sendiri dari .setrules ──
{
  db.setting("botRules", "1. Dilarang flood\n2. No SARA\n• Jangan toxic");
  replies.length = 0;
  await handler(mockM(), { sock: {}, config: botConfig });
  const r = fromSC(replies[0] || "");
  t("5a. nomor/bullet milik owner DIBUANG, diganti nomor bot", /1\. dilarang flood/i.test(r) && !/1\. 1\./.test(r), r.slice(0, 120));
  t("5b. bullet • ikut dibersihin", /3\. jangan toxic/i.test(r), r.slice(0, 120));
}

// ── case 6: settings.json baru → botRules null (fallback default) ──
{
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "src/data/main/settings.json"), "utf8"));
  t("6a. settings.json botRules = null (bukan nilai tes lama)", d.botRules === null, JSON.stringify(d.botRules));
}

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
