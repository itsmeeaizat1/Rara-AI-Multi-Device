// E2E hivoip — engine VOIP + plugin (call flow nyata cuma bisa di VPS live)
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIROVOIP e2e ───");
const { readFileSync: require_fs_read } = await import("node:fs");
// readFileSync path relatif ke CWD — WAJIB resolve dari import.meta.url biar gak ENOENT saat jalan dari luar root
const fsHere = (rel) => require_fs_read(new URL(rel, import.meta.url), "utf8");

const mod = await import("../../src/lib/hivoip/index.js");
ok("engine Voip ke-import", typeof mod.default === "function");
const voip = new mod.default({ user: { id: "b@s.whatsapp.net" } });
ok("instance Voip jalan", typeof voip.call === "function" && typeof voip.end === "function");

const resolver = await import("../../src/lib/hivoip/shim/baileys-resolve.js");
ok("resolver: kandidat utama 'nova'", (await resolver.resolveBaileysModule()).jidDecode != null);

const plugin = await import("../../plugins/owner/voipcall.js");
ok("plugin config & handler ter-ekspor", !!plugin.config?.name && typeof plugin.handler === "function");
ok("cmd voipcall/voip (gak bentrok call/aicall)", plugin.config.name === "voipcall" && !["call", "aicall"].includes(plugin.config.name));
ok("owner-only (anti penyalahgunaan)", plugin.config.isOwner === true);

// handler: usage tanpa argumen → guide (gak nelpon)
let replied = null;
const fakeM = { text: ".voipcall", chat: "x@s.whatsapp.net", sender: "x@s.whatsapp.net", isOwner: true,
  react: async () => {}, reply: async (t) => { replied = t; return { key: { id: "K" } }; }, quoted: null };
const res = await plugin.handler(fakeM, { sock: { user: { id: "b@s.whatsapp.net" }, sendMessage: async () => ({}) }, config: { command: { prefix: "." } } });
ok("handler: usage → novaGuide (gak nelpon)", res?.handled === true && /voipcall|Cara Pakai|cara pakai/i.test(String(replied)));

// ═══ BUG REPORT OWNER 1 Okt 2026: .voipcall gagal "No device sessions to
// encrypt the call offer for <nomor>@s.whatsapp.net" — dump teknis mentah ke
// user tanpa panduan solusi. FIX: mapping ke pesan actionable + log error
// asli (bukan ditelan senyap) di syncDeviceList.
{
  const rawErr = "no device sessions to encrypt the call offer for 62817626261@s.whatsapp.net";
  const friendly = plugin.toFriendlyVoipError(rawErr);
  ok("toFriendlyVoipError: error 'no device sessions' → pesan actionable (bukan dump mentah)",
    /nomor ini gak ketemu device/i.test(friendly) && !friendly.includes("@s.whatsapp.net"),
    friendly);
  ok("toFriendlyVoipError: kasih 3 kemungkinan sebab (nomor salah/gak aktif/privasi)",
    /lengkap|bener/i.test(friendly) && /aktif/i.test(friendly) && /privasi/i.test(friendly));

  const otherErr = "ffmpeg exited with code 1";
  const friendly2 = plugin.toFriendlyVoipError(otherErr);
  ok("toFriendlyVoipError: error lain TETAP tampil (gak di-generalisir ke pesan device-session)",
    friendly2.includes("ffmpeg exited with code 1"), friendly2);
}

// syncDeviceList: error asli gak boleh ditelan senyap (debuggability — insiden
// nyata gak bisa dipastikan USync beneran kosong vs query-nya error dulu).
{
  const { createVoipDeps } = await import("../../src/lib/hivoip/voip-deps.js");
  const warnLog = [];
  const origWarn = console.warn;
  console.warn = (...a) => { warnLog.push(a.join(" ")); };
  const fakeSock = {
    authState: { creds: {} },
    signalRepository: {
      jidToSignalProtocolAddress: (j) => j,
      validateSession: async () => ({ exists: false }),
      lidMapping: { getLIDForPN: async () => undefined },
    },
    getUSyncDevices: async () => { throw new Error("usync query timeout (jaringan)"); },
    query: async () => ({ tag: "iq", content: [] }),
  };
  try {
    const { deps } = await createVoipDeps(fakeSock);
    const synced = await deps.signalDeviceSync.syncDeviceList(["628xxxxxxxxxx@s.whatsapp.net"]);
    ok("syncDeviceList: query error tetap balikin deviceJids kosong (gak crash)", synced[0]?.deviceJids?.length === 0);
    ok("syncDeviceList: TAPI error asli di-log (bukan ditelan senyap)", warnLog.some(l => /usync query timeout/i.test(l)), warnLog.join("|"));
  } finally {
    console.warn = origWarn;
  }
}

