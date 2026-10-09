// E2E — MENU HEADER hasMediaAttachment FALSE (9 Okt 2026, owner: "difalse jgn
// ditrue lalu push dan deploy" — eksperimen anti "simpan ke galeri").
// Verifikasi: media TETAP di-upload & nempel di header, tapi flag-nya false;
// fallback externalAdReply gak nempel saat upload sukses (kondisi kini pakai
// _mUploaded, bukan _mHeader.hasMediaAttachment — anti dobel banner).
import path from "node:path";
import fs from "node:fs";

const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; w("  ✅ " + name); }
  else { fail++; w("  ❌ " + name + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { sendMenuCard } = await import(R + "/src/lib/rara-menu-card.js");

const menuAsset = path.join(R, "assets", "image", "menu", "allmenuthumbnail.jpg");
const hasAsset = fs.existsSync(menuAsset);

const MENU_TEXT = "╭─────『 *Rara Menu* 』\n├ ᯓ .ping\n╰────────────√";

function mockSock({ uploadThrows = false } = {}) {
  const sent = [];
  return {
    sent,
    sock: {
      user: { id: "628174887770:5@s.whatsapp.net" },
      waUploadToServer: uploadThrows
        ? async () => { throw new Error("upload boom"); }
        : async () => ({ url: "https://mmg.whatsapp.net/fake.jpg" }),
      relayMessage: async (jid, stanza) => { sent.push({ jid, stanza }); return {}; },
      sendMessage: async (jid, content) => { sent.push({ jid, content }); return {}; },
    },
  };
}
function mockM() {
  return {
    chat: "628174887770@s.whatsapp.net",
    sender: "628174887770@s.whatsapp.net",
    key: { remoteJid: "628174887770@s.whatsapp.net", fromMe: false, id: "ORIGMSG" },
    message: { conversation: ".menu" },
    reply: async (txt) => { return { key: { id: "fallback" } }; },
  };
}

// ═══ 1. KARTU MENU NORMAL — MEDIA MASIH NEMPEL, FLAG FALSE ═══
{
  const { sock, sent } = mockSock();
  await sendMenuCard(sock, mockM(), {
    text: MENU_TEXT,
    footer: "✦ RARA AI - MULTI DEVICE",
    thumbnailPath: menuAsset,
    title: "Menu",
    buttons: [],
  });

  t("1a. jalur kartu media kepakai (relayMessage)", sent.length === 1 && !!sent[0]?.stanza, "sent=" + JSON.stringify(sent.map(s => Object.keys(s))));
  const im = sent[0]?.stanza?.viewOnceMessage?.message?.interactiveMessage;

  t("1b. header hasMediaAttachment === FALSE (request owner 9 Okt)",
    im?.header?.hasMediaAttachment === false,
    "actual=" + im?.header?.hasMediaAttachment);

  t("1c. media TETAP nempel di header (imageMessage/videoMessage ada)",
    !!(im?.header?.imageMessage || im?.header?.videoMessage),
    "keys=" + JSON.stringify(Object.keys(im?.header || {})));

  t("1d. externalAdReply TIDAK nempel saat upload sukses (anti dobel banner)",
    !im?.contextInfo?.externalAdReply,
    JSON.stringify(Object.keys(im?.contextInfo || {})));

  t("1e. tanpa metadata forwarding (owner 7 Sep)",
    !im?.contextInfo?.isForwarded && !im?.contextInfo?.forwardingScore,
    "isForwarded=" + im?.contextInfo?.isForwarded);

  let chip = null;
  try { chip = JSON.parse(im?.nativeFlowMessage?.messageParamsJson || "{}"); } catch {}
  t("1f. chip limited_time_offer tetap terisi", !!chip?.limited_time_offer?.text, im?.nativeFlowMessage?.messageParamsJson || "");

  t("1g. body tetap kekirim (teks menu)", typeof im?.body?.text === "string" && im?.body?.text?.length > 10);
}

// ═══ 2. FALLBACK — UPLOAD GAGAL → BANNER LINK-PREVIEW ═══
{
  const { sock, sent } = mockSock({ uploadThrows: true });
  await sendMenuCard(sock, mockM(), {
    text: MENU_TEXT,
    footer: "✦ RARA AI - MULTI DEVICE",
    thumbnailPath: menuAsset,
    title: "Menu",
  });

  const stanza = sent.find(s => s.stanza);
  const im = stanza?.stanza?.viewOnceMessage?.message?.interactiveMessage;
  t("2a. upload gagal → kartu tetap kekirim (fallback banner, bukan mati)",
    !!im, "sent=" + sent.length);
  if (im) {
    t("2b. header gak bawa media saat upload gagal",
      !(im?.header?.imageMessage || im?.header?.videoMessage),
      "keys=" + JSON.stringify(Object.keys(im?.header || {})));
    t("2c. externalAdReply nempel sebagai fallback (_mUploaded-based)",
      !!im?.contextInfo?.externalAdReply,
      JSON.stringify(Object.keys(im?.contextInfo || {})));
  }
}

// ═══ 3. GUARD REGRESI — CODE LEVEL ═══
{
  const src = fs.readFileSync(R + "/src/lib/rara-menu-card.js", "utf8");
  const codeLines = src.split("\n").filter(l => !/^\s*[/*]/.test(l));
  t("3a. gak ada sisa 'hasMediaAttachment: true' di baris kode (komentar dikecualikan)",
    !codeLines.some(l => /hasMediaAttachment:\s*true/.test(l)));
  t("3b. fallback memakai _mUploaded (bukan flag header)", /!\_mUploaded && \_mImageBuf/.test(src));
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
