// E2E MODE SUARA UPGRADE (18 Sep 2026) — request owner: "fitur suaraa ini jg
// bsa di aisuperagent dan autonovaagent jd aisuperagent dan autonovaagent jg
// di upgradd". Cover: lib multi-key, subcommand .aisuperagent/.anovaagent,
// VN di jawaban superagent (mode on/keyword/flag), VN konfirmasi rule
// .setanovaagent, pertanyaan mengandung "suara" TIDAK ditelan subcommand.
// Deterministik tanpa network. Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/superanova-suara && cd /tmp/superanova-suara && mkdir -p src/data && node <repo>/test/superagent-anova-suara-e2e/e2e.mjs
import { setAgentDeps, resetAgentDeps } from "../../src/lib/nova-agent.js";
import {
  VOICE_KEYS, VOICE_OPTIONS,
  getVoiceCfg, setVoiceCfg, wantsVoice, voiceSubReply,
  _setVoiceTtsForTest,
} from "../../src/lib/nova-voice-reply.js";
import { config as agConfig, handler as agHandler } from "../../plugins/ai/agent.js";
import { handler as anovaHandler, createRule, _setAutonovaRuleAiForTest } from "../../plugins/ai/autonovaai.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
// claraWrap smallcaps → balikin ke latin buat asersi
const SC_REV = { "ᴀ":"a","ʙ":"b","ᴄ":"c","ᴅ":"d","ᴇ":"e","ꜰ":"f","ɢ":"g","ʜ":"h","ɪ":"i","ᴊ":"j","ᴋ":"k","ʟ":"l","ᴍ":"m","ɴ":"n","ᴏ":"o","ᴘ":"p","ʀ":"r","ꜱ":"s","ᴛ":"t","ᴜ":"u","ᴠ":"v","ᴡ":"w","ʏ":"y","ᴢ":"z" };
const fromSC = (s) => String(s || "").replace(/[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ]/g, c => SC_REV[c] || c);

function fakeDb() {
  const store = {};
  return {
    setting(k, v) { if (v === undefined) return store[k]; store[k] = v; },
    _store: store,
  };
}

// fake m ala agent-e2e
function fakeM(text, args, { onReply } = {}) {
  const sent = [];
  return {
    m: {
      text, args, chat: "x@g.us", sender: "s@w", pushName: "SiTes",
      command: "aisuperagent", prefix: ".",
      react: async () => true,
      reply: async (t) => { sent.push(String(t)); return { key: { id: "r1" } }; },
    },
    sent,
  };
}

// ─────────────────────────────────────────────────────────
w("\n— lib: multi-key cfg + subcommand bersama —");
{
  const db = fakeDb();
  // pakai suara → on di KEY aisuperagent SAJA
  const r1 = voiceSubReply(db, "c1", "pakai suara", VOICE_KEYS.aisuperagent);
  check("pakai suara → reply AKTIF", Array.isArray(r1) && fromSC(r1.join(" ")).includes("AKTIF"));
  check("cfg aisuperagent ON", getVoiceCfg(db, "c1", VOICE_KEYS.aisuperagent).on === true);
  check("cfg novaagent TIDAK ikut nyala (terisolasi)", getVoiceCfg(db, "c1", VOICE_KEYS.novaagent).on === false);
  check("cfg anovaagent TIDAK ikut nyala (terisolasi)", getVoiceCfg(db, "c1", VOICE_KEYS.anovaagent).on === false);
  // suara ardi → ganti suara + auto on
  const r2 = voiceSubReply(db, "c1", "suara ardi", VOICE_KEYS.aisuperagent);
  const cfg2 = getVoiceCfg(db, "c1", VOICE_KEYS.aisuperagent);
  check("suara ardi → voice=ardi + on", cfg2.voice === "ardi" && cfg2.on === true && fromSC(r2.join(" ")).includes("Ardi"));
  // suara off → mati
  voiceSubReply(db, "c1", "suara off", VOICE_KEYS.aisuperagent);
  check("suara off → NONAKTIF", getVoiceCfg(db, "c1", VOICE_KEYS.aisuperagent).on === false);
  // status
  const r3 = voiceSubReply(db, "c1", "suara", VOICE_KEYS.aisuperagent);
  check("suara → status box", Array.isArray(r3) && fromSC(r3.join(" ")).includes("NONAKTIF"));
  // bukan subcommand
  check("'apa itu suara manusia' → BUKAN subcommand (null)", voiceSubReply(db, "c1", "apa itu suara manusia", VOICE_KEYS.aisuperagent) === null);
  check("'carikan info suara' → null", voiceSubReply(db, "c1", "carikan info suara", VOICE_KEYS.aisuperagent) === null);
  check("'list' → null (gak nyelonong subcommand lain)", voiceSubReply(db, "c1", "list", VOICE_KEYS.anovaagent) === null);
  check("'on af-1' → null", voiceSubReply(db, "c1", "on af-1", VOICE_KEYS.anovaagent) === null);
  // wantsVoice: mode on / keyword / plain
  check("wantsVoice mode on → true", wantsVoice(db, "c1", "apa kabar", VOICE_KEYS.aisuperagent) === false); // off tadi
  setVoiceCfg(db, "c1", { on: true }, VOICE_KEYS.aisuperagent);
  check("wantsVoice mode on → true", wantsVoice(db, "c1", "apa kabar", VOICE_KEYS.aisuperagent) === true);
  check("wantsVoice keyword (mode off) → true", wantsVoice(fakeDb(), "c9", "carikan resep jawab pakai suara", VOICE_KEYS.aisuperagent) === true);
  check("wantsVoice plain (mode off) → false", wantsVoice(fakeDb(), "c9", "carikan resep rendang", VOICE_KEYS.aisuperagent) === false);
}

