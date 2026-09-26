// E2E AICALL VOICE COMMAND BRIDGE (26 Sep 2026) — owner kontrol bot lewat
// telepon AI Call: "matikan bot" → .bot off.
// Jalankan: node test/aicall-voicecmd-e2e/e2e.mjs
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

const b = await import("../../src/lib/nova-aicall-bridge.js");
const { matchVoiceCommand, normalizeVoiceText, startAicallVoiceBridge, _setBridgeMessageHandlerForTest, _clearBridgeMessageHandlerForTest, _setBridgeOwnerCheckForTest, _clearBridgeOwnerCheckForTest } = b;

// ═══ 1. matcher peta perintah suara ═══
w("\n— matcher: kata → command —");
{
  const cases = [
    ["Halo, tolong matikan bot ya", "bot off"],
    ["tolong matiin botnya dong", "bot off"],
    ["nyalakan bot", "bot on"],
    ["bisukan bot dulu", "bot mute"],
    ["ayo restart bot", "index restart"],
    ["sambungkan ulang koneksi", "index reconnect"],
    ["simpan database sekarang", "index db save"],
  ];
  for (const [t, cmd] of cases) {
    check(`"${t}" → ${cmd}`, matchVoiceCommand(t)?.cmd === cmd, JSON.stringify(matchVoiceCommand(t)));
  }
  check("restart bot → replyFirst (jawab dulu baru eksekusi)", matchVoiceCommand("restart bot")?.replyFirst === true);
  const gen = matchVoiceCommand("titik bootdoctor");
  check("jalur generik \"titik <cmd>\" → bootdoctor", gen?.cmd === "bootdoctor" && gen?.generic === true, JSON.stringify(gen));
  check("obrolan biasa → chat (bukan command)", matchVoiceCommand("halo apa kabar?") === null);
  check("cerita biasa nyebut bot gak asal trigger", matchVoiceCommand("ceritain tentang bot whatsapp") === null, matchVoiceCommand("ceritain tentang bot whatsapp")?.cmd);
}
{
  check("normalisasi: kapital + tanda baca + akhiran nya", normalizeVoiceText("Matikan Bot! sekarang, botnya") === "matikan bot sekarang bot nya", normalizeVoiceText("Matikan Bot! sekarang, botnya"));
}

// ═══ 2. HTTP bridge ═══
w("\n— HTTP /voice (mock messageHandler + owner check) —");
const OWNER = "628111111111";
const STRANGER = "628999999999";
const PORT = 18790;
let mhCalls = [];
let dmSent = [];
const mockSock = {
  sendMessage: async (jid, payload) => { dmSent.push({ jid, text: String(payload?.text || "") }); return { key: { id: "x" } }; },
};
_setBridgeOwnerCheckForTest((jid) => String(jid).startsWith(OWNER));
_setBridgeMessageHandlerForTest(async (raw, sock) => {
  mhCalls.push({ chat: raw.key.remoteJid, sender: raw.key.participant, text: raw.message.conversation });
  await sock.sendMessage(raw.key.remoteJid, { text: "Perintah selesai tanpa error." });
});
startAicallVoiceBridge(mockSock, { port: PORT });

async function postVoice(body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

{
  mhCalls = []; dmSent = [];
  const r = await postVoice({ text: "halo, tolong matikan bot ya", number: OWNER + "@s.whatsapp.net" });
  check("owner + \"matikan bot\" → type=command", r.json?.type === "command" && r.json?.cmd === "bot off", JSON.stringify(r.json));
  check("konfirmasi lisan: \"botnya saya matikan\"", (r.json?.text || "").includes("matikan"), r.json?.text);
  check("command dijalankan: .bot off ke chat owner", mhCalls.length === 1 && mhCalls[0].text === ".bot off" && mhCalls[0].sender === OWNER + "@s.whatsapp.net", JSON.stringify(mhCalls));
  check("output command tetap dikirim ke DM owner", dmSent.length === 1 && dmSent[0].text.includes("selesai"), JSON.stringify(dmSent));
}
{
  mhCalls = []; dmSent = [];
  const r = await postVoice({ text: "halo apa kabar", number: OWNER + "@s.whatsapp.net" });
  check("owner + obrolan biasa → type=chat (gak jalanin apa pun)", r.json?.type === "chat" && mhCalls.length === 0, JSON.stringify(r.json));
}
{
  mhCalls = []; dmSent = [];
  const r = await postVoice({ text: "tolong matikan bot", number: STRANGER + "@s.whatsapp.net" });
  check("nomor BUKAN owner → selalu chat (command gak jalan)", r.json?.type === "chat" && mhCalls.length === 0, JSON.stringify(r.json));
}
{
  mhCalls = []; dmSent = [];
  const r = await postVoice({ text: "titik bootdoctor", number: OWNER + ":0@s.whatsapp.net" });
  check("JID peer dengan :0 dinormalkan → command jalan", r.json?.type === "command" && mhCalls[0]?.text === ".bootdoctor", JSON.stringify(mhCalls));
  check("konfirmasi generik pakai output command (dibersihin markdown)", (r.json?.text || "").startsWith("Siap.") && (r.json?.text || "").includes("selesai"), r.json?.text);
}
{
  // generik TAPI command gak jawab apa pun → jujur gak bisa
  _setBridgeMessageHandlerForTest(async () => {});
  const r = await postVoice({ text: "titik fiturngakada", number: OWNER + "@s.whatsapp.net" });
  check("generik tanpa output → jujur \"tidak bisa dijalankan\"", (r.json?.text || "").includes("tidak bisa"), r.json?.text);
}
{
  // balikin recording mock (tes generik tadi gantiin jadi noop)
  _setBridgeMessageHandlerForTest(async (raw, sock) => {
    mhCalls.push({ chat: raw.key.remoteJid, sender: raw.key.participant, text: raw.message.conversation });
    await sock.sendMessage(raw.key.remoteJid, { text: "Perintah selesai tanpa error." });
  });
  mhCalls = []; dmSent = [];
  const t0 = Date.now();
  const r = await postVoice({ text: "restart bot sekarang", number: OWNER + "@s.whatsapp.net" });
  const dur = Date.now() - t0;
  check("restart → replyFirst: jawaban instan (gak nunggu eksekusi)", r.json?.type === "command" && dur < 1500, dur + "ms");
  check("eksekusi .index restart dateng belakangan (async)", await new Promise((res) => { setTimeout(() => res(mhCalls.some((c) => c.text === ".index restart")), 1500); }), JSON.stringify(mhCalls));
}
{
  const r = await postVoice({});
  check("body gak lengkap → 400", r.status === 400, r.status + "");
}
{
  // auth: key aktif → key salah ditolak
  process.env.AICALL_HTTP_KEY = "bridge-secret";
  const bad = await postVoice({ text: "matikan bot", number: OWNER + "@s.whatsapp.net" }, { "X-Api-Key": "salah" });
  check("key salah → 401", bad.status === 401, bad.status + "");
  const good = await postVoice({ text: "matikan bot", number: OWNER + "@s.whatsapp.net" }, { "X-Api-Key": "bridge-secret" });
  check("key bener → lolos", good.status === 200 && good.json?.type === "command", JSON.stringify(good.json));
  delete process.env.AICALL_HTTP_KEY;
}

w(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
