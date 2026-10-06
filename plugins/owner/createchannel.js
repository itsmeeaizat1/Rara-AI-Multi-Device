// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "createchannel",
  alias: ["buatsaluran", "createsaluran", "createnewsletter"],
  category: "owner",
  description: "Buat saluran/newsletter baru",
  usage: ".createchannel <nama>|<deskripsi>",
  example: ".createchannel Info Bot|Update terbaru bot kami",
  isOwner: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim() || "";
  const pipeIdx = text.indexOf("|");

  let name, description;
  if (pipeIdx === -1) {
    name = text;
    description = "";
  } else {
    name = text.substring(0, pipeIdx).trim();
    description = text.substring(pipeIdx + 1).trim();
  }

  if (!name || name.length < 2) {
    return m.reply( raraWrap("createchannel", "📢 *Buat sAluran*\n\n" +
        "`.createchannel Nama Saluran`\n" +
        "`.createchannel Nama|Deskripsi`\n\n" +
        "📝 Contoh:\n" +
        "`.createchannel Info Bot`\n" +
        "`.createchannel Info Bot|Update terbaru bot kami`", "guide"), "createchannel");
  }

  try {
    const result = await sock.newsletterCreate(name, description || undefined);
    const saluranId = result?.id || result?.thread_metadata?.id || "unknown";
    const saluranName = result?.name || name;
    return m.reply(`*sAluran Dibuat*\n\n` +
        `Nama: ${saluranName}\n` +
        (description ? `Deskripsi: ${description}\n` : "") +
        `ID: ${saluranId}\n` +
        `Subscribers: ${result?.subscribers || 0}\n\n` +
        `_Saluran ini bisa dikonfigurasi di config.saluran.id_`);
  } catch (err) {
    return m.reply(raraWrap("createchannel", `❌ Gagal membuat saluran: ${err.message}`));
  }
}

export { pluginConfig as config, handler };