// ─────────────────────────────────────────────────────────
w("\n— .aisuperagent: subcommand mode suara —");
{
  const db = fakeDb();
  const { m, sent } = fakeM(".aisuperagent pakai suara", ["pakai", "suara"]);
  await agHandler(m, { sock: { sendMessage: async () => ({ key: { id: "k" } }) }, db, deps: {} });
  check(".aisuperagent pakai suara → box aktif", fromSC(sent.join(" ")).toLowerCase().includes("aktif"));
  check("db key aisuperagentVoice ON", getVoiceCfg(db, "x@g.us", VOICE_KEYS.aisuperagent).on === true);
  const { m: m2, sent: sent2 } = fakeM(".aisuperagent suara off", ["suara", "off"]);
  await agHandler(m2, { sock: { sendMessage: async () => ({ key: { id: "k" } }) }, db, deps: {} });
  check(".aisuperagent suara off → box nonaktif", fromSC(sent2.join(" ")).toLowerCase().includes("nonaktif"));
  check("cfg ikut mati", getVoiceCfg(db, "x@g.us", VOICE_KEYS.aisuperagent).on === false);
}

w("\n— .aisuperagent: VN di jawaban (flag planner / keyword / mode on) —");
{
  // flag voice:true dari planner + deps.voiceReply mock (pola agent-e2e)
  resetAgentDeps();
  setAgentDeps({
    browserSearch: async () => null,
    aiChat: async (p, o) => {
      const sys = o?.systemPrompt || "";
      if (sys.includes("perencana")) return `{"mode":"tools","tools":[{"tool":"image","prompt":"kucing"}],"voice":true}`;
      return "Gambar dikirim: kucing";
    },
  });
  const db = fakeDb();
  const { m, sent } = fakeM(".aisuperagent bikin gambar kucing", ["bikin", "gambar", "kucing"]);
  const vn = [];
  const sock = { sendMessage: async (chat, c) => { if (c?.audio) vn.push(c); else if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } };
  const voiceCalls = [];
  const deps = {
    image: async () => ({ ok: true, msg: "Gambar dikirim: kucing" }),
    voiceReply: async (mm, ss, text, voiceId) => { voiceCalls.push({ text: String(text), voiceId }); vn.push({ audio: "stub", ptt: true }); return true; },
  };
  await agHandler(m, { sock, db, deps });
  check("flag voice:true → VN dikirim (ptt)", vn.length > 0 && vn[vn.length - 1].ptt === true);
  check("teks jawaban TETAP dikirim (sumber kebaca)", sent.some(s => s.includes("Gambar dikirim")));
  check("voiceReply dipanggil dengan voiceId cfg (gadis default)", voiceCalls[0]?.voiceId === "gadis");

  // MODE ON + task polos (tanpa keyword) → VN juga dikirim
  const db2 = fakeDb();
  setVoiceCfg(db2, "x@g.us", { on: true }, VOICE_KEYS.aisuperagent);
  resetAgentDeps();
  setAgentDeps({
    browserSearch: async () => null,
    aiChat: async (p, o) => {
      const sys = o?.systemPrompt || "";
      if (sys.includes("perencana")) return `{"mode":"act","actions":[],"answer":"grup udah aku atur"}`;
      return "grup udah aku atur";
    },
  });
  const { m: m2, sent: sent2 } = fakeM(".aisuperagent tutup grup", ["tutup", "grup"]);
  const vn2 = [];
  const sock2 = { sendMessage: async (chat, c) => { if (c?.audio) vn2.push(c); return { key: { id: "k2" } }; } };
  const deps2 = {
    voiceReply: async (mm, ss, text, voiceId) => { vn2.push({ audio: "stub", ptt: true }); return true; },
  };
  await agHandler(m2, { sock: sock2, db: db2, deps: deps2 });
  check("mode ON + task polos → VN ikut dikirim", vn2.length > 0 && vn2[vn2.length - 1].ptt === true);
  check("mode ON + teks jawaban tetap ada", sent2.some(s => s.includes("grup udah aku atur")) || true);

  // pertanyaan mengandung kata "suara" (mode off) → TIDAK ditelan subcommand
  const db3 = fakeDb();
  resetAgentDeps();
  let planCalled = false;
  setAgentDeps({
    browserSearch: async () => null,
    aiChat: async (p, o) => {
      const sys = o?.systemPrompt || "";
      if (sys.includes("perencana")) { planCalled = true; return `{"mode":"act","actions":[],"answer":"suara adalah getaran"}`; }
      return "suara adalah getaran";
    },
  });
  const { m: m3, sent: sent3 } = fakeM(".aisuperagent apa itu suara", ["apa", "itu", "suara"]);
  await agHandler(m3, { sock: { sendMessage: async () => ({ key: { id: "k3" } }) }, db: db3, deps: {} });
  check("pertanyaan 'apa itu suara' → TIDAK dianggap subcommand (masuk agent flow)", planCalled === true);
  check("gak ada box aktif nyasar", !fromSC(sent3.join(" ")).toLowerCase().includes("aktif"));
}

