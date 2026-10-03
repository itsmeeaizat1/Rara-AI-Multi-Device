// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .mega — downloader file MEGA.nz via package megajs (16 Sep 2026, request
// owner: audit dependencies → megajs terverifikasi hidup, fitur MEGA belum ada).
// TANPA API eksternal — direct protokol MEGA. STRICT satuan: error asli keluar.

import { File as MegaFile } from "megajs";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";
import {
  raraError, raraCaption, raraWrap, tipText,
} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "mega",
  alias: ["mega", "meganz", "megadl", "megadownload"],
  category: "download",
  description: "Unduh file dari link MEGA.nz",
  usage: ".mega <link>",
  example: ".mega https://mega.nz/file/xxxx#yyyy",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB — jaga memori VPS
const MEGA_RE = /https?:\/\/(?:mega\.nz|mega\.co\.nz)\/[^\s]+/i;

// seam utk e2e — inject implementasi MEGA palsu, gak ngenet
let _mega = { File: MegaFile };
export function _setMegaForTest(impl) { _mega = impl; }

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

async function handler(m, { sock, config: botConfig, prefix: cmdPrefix }) {
  const prefix = cmdPrefix || botConfig?.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").trim();

    if (!raw) {
      const text =
        raraCaption({
          emoji: "⬇️",
          name: "mega",
          description: "Unduh file dari link MEGA.nz langsung ke chat",
          usage: `${prefix}mega <link>`,
          example: `${prefix}mega https://mega.nz/file/xxxx#yyyy`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.reply(text, "mega");
      return { handled: true };
    }

    const linkMatch = raw.match(MEGA_RE);
    if (!linkMatch) {
      await m.reply(
        raraError("Mega", "Link MEGA tidak ditemukan — kirim link lengkap https://mega.nz/file/... atau https://mega.nz/folder/..."),
        "mega",
      );
      await m.react("❌");
      return { handled: true };
    }
    const link = linkMatch[0];

    if (/\/(folder|F)\//.test(link)) {
      const text =
        raraWrap("Mega", [
          "Link folder MEGA belum didukung di versi ini 😊",
          "Solusi : *share link file langsung* dari folder",
          "",
          `Format : ${prefix}mega https://mega.nz/file/xxxx#yyyy`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}mega <link file> untuk unduh`);
      await m.reply(text, "mega");
      return { handled: true };
    }

    const file = _mega.File.fromURL(link);
    await file.loadAttributes();

    const size = Number(file.size || 0);
    if (size > MAX_SIZE) {
      const text =
        raraWrap("Mega", [
          `File : *${file.name}*`,
          `Ukuran : *${fmtSize(size)}* — melebihi batas *100 MB* 😅`,
          "Solusi : kompres dulu atau pecah file, lalu unggah ulang",
        ].join("\n"));
      await m.reply(text, "mega");
      await m.react("❌");
      return { handled: true };
    }

    await m.react("🛠️");
    const buffer = await file.downloadBuffer();
    if (!buffer || !buffer.length) {
      throw new Error("buffer kosong dari MEGA");
    }

    const safeName = String(file.name || "mega-file").replace(/[/\\:*?"<>|]/g, "_");
    await sock.sendMessage(
      m.chat,
      { document: buffer, fileName: safeName, mimetype: "application/octet-stream" },
      { quoted: m },
    );
    await m.reply(mediaInfoCaption({ header: "MEGA", fields: [
      { label: "Nama", value: String(safeName).slice(0, 60) },
      { label: "Hasil", value: "Dokumen" },
      { label: "Ukuran", value: fmtSize(buffer.length) },
    ] }));

    await m.react("🐣");
  } catch (error) {
    await m.react("❌");
    const msg = String(error?.message || error || "");
    let teks;
    if (/not found|no such|attributes/i.test(msg)) {
      teks = raraError("Mega", "File MEGA tidak ditemukan — cek link lengkap beserta key-nya (xxxx#yyyy)");
    } else if (/decrypt|key/i.test(msg)) {
      teks = raraError("Mega", "Gagal dekripsi — key link MEGA tidak valid atau terpotong");
    } else {
      teks = raraError("Mega", `Gagal mengunduh: ${msg.slice(0, 120) || "kesalahan jaringan"}`);
    }
    await m.reply(teks, "mega");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
