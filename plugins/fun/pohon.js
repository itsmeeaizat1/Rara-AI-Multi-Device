// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pohon",
  alias: ["pohon", "silsilah"],
  category: "fun",
  description: "Generator silsilah keluarga lucu dan absurd",
  usage: ".pohon <nama>",
  example: ".pohon Budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 12,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  let name = args;
  if (!name && m.quoted) {
    name = m.quoted.pushName || m.quoted.sender?.split("@")[0];
  }
  if (!name) name = m.pushName || "kamu";

  if (!args && !m.quoted) {
    const help = claraWrap("Pohon", [
      `◦ Generator silsilah keluarga lucu`,
      ``,
      `◦ *Cara pakai:*`,
      `  ${prefix}pohon <nama>`,
      `  ${prefix}pohon Budi`,
      `  Reply orang: ${prefix}pohon`,
      ``,
      `◦ Hasil: silsilah keluarga absurd + warisan lucu`,
      `◦ Pure fun, jangan dipakai beneran ya :v`,
    ].join("\n"));
    return sendReplyWithNav(sock, m, help, "pohon");
  }

  await m.react("🕐");

  try {
    const prompt = `Kamu adalah generator silsilah keluarga komedi Indonesia. Buat silsilah keluarga absurd dan lucu untuk "${name}".

Format WAJIB (plain text, JANGAN markdown):

SILSILAH KELUARGA: ${name}

Kakek: [profesi absurd, contoh: "Ninja pensiunan di Kampung Rambutan"]
Nenek: [profesi absurd, contoh: "Hacker bank sakral dari Bandung"]

Ayah: [profesi absurd, contoh: "Pemain gitar di stasiun TVRI"]
Ibu: [profesi absurd, contoh: "Konsultan micin kelas dunia"]

Sepupu: [karakter absurd, 1-2 orang]
Paman/Tante: [karakter absurd, 1-2 orang]

WARISAN UTAMA: [warisan lucu/absurd, contoh: "Resep rahasia kerupuk yang bisa bikin orang auto ngakak"]
WARISAN SAMPINGAN: [warisan lucu]
KUTUNAN KELUARGA: [kekuatan/kutukan turun temurun lucu]

PREDIKSI NASIB: [1-2 kalimat prediksi masa depan absurd]

Aturan:
- Bahasa Indonesia santai
- JANGAN pakai markdown
- Bikin kreatif, lucu, absurd tapi tetap sopan
- Maksimal 15 baris total`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result || result.trim().length < 10) {
      await m.reply(claraWrap("Pohon", "AI lagi cari buku catatan keluarga, coba lagi ya."));
      return { handled: true };
    }

    await m.reply(claraWrap(`Pohon Keluarga - ${name}`, result.trim()));
    await m.react("✅");
  } catch (error) {
    console.error("pohon error:", error);
    m.reply(claraWrap("Pohon", `Gagal: ${error.message || "error"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
