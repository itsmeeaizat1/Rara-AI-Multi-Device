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


console.log("— section 3: EKSPEDISI multi-babak (adventureCinematic — animasi terbanyak) —");
const { sceneTotalMs } = await import(R + "/src/lib/nova-anim-runner.js");
const scT = lib.adventureCinematic({ eventType: "treasure", landmarks: LM, arahs: AR });
const totF = (sc) => sc.reduce((n, x) => n + x.frames.length, 0);
t("3a. ekspedisi 12 frame (persiapan 2 + perjalanan 6 + babak 2 + epilog 2) > peta doang 6", totF(scT) === 12 && totF(scT) > lib.petaFrames({ eventType: "treasure", landmarks: LM, arahs: AR }).length, totF(scT));
t("3b. babak pertama = PERSIAPAN \u{1F392} + kompas, perjalanan = peta \u{1F9ED}, akhir = SELESAI", (() => {
  const f = scT.flatMap((x) => x.frames.map(String));
  return f[0].includes("BEKAL") && f[2].includes("MENUJU TREASURE") && f[f.length - 1].includes("PETUALANGAN SELESAI");
})());
t("3c2. beda event beda babak: monster/trap/shrine/merchant/trap beda isi", (() => {
  const fOf = (x) => lib.adventureCinematic({ eventType: x, landmarks: LM, arahs: AR }).flatMap((y) => y.frames.map(String)).join("|");
  return fOf("monster").includes("\u{1F479}") && fOf("monster").includes("\u2694\uFE0F")
    && fOf("shrine").includes("\u26E9\uFE0F") && fOf("merchant").includes("\u{1F6D2}") && fOf("trap").includes("\u{1F573}\uFE0F") && fOf("nothing").includes("\u{1F937}");
})());
t("3d. situasi menentukan level: monster/trap = babak 3 frame vs treasure 2 (total 13 vs 12)", (() => {
  const mo = lib.adventureCinematic({ eventType: "monster", landmarks: LM, arahs: AR });
  const tr = lib.adventureCinematic({ eventType: "trap", landmarks: LM, arahs: AR });
  return mo[2].frames.length === 3 && tr[2].frames.length === 3 && scT[2].frames.length === 2 && totF(mo) === 13;
})());
lib._setAdventureAnimMsForTest(700);
t("3e. durasi ekspedisi proporsional: monster (13 frame) > treasure (12 frame) > peta lama (6 frame)", (() => {
  const mo = lib.adventureCinematic({ eventType: "monster", landmarks: LM, arahs: AR });
  return sceneTotalMs(mo, 700) > sceneTotalMs(scT, 700) && sceneTotalMs(scT, 700) > 6 * 700;
})());
const s3 = [], e3 = [];
const sock3 = { sendMessage: async (jid, content) => {
  if (content?.edit) { e3.push({ key: content.edit.id, text: content.text }); return { key: { id: "a3" } }; }
  s3.push(content.text); return { key: { id: "a3" } };
} };
const ok3 = await lib.playAdventureCinematic(sock3, "c3@s.whatsapp.net", { eventType: "treasure", landmarks: LM, arahs: AR });
t("3f. playAdventureCinematic: 1 kirim + 11 edit, key sama", ok3 === true && s3.length === 1 && e3.length === 11 && e3.every((e) => e.key === "a3"), `ok=${ok3} s=${s3.length} e=${e3.length}`);
let fb3 = 0;
const fbSock3 = { sendMessage: async () => { fb3++; return true; } };
t("3g. channel tanpa key → cinematic false (pemanggil fallback ke peta/teks)", (await lib.playAdventureCinematic(fbSock3, "c3@s.whatsapp.net", {})) === false && fb3 === 1, `calls=${fb3}`);
t("3h. sock null → senyap false gak throw", (await lib.playAdventureCinematic(null, "x", {})) === false);

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
