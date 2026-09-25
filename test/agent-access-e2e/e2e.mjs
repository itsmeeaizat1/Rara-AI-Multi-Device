// NOVA AI WHATSAPP BOT — E2E: AGENT GATE AKSES COMMAND (25 Sep 2026, owner:
// "user bsa akses ai agent tp agent cm akses cmd yg bs user gunakan, fitur
// owner-only ditolak jujur"). Agent jalan ATAS NAMA user — command di luar
// hak user DITOLAK sebelum eksekusi, bukan pura-pura sukses.
import fs from "node:fs";
import path from "node:path";
import { registerPlugin, loadPlugins } from "../../src/lib/nova-plugins.js";
import { config as agentCfg, gateCommandAccess } from "../../plugins/ai/agent.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${String(extra).slice(0, 200)}` : "")); ok ? pass++ : fail++; };

// plugin palsu buat uji registry — dibersihin di akhir
const FAKES = [
  { config: { name: "fakesupersecret", alias: ["secretcmd"], category: "owner", isOwner: true, isEnabled: true } },
  { config: { name: "fakepremiumq", alias: ["premcmd"], category: "tools", isPremium: true, isEnabled: true } },
  { config: { name: "fakepartnerx", alias: ["partcmd"], category: "tools", isPartner: true, isEnabled: true } },
  { config: { name: "fakeeveryone", alias: ["allcmd"], category: "fun", isEnabled: true } },
  { config: { name: "fakeadmincmd", alias: [], category: "group", isAdmin: true, isBotAdmin: true, isEnabled: true } },
  { config: { name: "fakesetwelcome", alias: [], category: "group", isAdmin: true, isEnabled: true } },
];
// registry plugin NYATA dulu (boots, sticker, dll) — loadPlugins CLEAR store,
// jadi WAJIB dipanggil SEBELUM register fake
const repoRoot = path.resolve(".");
await loadPlugins(path.join(repoRoot, "plugins"));
for (const f of FAKES) registerPlugin(f);

const OWNER = { isOwner: true, isPremium: true, isPartner: true };
const USER = { isOwner: false, isPremium: false, isPartner: false };
const PREMIUM = { isOwner: false, isPremium: true, isPartner: false };

// ─── 1. PLUGIN .aisuperagent MEMANG BISA DIAKSES SEMUA USER ───
w("\n— 1. akses plugin —");
check("1a. .aisuperagent bukan owner-only", agentCfg.isOwner === false, agentCfg.isOwner);
check("1b. .aisuperagent bukan premium-only", agentCfg.isPremium === false, agentCfg.isPremium);

// ─── 2. GATE OWNER-ONLY ───
w("\n— 2. gate owner-only —");
{
  const r = await gateCommandAccess("fakesupersecret", USER);
  check("2a. owner-cmd + user biasa → ditolak", r?.ok === false, JSON.stringify(r));
  check("2b. pesan jelas OWNER-ONLY", /OWNER-ONLY/.test(r?.msg || ""), r?.msg);
  const r2 = await gateCommandAccess("fakesupersecret", OWNER);
  check("2c. owner-cmd + owner → boleh (null)", r2 === null, JSON.stringify(r2));
  const r3 = await gateCommandAccess("secretcmd", USER);
  check("2d. alias juga ke-gate", r3?.ok === false, JSON.stringify(r3));
}

// ─── 3. GATE PREMIUM-ONLY ───
w("\n— 3. gate premium-only —");
{
  const r = await gateCommandAccess("fakepremiumq", USER);
  check("3a. premium-cmd + user biasa → ditolak", r?.ok === false, JSON.stringify(r));
  check("3b. pesan jelas PREMIUM-ONLY", /PREMIUM-ONLY/.test(r?.msg || ""), r?.msg);
  const r2 = await gateCommandAccess("fakepremiumq", PREMIUM);
  check("3c. premium-cmd + premium → boleh", r2 === null, JSON.stringify(r2));
  const r3 = await gateCommandAccess("fakepremiumq", OWNER);
  check("3d. premium-cmd + owner → boleh (owner lewat semua)", r3 === null, JSON.stringify(r3));
}

// ─── 4. GATE PARTNER-ONLY ───
w("\n— 4. gate partner-only —");
{
  const r = await gateCommandAccess("fakepartnerx", USER);
  check("4a. partner-cmd + user biasa → ditolak", r?.ok === false, JSON.stringify(r));
}