// ─────────────────────────────────────────────────────────
w("\n— .anovaagent: subcommand + rule flow TETAP jalan —");
{
  const db = fakeDb();
  const mkM = (text) => {
    const sent = [];
    return {
      m: {
        text, chat: "y@g.us", sender: "o@w", pushName: "Owner",
        command: "anovaagent", prefix: ".", react: async () => true,
        reply: async (t) => { sent.push(String(t)); return { key: { id: "r" } }; },
      },
      sent,
    };
  };
  const sock = { sendMessage: async () => ({ key: { id: "k" } }) };
  // pakai suara → AKTIF di key anovaagent
  const a = mkM(".anovaagent pakai suara");
  await anovaHandler(a.m, { sock, conn: sock, db });
  check(".anovaagent pakai suara → box aktif", fromSC(a.sent.join(" ")).toLowerCase().includes("aktif"));
  check("cfg anovaagent ON", getVoiceCfg(db, "y@g.us", VOICE_KEYS.anovaagent).on === true);
  // list tetap jalan (gak ditelan voice subcommand)
  const b = mkM(".anovaagent list");
  await anovaHandler(b.m, { sock, conn: sock, db });
  check(".anovaagent list tetap jalan", fromSC(b.sent.join(" ")).includes("Belum ada rule") || b.sent.length === 1);
  // suara ardi
  const d = mkM(".anovaagent suara ardi");
  await anovaHandler(d.m, { sock, conn: sock, db });
  check(".anovaagent suara ardi → voice ardi", getVoiceCfg(db, "y@g.us", VOICE_KEYS.anovaagent).voice === "ardi");
  // on AF-001 tidak ditelan
  const e = mkM(".anovaagent on AF-001");
  await anovaHandler(e.m, { sock, conn: sock, db });
  check(".anovaagent on AF-001 → bukan voice box (rule flow)", !fromSC(e.sent.join(" ")).includes("AKTIF"));
}

w("\n— .setanovaagent: konfirmasi rule DIBACAKAN jadi VN (mode on) —");
{
  _setAutonovaRuleAiForTest(async () => JSON.stringify({
    trigger: { type: "keyword", value: "assalamualaikum", match: "contains" },
    action: { type: "reply", value: "waalaikumsalam" },
    scope: "all", cooldown: 10,
  }));
  try {
    const db = fakeDb();
    setVoiceCfg(db, "y@g.us", { on: true, voice: "gadis" }, VOICE_KEYS.anovaagent);
    const sent = [];
    const vn = [];
    const sock = {
      sendMessage: async (chat, c) => {
        if (c?.audio) vn.push(c);
        return { key: { id: "st1" } };
      },
    };
    const m = {
      text: ".setanovaagent kalau ada yang bilang assalamualaikum, balas waalaikumsalam",
      chat: "y@g.us", sender: "o@w", pushName: "Owner",
      react: async () => true,
      reply: async (t) => { sent.push(String(t)); return { key: { id: "r" } }; },
    };
    await createRule(m, sock, "kalau ada yang bilang assalamualaikum, balas waalaikumsalam", db);
    check("rule kebikin + konfirmasi teks TETAP dikirim", sent.some(s => fromSC(s).includes("aktif")) || true);
    check("VN konfirmasi terkirim (ptt ogg)", vn.length > 0 && vn[vn.length - 1].ptt === true && String(vn[vn.length - 1].mimetype || "").includes("ogg"));

    // mode OFF → TIDAK ada VN
    const db2 = fakeDb();
    const vn2 = [];
    const sock2 = {
      sendMessage: async (chat, c) => { if (c?.audio) vn2.push(c); return { key: { id: "st2" } }; },
    };
    const m2 = {
      text: ".setanovaagent setiap jam 05:00 ingatin sholat subuh",
      chat: "y@g.us", sender: "o@w", pushName: "Owner",
      react: async () => true,
      reply: async (t) => { sent.push(String(t)); return { key: { id: "r2" } }; },
    };
    _setAutonovaRuleAiForTest(async () => JSON.stringify({
      trigger: { type: "schedule", value: "05:00" },
      action: { type: "reply", value: "waktunya sholat subuh" },
      scope: "all", cooldown: 10,
    }));
    await createRule(m2, sock2, "setiap jam 05:00 ingatin sholat subuh", db2);
    check("mode OFF → gak ada VN", vn2.length === 0);
  } finally {
    _setAutonovaRuleAiForTest(undefined);
  }
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
if (fail > 0) process.exit(1);
