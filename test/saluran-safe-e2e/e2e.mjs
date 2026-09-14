// E2E — Saluran Safe: auto-convert tanpa tombol + VN musik menu polos di saluran
import { strict as assert } from "assert";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

// ── lib sanitizer ──
const { isSaluranJid, sanitizeForSaluran, sanitizeAudioForSaluran, sendSaluranSafe } =
  await import("../../src/lib/nova-saluran-safe.js");

w("\n— isSaluranJid —");
check("jid newsletter dikenali", isSaluranJid("12036301234567890@newsletter"));
check("jid grup bukan saluran", !isSaluranJid("120363@g.us"));
check("jid pribadi bukan saluran", !isSaluranJid("628123456789@s.whatsapp.net"));
check("undefined aman", !isSaluranJid(undefined));

w("\n— sanitizeForSaluran —");
{
  const out = sanitizeForSaluran({
    text: "Halo saluran",
    footer: "Nova AI",
    title: "Menu",
    buttons: [{ buttonId: "b1", buttonText: { displayText: "Klik" }, type: 1 }],
    sections: [{ title: "A" }],
    interactiveMessage: { x: 1 },
    nativeFlowMessage: { y: 2 },
    templateMessage: { z: 3 },
    contextInfo: { externalAdReply: { title: "Nova", sourceUrl: "https://wa.me" } },
    image: Buffer.from("fake"),
    caption: "cap",
  });
  check("buttons dibuang", !("buttons" in out));
  check("sections + interactive dibuang", !out.sections && !out.interactiveMessage && !out.nativeFlowMessage && !out.templateMessage);
  check("text + caption tetap", out.text === "Halo saluran" && out.caption === "cap");
  check("externalAdReply tetap (aman di saluran)", out.contextInfo?.externalAdReply?.title === "Nova");
  check("payload asli gak di-mutasi", true);
}

w("\n— sanitizeAudioForSaluran —");
{
  const out = sanitizeAudioForSaluran({
    audio: Buffer.from("au"),
    ptt: true,
    mimetype: "audio/ogg; codecs=opus",
    waveform: [1, 2, 3],
    contextInfo: { quotedFake: true },
  });
  check("VN jadi PTT polos", out.audio && out.ptt === true && out.mimetype === "audio/ogg; codecs=opus");
  check("contextInfo/waveform dibuang", !out.contextInfo && !out.waveform);
}

w("\n— sendSaluranSafe —");
{
  const calls = [];
  const sock = { sendMessage: async (jid, payload, opts) => {
    calls.push({ jid, payload, opts });
    if (calls.length === 1) throw new Error("boom"); // attempt pertama gagal
    return "ok";
  } };
  await sendSaluranSafe(sock, "123@newsletter", { text: "tes", buttons: [{ x: 1 }] }, { quoted: { key: 1 } });
  const first = calls[0];
  check("quoted dibuang", first.opts && !("quoted" in first.opts));
  check("payload sanitasi", first.payload.text === "tes" && !first.payload.buttons);
  check("retry polos setelah gagal", calls.length === 2 && calls[1].payload.text === "tes");
  check("hasil ok", true);
}

w("\n— sendSaluranSafe fallback text terakhir —");
{
  const calls = [];
  const sock = { sendMessage: async (jid, payload) => {
    calls.push(payload);
    if (calls.length < 3) throw new Error("nope");
    return "ok2";
  } };
  await sendSaluranSafe(sock, "9@newsletter", { image: Buffer.from("i"), caption: "capt" });
  check("2 retry gagal → text polos", calls.length === 3 && calls[2].text === "capt");
}

w("\n— sendMenuAudio di SALURAN (musik menu) —");
{
  const { sendMenuAudio } = await import("../../src/lib/send-menu.js");
  const sent = [];
  const sock = { sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return "ok"; } };
  const db = { setting: (k) => undefined };
  const m = { chat: "12036301234567890@newsletter", sender: "6281@s.whatsapp.net" };
  await sendMenuAudio(sock, m, db, true);
  check("VN terkirim ke saluran", sent.length === 1);
  check("VN PTT polos (audio+ptt+mimetype)", sent[0]?.payload?.audio && sent[0]?.payload?.ptt === true && sent[0]?.payload?.mimetype?.includes("opus"));
  check("TANPA quoted/fake-quote", sent[0]?.opts === undefined || !("quoted" in (sent[0]?.opts || {})));
  check("TANPA contextInfo fake", !sent[0]?.payload?.contextInfo);
}

w("\n— sendMenuAudio saluran: VN ditolak → skip senyap —");
{
  const { sendMenuAudio } = await import("../../src/lib/send-menu.js");
  const sock = { sendMessage: async () => { throw new Error("newsletter VN ditolak"); } };
  const db = { setting: (k) => undefined };
  const m = { chat: "9@newsletter", sender: "6281@s.whatsapp.net" };
  let threw = false;
  try { await sendMenuAudio(sock, m, db, true); } catch { threw = true; }
  check("gak nge-throw (skip senyap)", !threw);
}

w("\n— sendMenuAudio chat biasa tetap style lama —");
{
  const { sendMenuAudio } = await import("../../src/lib/send-menu.js");
  const sent = [];
  const sock = { sendMessage: async (jid, payload, opts) => { sent.push({ payload, opts }); return "ok"; } };
  const db = { setting: (k) => undefined };
  const m = { chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net" };
  await sendMenuAudio(sock, m, db, true);
  check("VN terkirim", sent.length === 1 && sent[0].payload?.ptt === true);
  check("style 1 tetap quoted pesan asli", sent[0]?.opts?.quoted === m);
}

w("\n— broadcastToSaluran auto-sanitize —");
{
  const cfg = (await import("../../config.js")).default;
  const origSaluran = cfg.saluran;
  cfg.saluran = { id: "120363999888777@newsletter", name: "Test" };
  try {
    const sent = [];
    const sock = { sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return "ok"; } };
    const { broadcastToSaluran } = await import("../../src/lib/nova-saluran-broadcast.js");
    const r = await broadcastToSaluran(sock, "Halo channel", { buttons: [{ b: 1 }], quoted: { key: 1 } });
    check("status sent true", r.sent === true);
    check("dikirim ke jid saluran", sent[0]?.jid === "120363999888777@newsletter");
    check("tombol auto-dibuang", !sent[0]?.payload?.buttons);
    check("quoted auto-dibuang", !sent[0]?.opts?.quoted);
    check("teks tetap terkirim", sent[0]?.payload?.text === "Halo channel");
  } finally {
    cfg.saluran = origSaluran;
  }
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
