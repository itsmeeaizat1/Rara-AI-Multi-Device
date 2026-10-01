// E2E: .tutorial — 12 contoh penggunaan lengkap (owner 20 Sep 2026).
// Jalankan: node test/tutorial-e2e/e2e.mjs
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
const { config: cfg, handler } = await import(pathToFileURL(path.join(REPO, "plugins/main/tutorial.js")).href);

t("1a. config name=tutorial alias carapakai/panduan", cfg.name === "tutorial" && cfg.alias.includes("carapakai") && cfg.alias.includes("panduan"));

const replies = [];
await handler(
  { text: "tutorial", prefix: ".", reply: async (x) => replies.push(String(x)) },
  { config: { bot: { name: "Rara-AI" } } }
);
const r = fromSC(replies[0] || "");

t("2a. ada 12 contoh penggunaan (nomor 1..12)", ["1.","2.","3.","4.","5.","6.","7.","8.","9.","10.","11.","12."].every((n) => r.includes("\n" + n + " ") || r.includes("\n" + n + " ")));

t("3a. pengenalan (menu/allmenu)", /\.menu/i.test(r) && /\.allmenu/i.test(r));
t("3b. AI (.raraagent)", /\.raraagent/i.test(r));
t("3c. stiker (.sticker)", /\.sticker/i.test(r));
t("3d. lagu (.play)", /\.play/i.test(r));
t("3e. downloader (.tiktok/.ytmp4/.alldl)", /\.tiktok/i.test(r) && /\.ytmp4/i.test(r) && /\.alldl/i.test(r));
t("3f. grup (.tagall/.kick/.welcome)", /\.tagall/i.test(r) && /\.kick/i.test(r) && /\.welcome/i.test(r));
t("3g. anti (.antispam/.antisticker)", /\.antispam/i.test(r) && /\.antisticker/i.test(r));
t("3h. switch (.switch auto)", /\.switch auto/i.test(r));
t("3i. rpg (.dailyreward/.adventure/.huntingadventure/.levelinfo)", /\.dailyreward/i.test(r) && /\.adventure/i.test(r) && /\.huntingadventure/i.test(r) && /\.levelinfo/i.test(r));
t("3j. info (.rules/.owner/.donasi)", /\.rules/i.test(r) && /\.owner/i.test(r) && /\.donasi/i.test(r));

// FIX OWNER 20 Sep: semua baris isi RATA KIRI (gak ada spasi di awal nomor/teks)
const raw = replies[0] || "";
const indented = raw.split("\n").filter((l) => /^ +[^\s]/.test(l));
t("4z. semua baris isi rata kiri (tanpa spasi di awal)", indented.length === 0, JSON.stringify(indented.slice(0, 3)));

// command yang disebut beneran ada di repo
const files = [];
for (const dir of fs.readdirSync(path.join(REPO, "plugins"), { withFileTypes: true })) {
  if (dir.isDirectory()) for (const f of fs.readdirSync(path.join(REPO, "plugins", dir.name))) files.push(path.join("plugins", dir.name, f));
}
const allSrc = files.map((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");
const cmds = [...new Set([...r.matchAll(/\.([a-z0-9]+)/gi)].map((x) => x[1].toLowerCase()))];
const known = ["menu","allmenu","raraagent","sticker","play","tiktok","ytmp4","alldl","hd","remini","toanime","tagall","kick","welcome","groupinfo","antispam","antisticker","antilinkgc","antitoxic","switch","dailyreward","adventure","berburu","levelinfo","rules","owner","donasi","tutorial"];
// cocokin name: 'x' / name: ["x",...] / alias array — semua bentuk pluginConfig
const missing = known.filter((c) =>
  !new RegExp("name:\\s*(['\"]" + c + "['\"]|\\[[^\\]]*['\"]" + c + "['\"])").test(allSrc) &&
  !new RegExp("alias:\\s*\\[[^\\]]*['\"]" + c + "['\"]").test(allSrc));
t("4a. semua command yang disebut ADA di repo (bukan karangan)", missing.length === 0, "hilang: " + missing.join(","));

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
