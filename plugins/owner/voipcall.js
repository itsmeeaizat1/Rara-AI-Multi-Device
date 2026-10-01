// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .voipcall / .voipvideocall — telepon WA dengan pemutar media (port engine lama)
// Engine: src/lib/hivoip/ — OWNER-ONLY (anti penyalahgunaan, owner 28 Sep 2026)
// REVISI 1 Okt 2026 (owner: "2 mode .voipcall telepon biasa untuk default klo
// .voipvideocall untuk telepon video"): .voipcall = TELEPON BIASA (voice call,
// media video dimainkan audionya aja), .voipvideocall = TELEPON VIDEO (video
// call; tanpa media video → black screen beneran via ffmpeg lavfi).
import os from 'os';
import path from 'path';
import fs from 'fs';
import Voip from "../../src/lib/hivoip/index.js";
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "voipcall",
  // FIX LATEN 1 Okt: voipend/voipsilent gak pernah ke-registrasi — selama ini
  // .voipend/.voipsilent kena jalur command-not-found (suggestion), gak nyamper
  // ke handler sama sekali. Ditambah voipvideocall/videocall buat mode video.
  // ALIAS .aicall (1 Okt 2026, revisi owner: "ibaratkan voip ini fitur aicall
  // bawaan"): .aicall = pintu utama fitur telepon bawaan bot (tanpa konfigurasi
  // tambahan) — fitur AI voice call yang butuh service Go pindah ke .aicall2.
  alias: ["voip", "aicall", "voipvideocall", "videocall", "voipend", "voipsilent"],
  category: "owner",
  description: "Telepon nomor WA lewat bot + putar audio/video (alias .aicall): .voipcall telepon biasa, .voipvideocall telepon video",
  usage: ".voipcall <nomor> [url_media] [240p-1080p] [auto] [loop] (telepon biasa) | .voipvideocall <nomor> [url_video] (telepon video) | .voipend [force] | .voipsilent",
  example: ".voipcall 6281234567890 https://contoh.com/lagu.mp3 auto | .voipvideocall 6281234567890 https://contoh.com/video.mp4",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
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

// "no device sessions to encrypt the call offer" = WA USync balikin NOL device
// aktif buat nomor itu. Penyebab paling umum (bukan bug kode): nomor salah ketik /
// gak lengkap, nomor gak terdaftar WA, atau privasi "siapa yang bisa menelepon saya"
// di nomor target di-set ketat (blokir panggilan dari orang gak dikenal). Dump pesan
// teknis mentah gak kasih tau SOLUSI — mapping ke pesan actionable. Diekspor biar
// gampang di-unit-test tanpa perlu mock seluruh engine Voip.
export function toFriendlyVoipError(message) {
  const msg = String(message || "");
  if (/no device sessions/i.test(msg)) {
    return "Nomor ini gak ketemu device WhatsApp aktif. Cek lagi: (1) nomornya lengkap & bener (gak ada digit ilang), (2) nomor itu beneran aktif pakai WhatsApp, (3) kalau nomor dipastikan benar & aktif, coba lagi — bisa juga privasi ‘siapa yang bisa menelepon saya’ di nomor itu lagi di-set ketat.";
  }
  return `Gagal nelpon: ${msg.slice(0, 120)}`;
}

