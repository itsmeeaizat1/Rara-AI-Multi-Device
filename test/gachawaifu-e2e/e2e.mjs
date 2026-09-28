// E2E gachawaifu-e2e — animasi kapsul grid (libgachawaifurpg)
import path from "node:path";
const R = path.resolve(process.cwd());
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const lib = await import(R + "/src/lib/libanimationrpg/libgachawaifurpg.js");

console.log("— section 1: kapsulFrames grid —");
const F = lib.kapsulFrames();
t("1a. 6 frame fase (1 kirim + 5 edit)", F.length === 6, F.length);
t("1b. semua frame code fence + grid 4 baris", F.every((x) => x.startsWith("```") && (x.match(/\n/g) || []).length >= 5), F[0]);
t("1c. HUD MESIN KAPSUL tampil tiap frame", F.every((x) => x.includes("MESIN KAPSUL")), F[0]);
t("1d. fase bergetar → JATUH → gemetar → cahaya → TERBUKA → REVEAL utuh", (() => {
  return F[0].includes("bergetar") && F[1].includes("JATUH!") && F[2].includes("gemetar… gemetar…") &&
    F[3].includes("cahaya merembes") && F[4].includes("KAPSUL TERBUKA!") && F[5].includes("REVEAL! Waifu menyusul…");
})(), F.map((x) => x.split("\n").at(-2)).join(" | "));
t("1e. baris adegan kontekstual makin dramatis (💫→⬇️→💦→✨→🎆→💗)", (() => {
  return F[0].includes("💫") && F[1].includes("⬇️") && F[2].includes("💦") && F[3].includes("✨") && F[4].includes("🎆") && F[5].includes("💗");
})(), F.map((x) => x.split("\n")[3]).join(" | "));
t("1f. kapsul 🥚 → retak ✨ → 💥 → 💞 (evolusi visual utuh)", F[0].includes("🥚") && F[3].includes("🥚✨") && F[4].includes("💥") && F[5].includes("💞"));

console.log("— section 2: playKapsulAnim edit berulang —");
const sends = [], edits = [];
const sock = { sendMessage: async (jid, content) => {
  if (content?.edit) { edits.push({ key: content.edit.id, text: content.text }); return { key: { id: "a1" } }; }
  sends.push(content.text); return { key: { id: "a1" } };
} };
const ok = await lib.playKapsulAnim(sock, "c1@s.whatsapp.net");
t("2a. animasi jalan: 1 kirim + 5 edit, key sama", ok === true && sends.length === 1 && edits.length === 5 && edits.every((e) => e.key === "a1"), `ok=${ok} sends=${sends.length} edits=${edits.length}`);
let fb = 0;
const fbr = await lib.playKapsulAnim({ sendMessage: async () => { fb++; return true; } }, "c1@s.whatsapp.net");
t("2b. channel tanpa key → senyap false (pemanggil fallback animGacha)", fbr === false && fb === 1, `fbr=${fbr} calls=${fb}`);
t("2c. sock null → senyap false gak throw", (await lib.playKapsulAnim(null, "x")) === false);

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
