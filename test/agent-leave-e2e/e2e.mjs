// NOVA AI WHATSAPP BOT — E2E: AGENT LEAVE GROUP BY NAME
// Request owner 21 Sep 2026: ".novaagent/.aisuperagent disuruh dari DM:
// keluar dari grup cari teman sejati" — agent harus nemuin grup dari NAMA.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 220) : ""}`); }
};

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-leave-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const registry = await import(R + "/src/lib/nova-group-registry.js");
const novaAgent = await import(R + "/src/lib/nova-agent.js");
const agentPlugin = await import(R + "/plugins/ai-agent/agent.js");
const aiagentLib = await import(R + "/src/lib/aiagent.js");
const cfg = { command: { prefix: "." } };

const GRP_TARGET = "62812caritemansejati@g.us";
const GRP_OTHER = "62813gaulchatting@g.us";

// mock sock — daftar grup via groupFetchAllParticipating + leave tercatat
const leftOf = [];
const sock = {
  groupFetchAllParticipating: async () => ({
    [GRP_TARGET]: { id: GRP_TARGET, subject: "Cari Teman Sejati" },
    [GRP_OTHER]: { id: GRP_OTHER, subject: "Gaul Chatting" },
  }),
  groupLeave: async (jid) => { leftOf.push(jid); return true; },
  user: { id: "628174887770:5" },
  getName: async () => null,
};

console.log("— section 1: resolveGroupByName (lib) —");
{
  const r1 = await registry.resolveGroupByName(sock, "cari teman sejati");
  t("1a. fuzzy case-insensitive ketemu", r1?.jid === GRP_TARGET, r1);
  const r2 = await registry.resolveGroupByName(sock, "Cari Teman Sejati");
  t("1b. exact match ketemu", r2?.jid === GRP_TARGET, r2);
  const r3 = await registry.resolveGroupByName(sock, "cari teman");
  t("1c. nama sebagian (contains) ketemu", r3?.jid === GRP_TARGET, r3);
  const r4 = await registry.resolveGroupByName(sock, "grup ngaco");
  t("1d. gak ketemu → null", r4 === null, r4);
  const r5 = await registry.resolveGroupByName(sock, "");
  t("1e. nama kosong → null", r5 === null, r5);
  const sockAmb = {
    groupFetchAllParticipating: async () => ({
      "111@g.us": { subject: "Cari Teman Sejati 1" },
      "222@g.us": { subject: "Cari Teman Sejati 2" },
    }),
  };
  const r6 = await registry.resolveGroupByName(sockAmb, "cari teman sejati");
  t("1f. ambigu → daftar kandidat, GAK asal pilih", r6?.ambiguous?.length === 2, r6);
}

console.log("— section 2: detectActLocal — leave vs kick (.aisuperagent planner lokal) —");
{
  const detectAct = (s) => novaAgent.detectActLocal(s);
  const a1 = detectAct("keluar dari grup cari teman sejati");
  t("2a. 'keluar dari grup X' → act leave + nama grup", a1?.[0]?.action === "leave" && a1[0].target === "cari teman sejati", a1);
  const a2 = detectAct("keluarin bot dari grup gaul chatting");
  t("2b. 'keluarin bot dari grup X' → leave (kick nyasar dibuang)", a2?.some((x) => x.action === "leave") && !a2.some((x) => x.action === "kick" && /bot/i.test(x.target || "")), a2);
  const a3 = detectAct("leave grup gaul chatting ya");
  t("2c. 'leave grup X' kebaca", a3?.[0]?.action === "leave", a3);
  const a4 = detectAct("keluar dari grup ini");
  t("2d. tanpa nama → target null (pakai grup sekarang)", a4?.[0]?.action === "leave" && !a4[0].target, a4);
  const a5 = detectAct("keluarkan budi dari grup ini");
  t("2e. kick ORANG tetap jalan (gak ketelan leave)", a5?.some((x) => x.action === "kick" && /budi/i.test(x.target || "")), a5);
  const a6 = detectAct("kick budi");
  t("2f. kick murni tetap jalan", a6?.[0]?.action === "kick", a6);
  const a7 = detectAct("halo apa kabar semua");
  t("2g. obrolan biasa gak salah tangkap", !a7?.length, a7);
}