// STATUS LIFECYCLE (request owner 1 Okt 2026): bot kirim status tiap fase —
// mengelepon → berdering → diangkat → terhubung → berakhir (dengan alasan
// human-friendly: ditolak, gak diangkat, busy, DND, dll). Diekspor buat e2e.
export function describeVoipEnd(reason, phoneNumber, connectedAtMs) {
  const num = String(phoneNumber || "nomor");
  let dur = "";
  if (connectedAtMs) {
    const s = Math.max(1, Math.round((Date.now() - connectedAtMs) / 1000));
    dur = ` Durasi ${s >= 60 ? `${Math.floor(s / 60)} mnt ${s % 60} dtk` : `${s} detik`}.`;
  }
  switch (String(reason || "")) {
    case "declined": return `Telepon ke ${num} DITOLAK.`;
    case "timeout": return `${num} gak diangkat (timeout).`;
    case "busy": return `${num} lagi ada panggilan lain (sibuk).`;
    case "cancelled": return `Panggilan ke ${num} dibatalkan.`;
    case "failed": return `Panggilan ke ${num} gagal terhubung.`;
    case "do_not_disturb": return `${num} lagi mode jangan diganggu (DND).`;
    case "user_ended": return `Panggilan ke ${num} selesai.${dur}`;
    default: return `Panggilan ke ${num} berakhir: ${reason || "unknown"}.${dur}`;
  }
}

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
    const parts = raw.replace(new RegExp(`^${prefix}voip(call|videocall|end|silent)\\s*`, "i"), "").trim();
    const bodyArgs = parts ? parts.split(/\s+/) : [];
    const cmd = (raw.match(/voip(call|videocall|end|silent)/i) || [])[1]?.toLowerCase() || "call";
    // MODE (revisi owner 1 Okt): .voipcall = telepon biasa, .voipvideocall = telepon video
    const callType = cmd === "videocall" ? "video" : "audio";
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
        `Telepon nomor WA lewat bot + putar media. 2 mode: ${prefix}voipcall = TELEPON BIASA (media video dimainkan audionya saja), ${prefix}voipvideocall = TELEPON VIDEO (tanpa URL video = black screen).`,
        `${prefix}voipcall 6281234567890 auto`,
        `Opsi: resolusi 240p-1080p (mode video) · auto (auto hangup habis media) · loop (replay) · playlist URL di-support, reply audio/video juga bisa. Akhiri: ${prefix}voipend · mute: ${prefix}voipsilent. Butuh ffmpeg+ffprobe di server.`
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

    // Mode video = selalu telepon video; mode biasa = selalu telepon biasa
    // (video media nanti dimainkan audionya aja oleh engine).
    const willBeVideo = callType === "video";

    const sent = await m.reply(claraWrap("VOIP", `Ngelpon ${phoneNumber}...${willBeVideo ? " (telepon video)" : " (telepon biasa)"} — akhiri ${prefix}voipend`));
    const key = sent?.key;

    const cleanupTempFiles = () => {
      for (const f of tempFiles) {
        fs.existsSync(f) && fs.unlink(f, () => {});
      }
    };

    const call = await voip.call(phoneNumber, media, resolution, { autoEndCall, loop, callType });
    activeCalls.set(m.chat, { call, key, phoneNumber });

    // STATUS LIFECYCLE: semua fase diedit ke SATU pesan status (biar rapi,
    // gak banjir) - tiap fase kejadian sekali aja.
    let connectedAtMs = null;
    let phase = 0; // 1=berdering 2=diangkat 3=terhubung 4=berakhir
    const editStatus = (text) => {
      key && sock.sendMessage(m.chat, { text: claraWrap("VOIP", text), edit: key }).catch(() => {});
    };

    call.on("ringing", () => {
      if (phase >= 1) return;
      phase = 1;
      editStatus(`Telepon sedang berdering... ${phoneNumber}${willBeVideo ? " (telepon video)" : ""}`);
    });
    call.on("accepted", () => {
      if (phase >= 2) return;
      phase = 2;
      editStatus("Telepon diangkat! Nyambungin media...");
    });
    call.on("connected", () => {
      if (phase >= 3) return;
      phase = 3;
      connectedAtMs = Date.now();
      editStatus(`Terhubung! Media diputar — akhiri ${prefix}voipend`);
    });
    call.on("item", ({ index, kind }) => {
      if (index === 0) return;
      sock.sendMessage(m.chat, { text: claraWrap("VOIP", `Putar item ${index + 1} (${kind})`) }).catch(() => {});
    });
    call.on("ended", (reason) => {
      activeCalls.delete(m.chat);
      if (phase < 4) {
        phase = 4;
        editStatus(describeVoipEnd(reason, phoneNumber, connectedAtMs));
      }
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
    await m.reply(novaError("VOIP", toFriendlyVoipError(error?.message || error)));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