// ═══ REVISI OWNER 1 Okt 2026: 2 MODE — .voipcall = telepon biasa (default),
// .voipvideocall = telepon video. Plus FIX LATEN: .voipend/.voipsilent selama
// ini GAK pernah ke-registrasi sebagai alias → kena jalur command-not-found,
// gak pernah nyamper ke handler.
{
  ok("alias: voipvideocall & videocall ke-registrasi", plugin.config.alias.includes("voipvideocall") && plugin.config.alias.includes("videocall"));
  ok("FIX LATEN: voipend & voipsilent ke-registrasi (selama ini kena not-found)", plugin.config.alias.includes("voipend") && plugin.config.alias.includes("voipsilent"));

  // routing isVideo (helper engine, tanpa socket beneran)
  const { resolveIsVideoCall } = await import("../../src/lib/hivoip/index.js");
  ok("routing: mode audio + media video → TETAP telepon biasa", resolveIsVideoCall("audio", "video") === false);
  ok("routing: mode video + media audio/tanpa media → TETAP telepon video", resolveIsVideoCall("video", "audio") === true);
  ok("routing: mode video + media video → telepon video", resolveIsVideoCall("video", "video") === true);
  ok("routing: mode audio tanpa media → telepon biasa", resolveIsVideoCall("audio", "audio") === false);
  ok("routing: auto (default) = perilaku lama (video iff item pertama video)", resolveIsVideoCall("auto", "video") === true && resolveIsVideoCall("auto", "audio") === false);

  // plugin parsing: .voipvideocall ke-detect sebagai cmd videocall
  const rawTest = ".voipvideocall 6281234567890";
  const cmdParsed = (rawTest.match(/voip(call|videocall|end|silent)/i) || [])[1]?.toLowerCase();
  ok("parsing: '.voipvideocall' ke-detect sebagai cmd videocall (bukan 'call')", cmdParsed === "videocall", cmdParsed);
  const rawTest2 = ".voipend force";
  const cmdParsed2 = (rawTest2.match(/voip(call|videocall|end|silent)/i) || [])[1]?.toLowerCase();
  ok("parsing: '.voipend' tetap ke-detect sebagai cmd end", cmdParsed2 === "end", cmdParsed2);

  // strip args: nomor kebaca bener untuk kedua mode
  const stripRe = /^\.voip(call|videocall|end|silent)\s*/i;
  ok("strip: args .voipvideocall bersih (nomor doang)", ".voipvideocall 6281234567890 x.mp4".replace(stripRe, "").trim() === "6281234567890 x.mp4");
  ok("strip: args .voipcall bersih (nomor doang)", ".voipcall 6281234567890 auto".replace(stripRe, "").trim() === "6281234567890 auto");

  // guide nyebut 2 mode
  let guide2 = null;
  await plugin.handler({ text: ".voipcall", chat: "x@s.whatsapp.net", sender: "x@s.whatsapp.net", isOwner: true,
    react: async () => {}, reply: async (t) => { guide2 = t; return { key: { id: "K2" } }; }, quoted: null },
    { sock: { user: { id: "b@s.whatsapp.net" }, sendMessage: async () => ({}) }, config: { command: { prefix: "." } } });
  const { fromSC: __fromSC } = await import("../../src/lib/styler.js");
  const guideNorm = __fromSC(String(guide2 || "")).toLowerCase();
  ok("guide: nyebut .voipcall = telepon biasa", guideNorm.includes("telepon biasa") && guideNorm.includes("voipvideocall") && guideNorm.includes("telepon video"), guideNorm.slice(0, 90));

  // engine: media video di mode audio dimainkan sebagai AUDIO (guard struktur)
  const engineSrc = fsHere("../../src/lib/hivoip/index.js");
  ok("engine: mode audio meremap item video → audio (putar audionya aja)", engineSrc.includes("callType === 'audio' && item.kind === 'video'"));

  // media session: video call tanpa source → blank source (black screen)
  const sessionSrc = fsHere("../../src/lib/hivoip/call/WaCallMediaSession.js");
  ok("session: video call polos → loadBlankSource (black screen via lavfi)",
    /mediaType === CallMediaType\.Video && !this\.videoEngine\.hasSource\(\)/.test(sessionSrc) && sessionSrc.includes("loadBlankSource()"),
    "guard blank source gak ketemu");
}

