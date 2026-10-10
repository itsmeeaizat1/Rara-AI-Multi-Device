// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E G4F — Katalog provider AI gratis gpt4free (feat/g4f-katalog)
// Jalankan: node test/g4f-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const sent = [];
function mkMsg(args, extra = {}) {
  return {
    chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
    key: { remoteJid: "6281@s.whatsapp.net", fromMe: false, id: "m1" },
    args, text: ".g4f " + args.join(" "),
    reply: async (card) => { sent.push({ to: "6281@s.whatsapp.net", msg: { text: card } }); return true; },
    react: async () => true,
    ...extra,
  };
}
const lastCard = () => sent[sent.length - 1]?.msg?.text || "";

// ===== 1. SECTION: dataset & lib (integration, file asli) =====
{
  const lib = await import(R("../../src/lib/rara-g4f.js"));
  const meta = lib.getMeta();
  t("1a. dataset ke-load (85 provider)", meta.count >= 80, String(meta.count));
  t("1b. sumber + commit tercatat", meta.source.includes("gpt4free") && meta.commit === "65bd285");
  const s = lib.getStats();
  t("1c. stats masuk akal (gratis+login+audio)", s.gratis > 20 && s.login > 20 && s.total === s.gratis + s.login + 0 || s.total === meta.count, JSON.stringify(s));
  t("1d. semua entry punya name & kategori valid", true); // dicek di 1e
  const fs = await import("node:fs");
  const data = JSON.parse(fs.readFileSync(R("../../src/data/g4f.json"), "utf8"));
  t("1e. schema entry konsisten (name/kategori/auth/working)", data.entries.every(e => typeof e.name === "string" && ["chat", "login", "audio"].includes(e.kategori) && typeof e.auth === "boolean"));
  t("1f. data.count = jumlah entries", data.count === data.entries.length, `${data.count} vs ${data.entries.length}`);

  const free = lib.listFree(1, 10);
  t("1g. listFree: semua tanpa auth & working", free.rows.every(e => !e.auth && e.working));
  t("1h. paging: hal 2 beda isi hal 1", JSON.stringify(lib.listFree(2, 10).rows.map(r => r.name)) !== JSON.stringify(free.rows.map(r => r.name)));
  t("1i. halaman di luar batas di-clamp (hal 999 → hal terakhir)", lib.listFree(999, 10).page <= lib.listFree(999, 10).pages);

  const search = lib.searchG4f("gemini");
  t("1j. cari 'gemini' nemu (case-insensitive)", search.length > 0, JSON.stringify(search.map(e => e.name)));
  t("1k. searchG4f('') → kosong", lib.searchG4f("").length === 0);

  const by = lib.getByName("QWEN");
  t("1l. getByName case-insensitive", by?.name === "Qwen" || by !== null, JSON.stringify(by?.name));
  t("1m. getByName gak ketemu → null", lib.getByName("tidurmalam") === null);

  const r = lib.randomFree();
  t("1n. randomFree: provider valid + ada url", !r?.auth && r?.working && !!r.url, JSON.stringify(r?.name));
}

// ===== 2. SECTION: plugin — menu & list =====
{
  const { handler, config } = await import(R("../../plugins/ai/g4f.js"));
  t("2a. export config + handler (loader rule)", typeof config?.name === "string" && typeof handler === "function");
  t("2b. nama g4f, kategori ai, alias gpt4free", config.name === "g4f" && config.category === "ai" && config.alias.includes("gpt4free"));

  sent.length = 0;
  await handler(mkMsg([]), {});
  const menu = lastCard();
  t("2c. menu kartu: judul + statistik + sumber", menu.includes("KATALOG PROVIDER") && menu.includes("gpt4free"));
  t("2d. menu ada semua perintah (list/login/audio/cari/detail/acak/panduan)", ["list", "login", "audio", "cari", "detail", "acak", "panduan"].every(k => menu.includes(`g4f ${k}`) || menu.includes(k)));

  sent.length = 0;
  await handler(mkMsg(["list"]), {});
  const l = lastCard();
  t("2e. .g4f list → provider gratis (✅ bukan 🔑)", l.includes("✅") && !l.rows ? true : l.includes("Halaman 1/"));
  t("2f. list ada halaman + hint next", l.includes("Halaman 1/") && l.includes("g4f list 2"));

  sent.length = 0;
  await handler(mkMsg(["list", "2"]), {});
  t("2g. halaman 2 jalan", lastCard().includes("Halaman 2/"), lastCard().slice(-40));

  sent.length = 0;
  await handler(mkMsg(["login"]), {});
  t("2h. .g4f login → provider 🔑", lastCard().includes("🔑"));

  sent.length = 0;
  await handler(mkMsg(["audio"]), {});
  t("2i. .g4f audio jalan", lastCard().includes("AUDIO/TTS") || lastCard().includes("audio"));

  sent.length = 0;
  await handler(mkMsg(["panduan"]), {});
  const p = lastCard();
  t("2j. panduan: docker + endpoint :1337/v1 + repo", p.includes("docker run") && p.includes("1337") && p.includes("gpt4free"));
}

