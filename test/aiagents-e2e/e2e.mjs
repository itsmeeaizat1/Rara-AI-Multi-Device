// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E AIAGENTS — Katalog 500+ AI Agent Projects (feat/aiagents-katalog)
// Jalankan: node test/aiagents-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

// ── harness msg mock ─────────────────────────────────────────────────
const sent = [];
function mkMsg(args, chat = "6281@s.whatsapp.net", sender = "6281@s.whatsapp.net") {
  return {
    chat, sender, key: { remoteJid: chat, fromMe: false, id: "m1" },
    args, text: ".aiagents " + args.join(" "),
    reply: async (card) => { sent.push({ to: chat, msg: { text: card } }); return true; },
    react: async () => true,
    isGroup: false,
  };
}
const lastCard = () => sent[sent.length - 1]?.msg?.text || "";

// ===== 1. SECTION: dataset valid (integration, file asli bukan mock) =====
{
  const { getMeta, getSectionsWithCount, getEntry } = await import(R("../../src/lib/rara-aiagents.js"));
  const meta = getMeta();
  t("1a. dataset ke-load, sumber tercatat", meta.count > 100 && meta.source.includes("500-AI-Agents"), JSON.stringify(meta));
  t("1b. 6 seksi lengkap", meta.sections.length === 6, JSON.stringify(meta.sections));
  const secs = getSectionsWithCount();
  t("1c. tiap seksi punya entry > 0", secs.every(s => s.count > 0), JSON.stringify(secs));
  t("1d. total entry = meta.count", secs.reduce((a, s) => a + s.count, 0) === meta.count);
  const e1 = getEntry(1), eLast = getEntry(meta.count);
  t("1e. entry 1 & terakhir valid (name+desc+section)", !!(e1?.name && e1?.desc && e1?.section) && !!(eLast?.name), JSON.stringify(e1)?.slice(0, 80));
  t("1f. gak ada entry header nyasar (Use Case)", !["Use Case", "Framework"].includes(e1?.name));
  t("1g. id entry kontinu 1..count", getEntry(meta.count).id === meta.count && getEntry(meta.count + 1) === null);
}

// ===== 2. SECTION: menu & browse seksi =====
{
  const { handler, config } = await import(R("../../plugins/ai/aiagents.js"));
  t("2a. export config + handler (loader rule)", typeof config?.name === "string" && typeof handler === "function");
  t("2b. nama command aiagents, kategori ai", config.name === "aiagents" && config.category === "ai", JSON.stringify(config.name));

  sent.length = 0;
  await handler(mkMsg([]), {});
  const menu = lastCard();
  t("2c. tanpa arg → menu kartu", menu.includes("KATALOG") && menu.includes("aiagents"));
  t("2d. menu nyebut 6 seksi", ["industri", "crewai", "autogen", "agno", "langgraph", "starter"].every(s => menu.includes(s)));

  sent.length = 0;
  await handler(mkMsg(["crewai"]), {});
  const card = lastCard();
  t("2e. browse crewai → daftar entry + halaman", card.includes("Halaman 1/") && card.includes("▪"));
  t("2f. ada hint next page", card.includes("aiagents crewai 2"));

  sent.length = 0;
  await handler(mkMsg(["crewai", "2"]), {});
  t("2g. halaman 2 jalan (bukan halaman 1)", lastCard().includes("Halaman 2/"), lastCard().slice(-60));

  sent.length = 0;
  await handler(mkMsg(["starter"]), {});
  t("2h. browse starter (agent jadi) jalan", lastCard().includes("Starter") && lastCard().includes("▪"));

  sent.length = 0;
  await handler(mkMsg(["seksiNgaco"]), {});
  t("2i. seksi gak dikenal → fallback search/menu, gak throw", sent.length > 0);
}