console.log("— section 3: execAction leave (.aisuperagent) —");
{
  const { execAction } = agentPlugin;
  const mkM = (over = {}) => ({
    chat: "628174887770@s.whatsapp.net", sender: "628174887770@s.whatsapp.net",
    isOwner: true, isGroup: false, mentionedJid: [], ...over,
  });
  // 3a dari DM + nama grup → keluar grup beneran
  leftOf.length = 0;
  const r1 = await execAction({ action: "leave", target: "cari teman sejati" }, {}, mkM(), sock);
  t("3a. DM + nama → bot keluar grup yang dimaksud", r1?.ok === true && leftOf[0] === GRP_TARGET, { r1, leftOf });
  t("3b. pesan sukses nyebut nama grup", /cari teman sejati/i.test(r1?.msg || ""), r1?.msg);
  // 3b tanpa nama dari DM → ditolak jelas
  leftOf.length = 0;
  const r2 = await execAction({ action: "leave", target: null }, {}, mkM(), sock);
  t("3c. DM tanpa nama → minta nama grup, gak asal keluar", r2?.ok === false && /nama grup/i.test(r2.msg), r2);
  t("3d. gak ada grup yang dikeloncingin", leftOf.length === 0, leftOf);
  // 3c bukan owner → tolak
  const r3 = await execAction({ action: "leave", target: "cari teman sejati" }, {}, mkM({ isOwner: false }), sock);
  t("3e. bukan owner → ditolak", r3?.ok === false && /owner/i.test(r3.msg), r3);
  // 3d nama ambigu → gak asal pilih
  const sockAmb = { ...sock, groupFetchAllParticipating: async () => ({
    "111@g.us": { subject: "Cari Teman Sejati 1" },
    "222@g.us": { subject: "Cari Teman Sejati 2" },
  }) };
  const r4 = await execAction({ action: "leave", target: "cari teman sejati" }, {}, mkM(), sockAmb);
  t("3f. ambigu → ditolak dengan daftar kandidat", r4?.ok === false && /ambigu/i.test(r4.msg), r4?.msg);
  // 3e nama gak ada → jujur
  const r5 = await execAction({ action: "leave", target: "grup ngaco" }, {}, mkM(), sock);
  t("3g. nama gak ketemu → jujur gak nyariin", r5?.ok === false && /gak ketemu/i.test(r5.msg), r5?.msg);
  // 3f dari DALAM grup tanpa nama → keluar grup itu
  leftOf.length = 0;
  const r6 = await execAction({ action: "leave", target: null }, {}, mkM({ chat: GRP_OTHER, isGroup: true, groupMetadata: { subject: "Gaul Chatting" } }), sock);
  t("3h. dari dalam grup tanpa nama → keluar grup itu", r6?.ok === true && leftOf[0] === GRP_OTHER, { r6, leftOf });
}

console.log("— section 4: leavegc by name (.novaagent) —");
{
  const TOOLS = aiagentLib.TOOLS;
  t("4a. leavegc tetap owner-only", TOOLS.leavegc?.perm === "owner", TOOLS.leavegc?.perm);
  const m = { chat: "628174887770@s.whatsapp.net", isGroup: false };
  leftOf.length = 0;
  const out = await TOOLS.leavegc.run(sock, m, { group: "cari teman sejati" });
  t("4b. run with nama → keluar grup beneran", leftOf[0] === GRP_TARGET, { leftOf, out });
  t("4c. return nyebut grup yang ditinggalin", /cari teman sejati/i.test(String(out)), out);
  leftOf.length = 0;
  let threw = "";
  try { await TOOLS.leavegc.run(sock, m, { group: "grup ngaco" }); } catch (e) { threw = e.message; }
  t("4d. nama gak ketemu → throw pesan jelas", /gak ketemu/i.test(threw), threw);
  try { await TOOLS.leavegc.run(sock, m, {}); } catch (e) { threw = e.message; }
  t("4e. DM tanpa nama → throw minta nama", /nama grup/i.test(threw), threw);
  t("4f. grup ngaco gak pernah dikeloncingin", leftOf.length === 0, leftOf);
}

console.log("— section 5: localParse .novaagent —");
{
  const lp = (s) => aiagentLib.localParse ? aiagentLib.localParse(s) : null;
  const p1 = lp("keluar dari grup cari teman sejati");
  t("5a. localParse tangkep tool + nama grup", p1?.tool === "leavegc" && p1?.args?.group === "cari teman sejati", p1);
  const p2 = lp("keluar dari grup ini");
  t("5b. tanpa nama → args kosong (grup sekarang)", p2?.tool === "leavegc" && !p2?.args?.group, p2);
  const p3 = lp("apa itu nodejs");
  t("5c. pertanyaan biasa gak ketangkap", p3?.tool !== "leavegc", p3);
  const p4 = lp("keluarkan bot dari grup gaul chatting");
  t("5d. 'keluarkan BOT dari grup X' → leavegc (bukan kick 'bot')", p4?.tool === "leavegc", p4);
  const p5 = lp("keluarkan budi dari grup ini");
  t("5e. 'keluarkan BUDI dari grup' tetap kick orang", p5?.tool === "kick" && /budi/i.test(p5?.args?.user || ""), p5);
  const p6 = lp("keluarin bot dari grup gaul chatting");
  t("5f. 'keluarin bot dari grup X' → leavegc + nama", p6?.tool === "leavegc" && /gaul chatting/i.test(p6?.args?.group || ""), p6);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