// ─── 5. COMMAND BEBAS TETAP JALAN ───
w("\n— 5. command bebas —");
{
  const r = await gateCommandAccess("fakeeveryone", USER);
  check("5a. cmd bebas + user biasa → boleh", r === null, JSON.stringify(r));
  const r2 = await gateCommandAccess("command-gak-ada-di-registry", USER);
  check("5b. cmd gak dikenal → null (biar handler jawab)", r2 === null, JSON.stringify(r2));
  const r3 = await gateCommandAccess("", USER);
  check("5c. cmd kosong → null", r3 === null, JSON.stringify(r3));
}

// ─── 6. REGISTRY BENERAN: command owner asli bot ───
w("\n— 6. command nyata bot —");
{
  const r = await gateCommandAccess("bootdoctor", USER);
  check("6a. .bootdoctor (owner nyata) + user biasa → ditolak", r?.ok === false, JSON.stringify(r));
  const r2 = await gateCommandAccess("sticker", USER);
  check("6b. .sticker (bebas nyata) + user biasa → boleh", r2 === null, JSON.stringify(r2));
}

// ─── 7. GATE ADMIN GRUP (revisi owner 25 Sep: admin grup boleh, asal non-owner) ───
w("\n— 7. gate admin grup —");
{
  const GA = { isGroup: true, isAdmin: true, isBotAdmin: true, isOwner: false, isPremium: false, isPartner: false };
  const GN = { isGroup: true, isAdmin: false, isBotAdmin: true, isOwner: false, isPremium: false, isPartner: false };
  const DM = { isGroup: false, isAdmin: false, isOwner: false, isPremium: false, isPartner: false };
  const r = await gateCommandAccess("fakesetwelcome", GA);
  check("7a. admin-cmd + admin grup → boleh", r === null, JSON.stringify(r));
  const r2 = await gateCommandAccess("fakesetwelcome", GN);
  check("7b. admin-cmd + member biasa → ditolak", r2?.ok === false, JSON.stringify(r2));
  check("7c. pesan jelas ADMIN GRUP", /ADMIN GRUP/.test(r2?.msg || ""), r2?.msg);
  const r3 = await gateCommandAccess("fakesetwelcome", { ...GA, isAdmin: false, isOwner: true });
  check("7d. admin-cmd + owner → boleh (owner lewat semua)", r3 === null, JSON.stringify(r3));
  const r4 = await gateCommandAccess("fakesetwelcome", DM);
  check("7e. admin-cmd + DM → biarin lewat (plugin jawab khusus grup)", r4 === null, JSON.stringify(r4));
  const r5 = await gateCommandAccess("fakeadmincmd", { ...GA, isBotAdmin: false }); // caller admin, BOT bukan admin
  check("7f. botadmin-cmd + bot bukan admin → ditolak", r5?.ok === false && /aku belum jadi admin/.test(r5?.msg || ""), JSON.stringify(r5));
  const r6 = await gateCommandAccess("fakeadmincmd", GA);
  check("7g. admin+botadmin ok → boleh", r6 === null, JSON.stringify(r6));
  // command nyata bot: .add = isAdmin + isBotAdmin
  const r7 = await gateCommandAccess("add", GA);
  check("7h. .add nyata + admin grup → boleh", r7 === null, JSON.stringify(r7));
  const r8 = await gateCommandAccess("add", GN);
  check("7i. .add nyata + member biasa → ditolak", r8?.ok === false, JSON.stringify(r8));
}

// ─── 8. WIRING: executor nyuruh gate + anti-loop + aturan planner ───
w("\n— 8. wiring sumber —");
{
  const fsReal = fs;
  const src = fsReal.readFileSync(new URL("../../plugins/ai/agent.js", import.meta.url), "utf-8");
  check("8a. executor panggil gateCommandAccess sebelum eksekusi", /const denied = await gateCommandAccess\(cmd, m\);\s*\n\s*if \(denied\) return denied;/.test(src), "");
  check("8b. anti-loop: .aisuperagent/.novaagent juga keblok", /cmd === "aisuperagent" \|\| cmd === "novaagent"/.test(src), "");
  const agentSrc = fsReal.readFileSync(new URL("../../src/lib/nova-agent.js", import.meta.url), "utf-8");
  check("8c. SYS_PLAN ada aturan hak akses", agentSrc.includes("ATURAN HAK AKSES"), "");
  check("8d. no-toolbox replace pattern tetap utuh", agentSrc.includes('TOOLBOX TERSEDIA (skill + server MCP terpasang di bot ini — cuma boleh pakai yang di daftar):\\n{{TOOLBOX}}'), "");
}
setTimeout(() => { try { w(`\n===== ${pass} PASS, ${fail} FAIL =====`); process.exit(fail ? 1 : 0); } catch {} }, 300);