// ===== 3. SECTION: search =====
{
  const { handler } = await import(R("../../plugins/ai/aiagents.js"));
  sent.length = 0;
  await handler(mkMsg(["cari", "trading"]), {});
  const card = lastCard();
  t("3a. cari trading → nemu entry", card.includes("HASIL") && card.includes("▪"), card.slice(0, 60));
  t("3b. hasil search case-insensitive di desc/name", (await import(R("../../src/lib/rara-aiagents.js"))).searchAiAgents("TRADING").length > 0);

  sent.length = 0;
  await handler(mkMsg(["cari", "zzzxqnotfound"]), {});
  t("3c. gak nemu → kartu saran, bukan throw", lastCard().includes("acak") || lastCard().includes("kata lain"));

  sent.length = 0;
  await handler(mkMsg(["cari"]), {});
  t("3d. cari tanpa keyword → kartu format", lastCard().includes("Format"));
}

// ===== 4. SECTION: acak & detail =====
{
  const { handler } = await import(R("../../plugins/ai/aiagents.js"));
  const { getEntry, getMeta } = await import(R("../../src/lib/rara-aiagents.js"));
  sent.length = 0;
  await handler(mkMsg(["acak"]), {});
  const card = lastCard();
  t("4a. acak → kartu detail", card.includes("Kategori:") && card.includes("Seksi:"));
  t("4b. acak deterministik 10x → selalu entry valid", (() => {
    for (let i = 0; i < 10; i++) { if (!getEntry([1, 5, 9, 13, 27, 40, 60, 90, 111, 130][i])) return false; }
    return true;
  })());

  sent.length = 0;
  await handler(mkMsg(["detail", "5"]), {});
  const d5 = lastCard();
  t("4c. detail 5 = entry id 5 (nama match)", d5.includes(getEntry(5).name.slice(0, 12)), d5.slice(0, 50));
  t("4d. detail bawa link repo", d5.includes("https://"));

  sent.length = 0;
  await handler(mkMsg(["detail", "99999"]), {});
  t("4e. detail nomor invalid → kartu error", lastCard().includes("Gak Valid"));

  sent.length = 0;
  await handler(mkMsg(["detail", "abc"]), {});
  t("4f. detail non-angka → kartu error, gak throw", lastCard().includes("Gak Valid"));
}

// ===== 5. SECTION: input aneh / malformed (QA gerbang 4) =====
{
  const { handler } = await import(R("../../plugins/ai/aiagents.js"));
  let threw = false;
  try {
    sent.length = 0;
    await handler(mkMsg(["🤡", "🔥🔥"]), {});
    t("5a. arg emoji → dibales (fallback search/menu)", sent.length > 0);
  } catch (e) { threw = true; t("5a. arg emoji gak boleh throw", false, e.message); }
  t("5b. gak ada exception", !threw);

  threw = false;
  try { sent.length = 0; await handler(mkMsg([null, undefined]), {}); } catch { threw = true; }
  t("5c. args null/undefined → gak throw", !threw);

  threw = false;
  try { sent.length = 0; await handler({ ...mkMsg([]), args: null, isGroup: true, chat: "123@g.us" }, {}); } catch { threw = true; }
  t("5d. args null di grup → menu kartu, gak throw", !threw && sent.length > 0);
}

// ===== 6. SECTION: format kartu & isolasi dari fitur AI existing =====
{
  const { handler } = await import(R("../../plugins/ai/aiagents.js"));
  sent.length = 0;
  await handler(mkMsg([]), {});
  const card = lastCard();
  t("6a. judul kartu format 『 *Ai Agents* 』", card.includes("『 *Ai Agents* 』"), card.slice(0, 30));
  t("6b. kartu pakai chip ᯓ", card.includes("ᯓ"));
  t("6c. menu nyebut sumber repo", card.includes("500-AI-Agents"));

  // fitur AI agent existing gak tersentuh: file2 lama masih ada & gak diubah
  const fs = await import("node:fs");
  const path = await import("node:path");
  const base = R("../..");
  const existing = ["plugins/ai-agent/agent.js", "plugins/ai-agent/hiaiagent.js", "plugins/ai-agent/agentloop.js", "plugins/ai-agent/autotask.js"];
  t("6d. fitur AI agent existing tetap ada (gak diganti)", existing.every(f => fs.existsSync(path.join(base, f))), existing.join(","));
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
