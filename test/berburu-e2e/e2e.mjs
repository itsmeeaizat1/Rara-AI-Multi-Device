// E2E berburu-e2e — animasi crosshair grid (libhuntingadventurerpg)
import path from "node:path";
const R = path.resolve(process.cwd());
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const lib = await import(R + "/src/lib/libanimationrpg/libhuntingadventurerpg.js");

console.log("— section 1: scopeFrames grid —");
const F = lib.scopeFrames({ monsterName: "Beruang" });
t("1a. 5 frame (1 kirim + 4 edit)", F.length === 5, F.length);
t("1b. semua frame code fence + grid 4 baris", F.every((x) => x.startsWith("```") && (x.match(/\n/g) || []).length >= 5), F[0]);
t("1c. HUD: BURU BERUANG tiap frame + TERKUNCI di akhir", F.every((x) => x.includes("BURU BERUANG")) && F[4].includes("TERKUNCI"), F[0]);
t("1d. crosshair merayap: posisi 🎯 maju ke jejak 🐾 (non-decreasing)", (() => {
  const rows = F.map((x) => x.split("\n")[2]);
  const pos = rows.map((r) => r.indexOf("🎯"));
  return rows.every((r) => r.includes("🐾")) && pos.slice(0, 4).every((x, i) => i === 0 || x >= pos[i - 1]) && pos[4] >= pos[3];
})(), F.map((x) => x.split("\n")[2]).join(" | "));
t("1e. frame terkunci: 🎯 nempel 🐾 + impact 💥 di adegan", F[4].includes("🎯🐾") && F[4].includes("💥"), F[4]);
t("1f. adegan rimba kontekstual tampil (🌲🌿)", F.slice(0, 4).some((x) => x.includes("🌲")) && F.slice(0, 4).every((x) => x.split("\n")[3].length > 0), F[0]);
t("1g. status progres n/4 → TERKUNCI", F[3].includes("4/4") && F[4].includes("SASARAN TERKUNCI"), F[3]);

console.log("— section 2: playScopeAnim edit berulang —");
const sends = [], edits = [];
const sock = { sendMessage: async (jid, content) => {
  if (content?.edit) { edits.push({ key: content.edit.id, text: content.text }); return { key: { id: "a1" } }; }
  sends.push(content.text); return { key: { id: "a1" } };
} };
const ok = await lib.playScopeAnim(sock, "c1@s.whatsapp.net", { monsterName: "Harimau Loreng" });
t("2a. animasi jalan: 1 kirim + 4 edit, key sama", ok === true && sends.length === 1 && edits.length === 4 && edits.every((e) => e.key === "a1"), `ok=${ok} sends=${sends.length} edits=${edits.length}`);
let fb = 0;
const fbr = await lib.playScopeAnim({ sendMessage: async () => { fb++; return true; } }, "c1@s.whatsapp.net", { monsterName: "X" });
t("2b. channel tanpa key → senyap false (pemanggil fallback animHuntTrack)", fbr === false && fb === 1, `fbr=${fbr} calls=${fb}`);
t("2c. sock null → senyap false gak throw", (await lib.playScopeAnim(null, "x", {})) === false);
t("2d. tanpa monsterName → default SASARAN (gak crash)", lib.scopeFrames({}).every((x) => x.includes("SASARAN")));

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
