// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .voipcall — telepon/video call WA dengan pemutar media (port VOIP HIROBOT)
// Engine: src/lib/hirovoip/ — OWNER-ONLY (anti penyalahgunaan, owner 28 Sep 2026)
import os from 'os';
import path from 'path';
import fs from 'fs';
import Voip from "../../src/lib/hirovoip/index.js";
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "voipcall",
  alias: ["voip"],
  category: "owner",
  description: "Telepon/video call nomor WA lewat bot + putar audio/video (port VOIP HIROBOT)",
  usage: ".voipcall <nomor> [url_media] [240p-1080p] [auto] [loop] | .voipend [force] | .voipsilent",
  example: ".voipcall 6281234567890 https://contoh.com/lagu.mp3 auto",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const voipInstances = new WeakMap();
function getVoip(conn) {
  let voip = voipInstances.get(conn);
  if (!voip) {
    voip = new Voip(conn);
    voipInstances.set(conn, voip);
  }
  return voip;
}

const activeCalls = new Map();

async function downloadQuotedMedia(quoted) {
  const mime = quoted?.mimetype || "";
  const kind = /^video/.test(mime) ? "video" : /^audio/.test(mime) ? "audio" : null;
  if (!kind || typeof quoted?.download !== "function") return null;
  const buffer = await quoted.download();
  if (!buffer) throw new Error(`Gagal download ${kind} yang di-reply`);
  const ext = kind === "video" ? ".mp4" : ".mp3";
  const filePath = path.join(os.tmpdir(), `voip_${kind}_${Date.now()}${ext}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    const parts = raw.replace(new RegExp(`^${prefix}voip(call|end|silent)\\s*`, "i"), "").trim();
    const bodyArgs = parts ? parts.split(/\s+/) : [];
    const cmd = (raw.match(/voip(call|end|silent)/i) || [])[1]?.toLowerCase() || "call";
    const voip = getVoip(sock);

    if (cmd === "end") {
      await m.react("🧠");
      await voip.end(bodyArgs[0] === "force");
      activeCalls.delete(m.chat);
      await m.react("⚡");
      await m.reply(claraWrap("VOIP", bodyArgs[0] === "force" ? "State VOIP di-force-reset." : "Hangup diminta..."));
      return { handled: true };
    }

    if (cmd === "silent") {
      await m.react("🧠");
      const entry = activeCalls.get(m.chat);
      if (!entry) {
        await m.react("🐣");
        await m.reply(novaError("VOIP", "Gak ada call berjalan di chat ini"));
        return { handled: true };
      }
      const nowSilenced = await entry.call.silent();
      await m.react("⚡");
      await m.reply(claraWrap("VOIP", nowSilenced ? "Mic dimute, video dipause." : "Lanjut lagi."));
      return { handled: true };
    }

    // voipcall
    await m.react("🧠");
    if (!bodyArgs[0]) {
      await m.react("🐣");
      await m.reply(novaGuide(
        "voipcall",
        "Telepon nomor WA lewat bot, bisa putar audio/video (playlist URL di-support, reply audio/video juga bisa).",
        `${prefix}voipcall 6281234567890 auto`,
        `Opsi: resolusi 240p-1080p · auto (auto hangup habis media) · loop (replay). Akhiri: ${prefix}voipend · mute: ${prefix}voipsilent. Butuh ffmpeg+ffprobe di server.`
      ));
      return { handled: true };
    }

    if (activeCalls.has(m.chat)) {
      await m.react("🐣");
      await m.reply(novaError("VOIP", `Masih ada call berjalan di chat ini — akhiri dulu pakai ${prefix}voipend`));
      return { handled: true };
    }

    const phoneNumber = bodyArgs[0].replace(/\D/g, "");
    if (!phoneNumber) {
      await m.react("❌");
      await m.reply(novaError("VOIP", "Nomor gak valid"));
      return { handled: true };
    }

    const RESOLUTION_RE = /^(240p|360p|480p|720p|1080p)$/i;
    const resolutionArg = bodyArgs.find((a, i) => i > 0 && RESOLUTION_RE.test(a));
    const resolution = resolutionArg ? resolutionArg.toLowerCase() : undefined;
    const autoEndCall = bodyArgs.some((a, i) => i > 0 && /^auto$/i.test(a));
    const loop = bodyArgs.some((a, i) => i > 0 && /^loop$/i.test(a));

    let media = bodyArgs.filter((a, i) => i > 0 && /^https?:\/\//i.test(a));
    const tempFiles = [];
    try {
      const quotedPath = m.quoted ? await downloadQuotedMedia(m.quoted) : null;
      if (quotedPath) {
        tempFiles.push(quotedPath);
        media.unshift(quotedPath);
      }
    } catch (e) {
      console.error("[voipcall]: quoted media:", e.message);
    }

    if (media.length === 0) media = "silence";
    else if (media.length === 1) media = media[0];

    const willBeVideo = (Array.isArray(media) ? media : [media]).some((src) =>
      src !== "silence" && /\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?|#|$)/i.test(src)
    );

    const sent = await m.reply(claraWrap("VOIP", `Ngelpon ${phoneNumber}...${willBeVideo ? " (video)" : ""} — akhiri ${prefix}voipend`));
    const key = sent?.key;

    const cleanupTempFiles = () => {
      for (const f of tempFiles) {
        fs.existsSync(f) && fs.unlink(f, () => {});
      }
    };

    const call = await voip.call(phoneNumber, media, resolution, { autoEndCall, loop });
    activeCalls.set(m.chat, { call, key, phoneNumber });

    call.on("ringing", () => {
      key && sock.sendMessage(m.chat, { text: claraWrap("VOIP", `Nada sambung... ${phoneNumber}`), edit: key }).catch(() => {});
    });
    call.on("connected", () => {
      key && sock.sendMessage(m.chat, { text: claraWrap("VOIP", "Terhubung! Ketik .voipend buat akhiri."), edit: key }).catch(() => {});
    });
    call.on("item", ({ index, kind }) => {
      if (index === 0) return;
      sock.sendMessage(m.chat, { text: claraWrap("VOIP", `Putar item ${index + 1} (${kind})`) }).catch(() => {});
    });
    call.on("ended", (reason) => {
      activeCalls.delete(m.chat);
      const friendlyText = reason === "declined"
        ? `Panggilan ke ${phoneNumber} ditolak.`
        : `Panggilan ke ${phoneNumber} berakhir: ${reason}`;
      key && sock.sendMessage(m.chat, { text: claraWrap("VOIP", friendlyText), edit: key }).catch(() => {});
      cleanupTempFiles();
    });
    call.on("error", (err) => {
      activeCalls.delete(m.chat);
      sock.sendMessage(m.chat, { text: novaError("VOIP", `Error call: ${String(err?.message || err).slice(0, 100)}`) }).catch(() => {});
      cleanupTempFiles();
    });
    await m.react("⚡");
  } catch (error) {
    console.error("[voipcall]:", error.message);
    await m.react("❌");
    await m.reply(novaError("VOIP", `Gagal nelpon: ${String(error.message || error).slice(0, 120)}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
