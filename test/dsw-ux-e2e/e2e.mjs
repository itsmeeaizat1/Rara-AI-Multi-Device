// E2E UX .dsw (16 Sep 2026, owner: "disastersystemwatch juga sama" — pola .wsw)
// Fokus: alias pendek, kata santai dikenali, panduan MULAI CEPAT, unknown hint.
// Lib rara-bencana di-inject state file temp biar gak nyentuh data asli.
import { _setBencanaStateFileForTest, _setBencanaSockForTest, stopBencanaMonitor } from "../../src/lib/rara-bencana.js";

const R = process.cwd();
const STATE = "/tmp/dsw-ux-state-test.json";
_setBencanaStateFileForTest(STATE);
_setBencanaSockForTest(null);

let pass = 0, fail = 0;
const out = (s) => console.log(s);
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const mod = await import(R + "/plugins/cuaca/disastersystemwatch.js");
const replies = [];
function mockM(args, { group = false } = {}) {
  return {
    args,
    chat: group ? "628999-1111@g.us" : "628999@s.whatsapp.net",
    sender: "628999@s.whatsapp.net",
    isGroup: group,
    reply: async (txt) => { replies.push(String(txt)); return { handled: true }; },
    react: async () => ({}),
  };
}
const sockMock = { sendMessage: async () => ({}), groupMetadata: async () => ({}), relayMessage: async () => ({}) };

out("— alias & config —");
t("1a. alias pendek .dsw terdaftar", (mod.config.alias || []).includes("dsw"), JSON.stringify(mod.config.alias));
t("1b. nama asli .disastersystemwatch tetap jalan", (mod.config.alias || []).includes("disastersystemwatch"));
t("1c. usage nunjukin .dsw", String(mod.config.usage || "").includes(".dsw"));

out("\n— kata santai → panduan —");
await mod.handler(mockM(["bantuan"]), { sock: sockMock });
t("2a. 'bantuan' → guide (isi CARA PALING GAMPANG)", /CARA PALING GAMPANG/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 60));
t("2b. guide nyebut singkatan .dsw", /\.dsw/.test(replies.at(-1) || "") && /singkatan/i.test(replies.at(-1) || ""));
await mod.handler(mockM(["petunjuk"]), { sock: sockMock });
t("2c. 'petunjuk' → guide juga", /CARA PALING GAMPANG/.test(replies.at(-1) || ""));
await mod.handler(mockM(["panduan"]), { sock: sockMock });
t("2d. 'panduan' → guide juga", /CARA PALING GAMPANG/.test(replies.at(-1) || ""));

out("\n— status → MULAI CEPAT —");
await mod.handler(mockM([]), { sock: sockMock }); // no args → status
const stTxt = replies.at(-1) || "";
t("3a. status tanpa arg → MULAI CEPAT 3 LANGKAH", /MULAI CEPAT/.test(stTxt), stTxt.slice(0, 60));
t("3b. status ada grup perintah (EWS/Global/Lokasi)", /EWS/.test(stTxt) && /Global/.test(stTxt) && /Lokasi/.test(stTxt));
t("3c. status nyebut .dsw", /\.dsw/.test(stTxt));

out("\n— kata natural aktif/matikan —");
await mod.handler(mockM(["matikan"]), { sock: sockMock }); // tanpa langganan → tetap reply off
t("4a. 'matikan' dikenali (reply dimatikan, bukan unknown)", /dimatikan|Bencana Watch/i.test(replies.at(-1) || "") && !/gak dikenali/i.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 60));
await mod.handler(mockM(["aktifkan"]), { sock: sockMock }); // DM → pilih scope
const onTxt = replies.at(-1) || "";
t("4b. 'aktifkan' di DM → pilihan scope (onchat/onglobal)", !/gak dikenali/i.test(onTxt) && /onglobal|onchat/i.test(onTxt), onTxt.slice(0, 80));

out("\n— unknown → hint .dsw —");
await mod.handler(mockM(["foter"]), { sock: sockMock });
t("5a. unknown → hint panduan + MULAI CEPAT", /gak dikenali/i.test(replies.at(-1) || "") && /\.dsw guide/.test(replies.at(-1) || "") && /MULAI CEPAT/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 90));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
try { stopBencanaMonitor(); } catch {}
process.exit(fail ? 1 : 0);
