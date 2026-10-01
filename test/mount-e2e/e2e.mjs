// E2E mount — RPG Tunggangan: fix .mount feed (stuck) + animasi khas kandang
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/rara-database.js";

process.env.MOUNT_ANIM_MS = "0"; // animasi kandang instan saat e2e

const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 160) : "")); } };

const dbDir = path.join(process.cwd(), "test", "mount-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const plug = await import(R + "/plugins/rpg/mount.js");
const { handler } = plug;
const SENDER = "6281@s.whatsapp.net";

const sent = [];
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: SENDER, text: "", args: [], mentionedJid: [], pushName: "Pemain", command: "mount", prefix: ".",
    ...o,
    reply: async (x) => { sent.push(String(x)); return true; },
    react: async () => true,
  };
}
const mkSock = () => ({ sendMessage: async (c, p) => { sent.push(p); return true; } });
const run = (command, text) => handler(mkMsg({ command, text }), { sock: mkSock(), text });
const last = () => sc(sent[sent.length - 1]);

console.log("— section 1: dasar —");
await run("mount", "");
t("1a. info tanpa tunggangan", last().includes("belum punya tunggangan"));
await run("mount", "list");
t("1b. list 4 tunggangan", last().includes("kuda") && last().includes("naga"));
await run("mount", "feed");
t("1c. feed tanpa tunggangan → guide list", last().includes("belum punya tunggangan"));
await run("mount", "pilih pterodactyl");
t("1d. pilih invalid → guide", last().includes("tidak valid"));

console.log("— section 2: beli tunggangan + animasi kandang —");
// pastikan rpg ada & isi gold
const u2 = getDatabase().getUser(SENDER);
u2.rpg = u2.rpg || {}; u2.rpg.gold = 5000;
{
  const sends = [], edits = [];
  const animSock = { sendMessage: async (j, c) => { if (c?.edit) { edits.push(c.text); return { key: { id: "a1" } }; } sends.push(c.text); return { key: { id: "a1" } }; } };
  await handler(mkMsg({ command: "mount", text: "pilih kuda" }), { sock: animSock, text: "pilih kuda" });
  t("2a. animasi kandang: frame pertama + 6 edit", sends.length === 1 && edits.length === 6, `sends=${sends.length} edits=${edits.length}`);
  t("2b. MENJINAKKAN: 🤠 pemilik + 🐎 mendekat melalui padang 🌾", [...sends, ...edits].every((f) => f.includes("🤠") && f.includes("MENJINAKKAN")) && [sends[0], ...edits.slice(0, 4)].every((f) => f.includes("🌾")), sends[0]);
  t("2c. posisi tunggangan BERGERAK ke kiri", (() => {
    const rows = [sends[0], ...edits].map((f) => f.split("\n")[2]);
    const pos = rows.map((r) => r.indexOf("🐎"));
    return new Set(pos).size > 1 && pos.every((x, i) => i === 0 || x <= pos[i - 1]);
  })(), [sends[0], ...edits].map((f) => f.split("\n")[2]).join(" | "));
  t("2d. frame akhir JINAK! SIAP DITUNGGANGI", edits[5].includes("JINAK"));
  t("2e. pembelian sukses: kuda + gold terpotong", getDatabase().getUser(SENDER).rpg.gold === 4000 && getDatabase().getUser(SENDER).rpg.mount?.id === "kuda", getDatabase().getUser(SENDER).rpg.gold);
  t("2f. reply pembelian muncul (regresi stuck)", last().includes("membeli"));
}
await run("mount", "pilih naga");
t("2g. pilih saat sudah punya → tolak", last().includes("sudah punya"));

console.log("— section 3: feed + animasi memberi makan —");
{
  const sends = [], edits = [];
  const animSock = { sendMessage: async (j, c) => { if (c?.edit) { edits.push(c.text); return { key: { id: "a1" } }; } sends.push(c.text); return { key: { id: "a1" } }; } };
  await handler(mkMsg({ command: "mount", text: "feed" }), { sock: animSock, text: "feed" });
  t("3a. .mount feed MEMBALAS (regresi bug stuck loading — dulu balas kosong)", last().includes("diberi makan") && last().includes("80/100"), last().slice(0, 90));
  t("3b. animasi memberi makan: 🥕 + MAKAN LAHAP", sends.length === 1 && edits.length === 6 && edits[5].includes("MAKAN LAHAP") && [...sends, ...edits].every((f) => f.includes("🥕")), sends[0]);
  t("3c. happiness naik 50 → 80", getDatabase().getUser(SENDER).rpg.mount.happiness === 80, getDatabase().getUser(SENDER).rpg.mount.happiness);
}
{
  // alias .mountfeed → jalur feed juga harus jalan (dulu param command gak pernah terkirim)
  const sends = [], edits = [];
  const animSock = { sendMessage: async (j, c) => { if (c?.edit) { edits.push(c.text); return { key: { id: "a1" } }; } sends.push(c.text); return { key: { id: "a1" } }; } };
  await handler(mkMsg({ command: "mountfeed", text: "" }), { sock: animSock, text: "" });
  t("3d. .mountfeed → feed jalan (regresi bug command undefined)", last().includes("diberi makan"), last().slice(0, 90));
  t("3e. happiness cap 100", getDatabase().getUser(SENDER).rpg.mount.happiness === 100, getDatabase().getUser(SENDER).rpg.mount.happiness);
}

console.log("— section 4: fallback channel tanpa edit —");
{
  let fb = 0;
  const fbSock = { sendMessage: async () => { fb++; return true; } };
  const rBefore = getDatabase().getUser(SENDER).rpg.mount.happiness;
  await handler(mkMsg({ command: "mount", text: "feed" }), { sock: fbSock, text: "feed" });
  t("4a. channel tanpa edit → animasi dilewati (1 frame), feed tetap jalan", fb === 1 && getDatabase().getUser(SENDER).rpg.mount.happiness === rBefore, `calls=${fb} happy=${getDatabase().getUser(SENDER).rpg.mount.happiness}`);
}

fs.rmSync(dbDir, { recursive: true, force: true });
console.log("— section 5: grid emoji (lib langsung) —");
const stableLib = await import(R + "/src/lib/libanimationrpg/libmountrpg.js");
const mgJ = stableLib.stableFrames({ mode: "jinak", mountName: "Kuda", emoji: "🐎" });
const mgF = stableLib.stableFrames({ mode: "feed", mountName: "Kuda", emoji: "🐎" });
t("5a. grid 4 baris: HUD · padang · adegan · status", mgJ.length === 7 && mgJ.every((x) => (x.match(/\n/g) || []).length >= 5), mgJ[0]);
t("5b. adegan kontekstual beda per mode: jinak padang 🏞️ vs feed kandang 🏠", mgJ[0].includes("🏞️") && mgF[0].includes("🏠"), mgJ[0].split("\n")[3] + " | " + mgF[0].split("\n")[3]);
t("5c. adegan akhir sesuai mode: 💞 jinak vs 💛 kenyang", mgJ[6].includes("💞") && mgF[6].includes("💛"), mgJ[6].split("\n")[3]);

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