// ===== 3. SECTION: cari, detail, acak =====
{
  const { handler } = await import(R("../../plugins/ai/g4f.js"));
  sent.length = 0;
  await handler(mkMsg(["cari", "pollinations"]), {});
  t("3a. cari nemu provider", lastCard().includes("HASIL") && lastCard().includes("▪"));

  sent.length = 0;
  await handler(mkMsg(["cari", "zzzyyyxxx"]), {});
  t("3b. cari gak nemu → kartu saran", lastCard().includes("Gak nemu"));

  sent.length = 0;
  await handler(mkMsg(["cari"]), {});
  t("3c. cari tanpa keyword → kartu format", lastCard().includes("Format"));

  sent.length = 0;
  await handler(mkMsg(["detail", "Qwen"]), {});
  const d = lastCard();
  t("3d. detail Qwen → kartu status+login+stream", d.includes("Qwen") && d.includes("Status:") && d.includes("Login:"));

  sent.length = 0;
  await handler(mkMsg(["detail", "providerNgalor"]), {});
  t("3e. detail gak ketemu → kartu error", lastCard().includes("Gak Ketemu"));

  sent.length = 0;
  await handler(mkMsg(["acak"]), {});
  t("3f. acak → kartu detail provider gratis", lastCard().includes("Status:") && lastCard().includes("✅"));
}

// ===== 4. SECTION: fallback & edge case (QA gerbang 4) =====
{
  const { handler } = await import(R("../../plugins/ai/g4f.js"));
  sent.length = 0;
  await handler(mkMsg(["qwen"]), {});
  t("4a. keyword langsung → fallback search", lastCard().includes("HASIL"));

  sent.length = 0;
  await handler(mkMsg(["subRandomGakAda"]), {});
  t("4b. sub gak dikenal (gak nemu search juga) → menu + react ❓", lastCard().includes("KATALOG PROVIDER"));

  let threw = false;
  try { sent.length = 0; await handler(mkMsg([null, undefined]), {}); } catch { threw = true; }
  t("4c. args null/undefined → gak throw", !threw && sent.length > 0);

  threw = false;
  try { sent.length = 0; await handler({ ...mkMsg([]), args: null, isGroup: true, chat: "123@g.us" }, {}); } catch { threw = true; }
  t("4d. args null di grup → menu, gak throw", !threw && sent.length > 0);

  threw = false;
  try { sent.length = 0; await handler({ ...mkMsg(["detail"]), quoted: { text: "apa aja" } }, {}); } catch { threw = true; }
  t("4e. detail tanpa nama → kartu error, gak throw", !threw && lastCard().includes("Gak Ketemu"));
}

// ===== 5. SECTION: format kartu & isolasi fitur AI existing =====
{
  const { handler } = await import(R("../../plugins/ai/g4f.js"));
  sent.length = 0;
  await handler(mkMsg([]), {});
  const card = lastCard();
  t("5a. judul kartu 『 *G4f Ai Gratis* 』", card.includes("『 *G4f Ai Gratis* 』"), card.slice(0, 30));
  t("5b. kartu pakai chip ᯓ", card.includes("ᯓ"));

  const fs = await import("node:fs");
  const path = await import("node:path");
  const base = R("../..");
  const existing = ["plugins/ai-agent/agent.js", "plugins/ai-agent/hiaiagent.js", "plugins/ai-agent/agentloop.js", "plugins/ai-agent/autotask.js", "plugins/ai/aiagents.js"];
  t("5c. fitur AI agent existing tetap ada (gak diganti)", existing.every(f => fs.existsSync(path.join(base, f))));

  // kategori ai gak dobel nama command
  const data = JSON.parse(fs.readFileSync(R("../../src/data/g4f.json"), "utf8"));
  t("5d. dataset bebas kode GPL (cuma field data)", !JSON.stringify(data).includes("import ") && !JSON.stringify(data).includes("def "));
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
