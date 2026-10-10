// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E UA-PARSER — User-Agent toolkit + integrasi rara-http (feat/ua-parser)
// Jalankan: node test/ua-e2e/e2e.mjs

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
    args, text: ".ua " + args.join(" "),
    reply: async (card) => { sent.push({ to: "6281@s.whatsapp.net", msg: { text: card } }); return true; },
    react: async () => true,
    ...extra,
  };
}
const lastCard = () => sent[sent.length - 1]?.msg?.text || "";

// ===== 1. SECTION: parser & pool (integration, lib asli) =====
{
  const ua = await import(R("../../src/lib/rara-ua.js"));

  const chromeWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const r = ua.parseUA(chromeWin);
  t("1a. parse Chrome/Win → browser Chrome", r?.browser?.name === "Chrome", JSON.stringify(r?.browser));
  t("1b. OS Windows + engine Blink", r?.os?.name === "Windows" && r?.engine?.name === "Blink", JSON.stringify(r?.os));
  t("1c. CPU amd64 kedeteksi", r?.cpu?.architecture === "amd64");
  t("1d. raw string tersimpan utuh", r?.raw === chromeWin);

  const ffMac = ua.parseUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0");
  t("1e. parse Firefox/Mac → Firefox + Gecko", ffMac?.browser?.name === "Firefox" && ffMac?.engine?.name === "Gecko");

  const waUa = ua.parseUA("WhatsApp/2.24.24.66 Android/15 (Chrome/131.0.0.0)");
  t("1f. UA WhatsApp dikenali (Android)", waUa?.os?.name === "Android", JSON.stringify(waUa?.os));

  t("1g. parseUA('') & null → null, gak throw", ua.parseUA("") === null && ua.parseUA(null) === null);
  t("1h. pool >= 8 UA modern", ua.getUaPoolSize() >= 8, String(ua.getUaPoolSize()));

  const uniq = new Set();
  for (let i = 0; i < 40; i++) uniq.add(ua.getRandomUserAgent());
  t("1i. rotasi acak bervariasi (>1 unik dr 40 draw)", uniq.size > 1, String(uniq.size));
  const poolAllValid = [...uniq].every((u) => {
    const p = ua.parseUA(u);
    return p && (p.browser?.name || p.os?.name);
  });
  t("1j. SEMUA UA di pool lolos validasi parser", poolAllValid);
}

// ===== 2. SECTION: integrasi rara-http (fitur beneran kepakai) =====
{
  const fs = await import("node:fs");
  const src = fs.readFileSync(R("../../src/lib/rara-http.js"), "utf8");
  t("2a. rara-http import getRandomUserAgent", src.includes("getRandomUserAgent"));
  t("2b. header UA hardcoded Chrome/120 DIGANTI rotasi", !src.includes('"User-Agent": "Mozilla/5.0') && src.includes('"User-Agent": getRandomUserAgent()'));
  t("2c. override per-call masih bisa (spread headers setelah default)", src.includes("...headers"));

  const ua = await import(R("../../src/lib/rara-ua.js"));
  const u = ua.getRandomUserAgent();
  t("2d. UA yang dipakai http = modern (>Chrome/128 / FF/131 era)", /(Chrome\/12[89]|Chrome\/13[01]|Firefox\/13\d|SamsungBrowser|Safari\/60)/.test(u), u.slice(0, 50));
}

// ===== 3. SECTION: plugin .ua — kartu & alur =====
{
  const { handler, config } = await import(R("../../plugins/tools/ua.js"));
  t("3a. export config + handler (loader rule)", typeof config?.name === "string" && typeof handler === "function");
  t("3b. nama 'ua', kategori tools, alias useragent", config.name === "ua" && config.category === "tools" && config.alias.includes("useragent"));

  sent.length = 0;
  await handler(mkMsg(["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"]), {});
  const card = lastCard();
  t("3c. parse via command → kartu hasil", card.includes("HASIL PARSE") && card.includes("Browser"));
  t("3d. kartu ada Browser/Engine/OS/Device/CPU", ["Browser", "Engine", "OS", "Device", "CPU"].every(k => card.includes(k)));
  t("3e. judul kartu 『 *User Agent* 』", card.includes("『 *User Agent* 』"), card.slice(0, 30));
  t("3f. string asli ke-print (siap copy)", card.includes("Chrome/131.0.0.0"));

  sent.length = 0;
  await handler(mkMsg(["acak"]), {});
  const acak = lastCard();
  t("3g. .ua acak → UA random siap copy", acak.includes("Mozilla/") && acak.includes("siap copy"));

  sent.length = 0;
  await handler(mkMsg([]), {});
  t("3h. tanpa arg → kartu panduan", lastCard().includes("Panduan"));

  sent.length = 0;
  await handler(mkMsg([], { quoted: { text: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" } }), {});
  const q = lastCard();
  t("3i. reply pesan berisi UA → auto-parse (iOS Safari)", q.includes("HASIL PARSE") && q.includes("iOS"), q.slice(0, 60));
}

// ===== 4. SECTION: edge case (QA gerbang 4) =====
{
  const { handler } = await import(R("../../plugins/tools/ua.js"));
  const ua = await import(R("../../src/lib/rara-ua.js"));

  sent.length = 0;
  await handler(mkMsg(["hahahahayuq"]), {});
  t("4a. string sampah → kartu 'gak kedeteksi', gak throw", lastCard().includes("Gak kedeteksi") || lastCard().includes("Panduan"));

  let threw = false;
  try { sent.length = 0; await handler(mkMsg([null, undefined]), {}); } catch { threw = true; }
  t("4b. args null/undefined → gak throw", !threw && sent.length > 0);

  threw = false;
  try { sent.length = 0; await handler({ ...mkMsg([]), args: null, isGroup: true }, {}); } catch { threw = true; }
  t("4c. args null di grup → panduan, gak throw", !threw && lastCard().includes("Panduan"));

  sent.length = 0;
  await handler(mkMsg([" Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 "]), {});
  t("4d. UA dengan spasi ekstra → parse tetep jalan", lastCard().includes("Android"));

  const ok = !!(ua.parseUA("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0")?.browser?.name);
  t("4e. UA desktop Linux jalan", ok);
}

// ===== 5. SECTION: lisensi & vendor file =====
{
  const fs = await import("node:fs");
  const path = await import("node:path");
  t("5a. vendor file ada (.cjs, file asli)", fs.existsSync(R("../../src/lib/vendor/ua-parser-1.0.39.cjs")));
  const head = fs.readFileSync(R("../../src/lib/vendor/ua-parser-1.0.39.cjs"), "utf8").slice(0, 400);
  t("5b. atribusi MIT + sumber di header vendor", head.includes("UAParser.js v1.0.39") && head.includes("MIT"));
  t("5c. BUKAN v2.x AGPL (versi vendored 1.0.39)", head.includes("1.0.39") && !head.includes("2.0."));
  t("5d. lib rara-ua comment lisensi benar", fs.readFileSync(R("../../src/lib/rara-ua.js"), "utf8").includes("AGPL") === true);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
