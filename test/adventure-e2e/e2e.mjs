// E2E adventure-e2e — animasi peta kompas grid (libadventurerpg)
import path from "node:path";
const R = path.resolve(process.cwd());
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const lib = await import(R + "/src/lib/libanimationrpg/libadventurerpg.js");
const AR = ["⬆️", "↗️", "➡️", "↘️", "⬇️"];
const LM = ["🌲", "⛰️", "🏕️", "🌊", "🌴", "🗿", "🌉"];

console.log("— section 1: petaFrames grid —");
const F = lib.petaFrames({ eventType: "treasure", landmarks: LM, arahs: AR });
t("1a. 6 frame (1 kirim + 5 edit)", F.length === 6, F.length);
t("1b. semua frame code fence + grid 4 baris", F.every((x) => x.startsWith("```") && (x.match(/\n/g) || []).length >= 5), F[0]);
t("1c. HUD kompas: arah BERPUTAR tiap frame + MENUJU treasure", (() => {
  const hud = F.map((x) => x.split("\n")[1]);
  return hud.every((h) => h.includes("MENUJU TREASURE") && /🧭/.test(h)) && new Set(hud).size > 1;
})(), F[0]);
t("1d. jalur: 📍 maju + jejak · makin panjang + 🏕️ tujuan ujung", (() => {
  const jalur = F.map((x) => x.split("\n")[2]);
  const pos = jalur.map((r) => r.indexOf("📍"));
  return jalur.every((r) => r.includes("🏕️") || r.includes("📍")) && pos.every((x, i) => i === 0 || x >= pos[i - 1]) && jalur[0].indexOf("📍") < jalur[5].indexOf("📍");
})());
t("1e. adegan grid: 🗺️🧭 tampil + langkah kontekstual", F.slice(0, 5).every((x) => x.split("\n")[3].includes("🗺️")), F[0].split("\n")[3]);
t("1f. frame akhir dramatis: ✨ TIBA DI TUJUAN + status TERCAPAI", F[5].includes("TIBA DI TUJUAN") && F[5].includes("TREASURE TERCAPAI"), F[5]);
t("1g. landmark dari ctx tampil di grid (🗿/🌉)", F.some((x) => LM.some((l) => x.includes(l))), F[0]);

console.log("— section 2: playPetaAnim edit berulang —");
const sends = [], edits = [];
const sock = { sendMessage: async (jid, content) => {
  if (content?.edit) { edits.push({ key: content.edit.id, text: content.text }); return { key: { id: "a1" } }; }
  sends.push(content.text); return { key: { id: "a1" } };
} };
const ok = await lib.playPetaAnim(sock, "c1@s.whatsapp.net", { eventType: "treasure", landmarks: LM, arahs: AR });
t("2a. animasi jalan: 1 kirim + 5 edit, key sama", ok === true && sends.length === 1 && edits.length === 5 && edits.every((e) => e.key === "a1"), `ok=${ok} sends=${sends.length} edits=${edits.length}`);
let fbCalls = 0;
const fb = await lib.playPetaAnim({ sendMessage: async () => { fbCalls++; return true; } }, "c1@s.whatsapp.net", { eventType: "treasure" });
t("2b. channel tanpa key → senyap false (pemanggil fallback animAdventure)", fb === false && fbCalls === 1, `fb=${fb} calls=${fbCalls}`);
t("2c. sock kosong/null → senyap false gak throw", (await lib.playPetaAnim(null, "x", {})) === false);

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
