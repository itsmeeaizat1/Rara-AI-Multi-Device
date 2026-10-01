// RARA AI WHATSAPP BOT — E2E: tqto.js (revisi owner 20 Sep 2026)
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; }
  else { fail++; console.error("  \u274c " + name, info !== undefined ? JSON.stringify(info) : ""); }
}

const { fromSC } = await import(R + "/src/lib/styler.js");
const mod = await import(R + "/plugins/main/tqto.js");
const { handler, config: pluginConfig } = mod;

// mock m.reply — tangkap teks final
let replyText = "";
const m = { reply: async (txt) => { replyText = txt; } };

await handler(m, { sock: null, uptime: 86400000 }); // 1 hari ms (formatUptime expects ms)
const plain = fromSC(replyText || "");

// ═══ SECTION 1: struktur dasar ═══
console.log("\n— section 1: struktur dasar —");
t("1a. plugin config sah (name tqto, enabled)", pluginConfig.name === "tqto" && pluginConfig.isEnabled === true);
t("1b. reply kekirim (gak crash)", typeof replyText === "string" && replyText.length > 0);
t("1c. header kartu tqto", /tqto/i.test(plain), plain.slice(0, 60));

// ═══ SECTION 2: kontributor (role disamain AI Coding Assistant) ═══
console.log("\n— section 2: kontributor —");
t("2a. ada 4 kontributor bernomor 1-4", /\*1\*\./.test(plain) && /\*4\*\./.test(plain));
t("2b. Aizat [ Pembuat Bot ]", /aizat.*pembuat bot/i.test(plain));
t("2c. Claude Sonnet 5 → AI Coding Assistant (bukan 'AI Coding' polos)", /claude sonnet 5.*ai coding assistant/i.test(plain));
t("2d. OpenAI Luna → AI Coding Assistant", /openai luna.*ai coding assistant/i.test(plain));
t("2e. GLM (Terbaru) → AI Coding Assistant", /glm.*terbaru.*ai coding assistant/i.test(plain));

// ═══ SECTION 3: readmore — bagian panjang ke-collapse ═══
console.log("\n— section 3: readmore —");
const LRM = String.fromCharCode(8206);
t("3a. tanda readmore ada (LRM x4001) — teks panjang ke-collapse", replyText.includes(LRM.repeat(4001)));
t("3b. readmore muncul SETELAH daftar kontributor (4 kredit keliatan duluan)", replyText.indexOf(LRM.repeat(4001)) > replyText.indexOf("GLM"));

// ═══ SECTION 4: library & rest api ═══
console.log("\n— section 4: library & rest api —");
t("4a. Adiwajshing (pembuat Baileys)", /adiwajshing.*baileys/i.test(plain));
t("4b. Nurutomo (wabot-aq, base legendaris)", /nurutomo.*wabot-aq/i.test(plain));
t("4c. section All Rest API", /all rest api/i.test(plain));
t("4d. Iky (IkyyXD) ada di daftar", /ikyyxd.*iky|iky.*ikyyxd/i.test(plain));
t("4e. Haidar (HaidarApis) ada di daftar", /haidarapis|haidarxd/i.test(plain));

// ═══ SECTION 5: kontak, link, sosmed, runtime, base, lisensi ═══
console.log("\n— section 5: info lengkap —");
t("5a. Kontak WhatsApp 08174887770", /08174887770/.test(plain));
t("5b. Email aizatalamudinindonesia.plus@gmail.com", /aizatalamudinindonesia\.plus@gmail\.com/.test(plain));
t("5c. Link Grup Dan Saluran Official section + link grup config", /link grup dan saluran official/i.test(plain) && /chat\.whatsapp\.com/.test(plain));
t("5d. link saluran official config (whatsapp.com/channel)", /whatsapp\.com\/channel/.test(plain));
t("5e. Akun Sosial Media TikTok itsmee_aizat", /akun sosial media/i.test(plain) && /itsmee_aizat/i.test(plain));
t("5f. Runtime — 'menyala tanpa mati selama' + durasi (1d)", /menyala tanpa mati selama 1d/i.test(plain));
t("5g. Nama Script & Base: Rara AI Multi Device + Baileys Multi-Device", /base: rara ai multi device/i.test(plain) && /baileys: multi-device/i.test(plain));
t("5h. Keterangan Lisensi — Copyright © 2024-2026 Aizat", /keterangan lisensi/i.test(plain) && /copyright © 2024-2026 aizat/i.test(plain));
t("5i. larangan menyebarkan tanpa izin", /dilarang menyalin/i.test(plain));

// ═══ SECTION 6: regresi — readmore gak ngerusak formatGuard ═══
console.log("\n— section 6: sanitasi —");
t("6a. gak ada backslash-n literal (\\n teks)", !/\\n/.test(replyText));
t("6b. rata kiri — gak ada indent aneh di baris awal", !/\n +[^\s]/.test(replyText.split(LRM.repeat(4001))[0]));

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail > 0 ? 1 : 0);
