// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/tools/web.js — .web — LIVE HTML DI DALAM WHATSAPP
//
// Request owner 2026-09-07 (inspirasi video bot scene: "html + live, nyambung
// ke websocket, bisa buka YouTube dll di dalam WA"):
// Kirim interactive card dengan tombol nativeFlow cta_url — pas di-tap,
// WhatsApp buka URL di WEBVIEW DI DALAM APLIKASI (gak keluar WA).
// Halaman live-nya di-host oleh bot sendiri (src/lib/nova-web-server.js,
// web/live.html — live via SSE push tiap 2 detik).
//
// Command:
//   .web <url> [judul...]  → card webview untuk URL apa pun (http/https)
//   .web live              → Nova Live Dashboard (stat server realtime)
//   .web                   → guide
//
// CATATAN JUJUR (biar gak halusinasi): ini payload UNOFFICIAL ala scene —
// render webview tergantung versi WhatsApp penerima (Android baru oke,
// iPhone/WA lama kadang cuma buka browser). Meta bisa patch kapan pun.
// Fallback aman udah disediain (link plain text) kalau card gagal.

import fs from "node:fs/promises";
import path from "node:path";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "nova";
import { config } from "../../config.js";
import { smallcapsText, toSC } from "../../src/lib/styler.js";
import { novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getNovaWebUrl, isNovaWebRunning } from "../../src/lib/nova-web-server.js";

const pluginConfig = {
  name: "web",
  alias: ["web", "webview", "livehtml"],
  category: "tools",
  description: "Buka halaman web/HTML live di dalam WhatsApp (webview card)",
  usage: ".web <url> [judul]\n.web live",
  example: ".web live\n.web https://example.com Judul Bebas",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 8,
};

// Bangun interactive card: banner (kalau ada) + body + tombol cta_url.
// Pola sama dengan nova-menu-card (viewOnceMessage → interactiveMessage).
async function sendWebCard(sock, m, { url, title = "", text = "" }) {
  const botName = config.bot?.name || "Nova AI";
  const botVersion = config.bot?.version || "23.0.0";

  // Banner: pakai thumbnail menu bot — kalau gak ada, card tetap jalan tanpa header.
  let header = { title: "", hasMediaAttachment: false };
  try {
    const bannerPath = path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
    const raw = await fs.readFile(bannerPath);
    const prep = await prepareWAMessageMedia({ image: raw }, { upload: sock.waUploadToServer });
    if (prep?.imageMessage) header = { hasMediaAttachment: true, imageMessage: prep.imageMessage };
  } catch {}

  // GUARD SMALLCAPS: body/footer/tombol smallcaps — URL tetap persis.
  const bodyText = smallcapsText(
    `${text || "Klik tombol di bawah untuk buka halaman ini di dalam WhatsApp"}\n\n${url}`
  );
  const footerText = toSC(`${botName} • v${botVersion}`);

  const interactiveObj = {
    header: proto.Message.InteractiveMessage.Header.fromObject(header),
    body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footerText }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
      buttons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: toSC(title || "Buka Halaman"),
            url,
            merchant_url: url,
          }),
        },
      ],
    }),
    contextInfo: {
      mentionedJid: m.sender ? [m.sender] : [],
    },
  };

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveObj),
        },
      },
    },
    { userJid: m.sender }
  );

  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  return true;
}

export async function handler(sock, m, { args, text, react, reply }) {
  const cmd = (args[0] || "").toLowerCase();

  // Guide
  if (!cmd) {
    return reply(
      novaGuide(
        "web",
        "Buka halaman web/HTML live langsung di dalam WhatsApp — halaman live stat server realtime via websocket.",
        ".web live\n.web <url> [judul]",
        "Halaman live di-host bot sendiri. Webview muncul di WhatsApp versi baru (Android); versi lama/iPhone bisa buka browser biasa."
      )
    );
  }

  // Preset: Nova Live Dashboard
  if (cmd === "live" || cmd === "dashboard") {
    await react("🕒");
    const url = getNovaWebUrl();
    try {
      await sendWebCard(sock, m, {
        url,
        title: "Nova Live Dashboard",
        text: "Nova Live Dashboard - stat server realtime\nJam live - Uptime - RAM - CPU - Demo YouTube",
      });
      await react("🐣");
    } catch (e) {
      await react("❌");
      return reply(
        `Card webview gagal dikirim — fallback link biasa:\n${url}\n\nInfo: ${e?.message || "unknown error"}`
      );
    }
    return;
  }

  // URL custom
  const maybeUrl = args.find((a) => /^https?:\/\//i.test(a));
  if (!maybeUrl) {
    await react("❗");
    return reply(novaNoInput("Masukkan URL diawali http:// atau https://, atau ketik .web live"));
  }

  await react("🕒");
  // Judul = semua args SETELAH url
  const urlIdx = args.indexOf(maybeUrl);
  const title = args.slice(urlIdx + 1).join(" ").slice(0, 40);

  try {
    await sendWebCard(sock, m, { url: maybeUrl, title });
    await react("🐣");
  } catch (e) {
    await react("❌");
    return reply(`Card webview gagal — fallback link: ${maybeUrl}\n\nInfo: ${e?.message || "unknown error"}`);
  }
}

export default pluginConfig;
