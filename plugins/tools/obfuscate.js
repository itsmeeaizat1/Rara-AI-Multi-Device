// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .obfuscate — obfuscator JavaScript LOKAL via package javascript-obfuscator
// (16 Sep 2026, request owner: audit dependencies — backup lokal .zobfuscate
// zelapi, jalan tanpa API). Output pendek inline, panjang jadi file .js.

import JavaScriptObfuscator from "javascript-obfuscator";
import {
  raraError, raraCaption, raraWrap, tipText,
} from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "obfuscate",
  alias: ["obfuscate", "obfuskasi", "obf"],
  category: "tools",
  description: "Bikin kode JavaScript susah dibaca (lokal, tanpa API)",
  usage: ".obfuscate <kode> (atau reply pesan kode)",
  example: ".obfuscate const x = 1;",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

let _obf = JavaScriptObfuscator;
export function _setObfForTest(impl) { _obf = impl; }

const OPTS = {
  compact: true,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: "hexadecimal",
  selfDefending: false, // jaga output tetap jalan di Node lama
  deadCodeInjection: false, // ringan
  renameGlobals: false, // jaga kompatibilitas
};

async function handler(m, { sock, config: botConfig, prefix: cmdPrefix }) {
  const prefix = cmdPrefix || botConfig?.command?.prefix || ".";
  try {
    await m.react("🧠");
    let kode = (m.text || "").trim();
    if ((!kode || kode.length < 5) && m.quoted?.text) kode = String(m.quoted.text).trim();
    if (!kode) kode = "";

    if (!kode) {
      const text =
        raraCaption({
          emoji: "🛡️",
          name: "obfuscate",
          description: "Bikin kode JavaScript susah dibaca orang — proteksi script kamu",
          usage: `${prefix}obfuscate <kode> — atau reply pesan berisi kode`,
          example: `${prefix}obfuscate const rahasia = "password123";`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.reply(text, "obfuscate");
      return { handled: true };
    }

    if (kode.length < 15) {
      await m.reply(raraError("Obfuscate", "Kode kependekan — minimal 15 karakter biar hasilnya masuk akal"), "obfuscate");
      return { handled: true };
    }
    if (kode.length > 5000) {
      await m.reply(raraError("Obfuscate", "Kode kepanjangan — maksimal 5000 karakter"), "obfuscate");
      return { handled: true };
    }

    await m.react("🛠️");
    const result = _obf.obfuscate(kode, OPTS);
    const out = String(result?.getObfuscatedCode ? result.getObfuscatedCode() : result);

    if (out.length <= 3500) {
      const text =
        raraWrap("Obfuscate", [
          "✅ Kode berhasil di-obfuscate (lokal, tanpa API)",
          "",
          "```" + out + "```",
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}obfuscate <kode> untuk mengulang`);
      await m.react("🐣");
      await m.reply(text, "obfuscate");
    } else {
      const namaFile = `obfuscated-${Date.now()}.js`;
      let card = "";
      try {
        const info = await probeBuffer(Buffer.from(out, "utf8"));
        card = mediaResultCard({
          header: "obfuscate",
          type: "dokumen",
          size: info.size, mime: info.mime,
        });
      } catch { /* best-effort */ }
      await sock.sendMessage(
        m.chat,
        { document: Buffer.from(out, "utf8"), fileName: namaFile, mimetype: "text/javascript", caption: card },
        { quoted: m },
      );
      const text =
        raraWrap("Obfuscate", [
          "✅ Kode berhasil di-obfuscate",
          `Hasil kepanjangan (${out.length} karakter) — dikirim sebagai file *${namaFile}*`,
        ].join("\n")) +
        "\n" +
        tipText("Buka file .js-nya untuk lihat hasil");
      await m.react("🐣");
      await m.reply(text, "obfuscate");
    }
  } catch (error) {
    await m.react("❌");
    await m.reply(raraError("Obfuscate", `Gagal obfuscate — cek sintaks kode: ${String(error?.message || error).slice(0, 120)}`), "obfuscate");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