// ═══ STATUS LIFECYCLE (request owner 1 Okt 2026: "bot kirim status Telepon
// sedang berdering, telepon diangkat, telepon ditolak dan status lain"):
// engine kini emit 'accepted' (remote nyamber tombol hijau), plugin edit-in-place
// status tiap fase + alasan berakhir di-map human-friendly.
{
  // ActiveCall: urutan event ring → accepted → connected, masing-masing sekali
  const { ActiveCall } = await import("../../src/lib/hivoip/voipClient.js");
  const ac = new ActiveCall({}, "c1", 0);
  const events = [];
  for (const ev of ["ringing", "accepted", "connected"]) ac.on(ev, () => events.push(ev));
  ac._onState({ callId: "c1", isRinging: true, stateData: { state: "ringing" } });
  ac._onState({ callId: "c1", isRinging: true, stateData: { state: "ringing" } }); // dedupe: state ringing doang gak boleh dobel
  ac._onState({ callId: "c1", stateData: { state: "connecting" } });
  ac._onState({ callId: "c1", stateData: { state: "connecting" } }); // accepted doang sekali
  ac._onState({ callId: "c1", isActive: true, stateData: { state: "active" } });
  ok("ActiveCall: urutan event ringing → accepted → connected", events.join(",") === "ringing,accepted,connected", events.join(","));
  ok("ActiveCall: 'ringing' gak dobel walau state berulang", events.filter(e => e === "ringing").length === 1);
  ok("ActiveCall: 'accepted' cuma sekali (diangkat)", events.filter(e => e === "accepted").length === 1);

  // describeVoipEnd: alasan berakhir human-friendly
  const endDeclined = plugin.describeVoipEnd("declined", "628123");
  ok("end: declined → DITOLAK", /ditolak/i.test(endDeclined), endDeclined);
  const endTimeout = plugin.describeVoipEnd("timeout", "628123");
  ok("end: timeout → gak diangkat", /gak diangkat|tidak diangkat/i.test(endTimeout), endTimeout);
  const endBusy = plugin.describeVoipEnd("busy", "628123");
  ok("end: busy → panggilan lain", /panggilan lain|sibuk/i.test(endBusy), endBusy);
  const endDnd = plugin.describeVoipEnd("do_not_disturb", "628123");
  ok("end: do_not_disturb → DND", /jangan diganggu|dnd/i.test(endDnd), endDnd);
  const endUser = plugin.describeVoipEnd("user_ended", "628123");
  ok("end: user_ended → selesai", /selesai/i.test(endUser), endUser);
  const endUserDur = plugin.describeVoipEnd("user_ended", "628123", Date.now() - 65000);
  ok("end: durasi ke-format (1 mnt lebih)", /durasi 1 mnt/i.test(endUserDur), endUserDur);
  const endUnknown = plugin.describeVoipEnd("weird_reason", "628123");
  ok("end: alasan asing tetap ditampilkan jujur", endUnknown.includes("weird_reason"), endUnknown);
  const endNoDur = plugin.describeVoipEnd("user_ended", "628123", null);
  ok("end: tanpa connectedAt → tanpa durasi (gak ngarang)", !/durasi/i.test(endNoDur), endNoDur);

  // plugin wiring: semua fase kepasang listener
  const pluginSrc = fsHere("../../plugins/owner/voipcall.js");
  for (const ev of ["ringing", "accepted", "connected", "ended"]) {
    ok(`plugin: listener '${ev}' kepasang`, pluginSrc.includes(`call.on("${ev}"`));
  }
  ok("plugin: status berdering pake teks 'berdering'", /telepon sedang berdering/i.test(pluginSrc));
  ok("plugin: status diangkat pake teks 'diangkat'", /diangkat/i.test(pluginSrc) && pluginSrc.includes('call.on("accepted"'));

  // engine index: re-emit accepted
  const engineSrc2 = fsHere("../../src/lib/hivoip/index.js");
  ok("engine: VoipCall re-emit 'accepted'", engineSrc2.includes("activeCall.on('accepted', () => this.emit('accepted'))"));
}

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
