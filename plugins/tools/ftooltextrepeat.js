// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftooltextrepeat — ulang teks berkalang-kali (port altftool.com/tools/all/text-repeater)
// Cap 20x + 3000 karakter biar gak jadi senjata spam.
import { raraGuide, raraSalah, raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";

const pluginConfig = {
  name: "ftooltextrepeat", alias: ["textrepeat", "repeattext", "ulangteks"], category: "tools",
  description: "Ulangi teks sebanyak N kali", usage: ".ftooltextrepeat <jumlah>|<teks>",
  example: ".ftooltextrepeat 5|halo dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const MAX_REPEAT = 20, MAX_CHARS = 3000;

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    const pipe = raw.indexOf("|");
    if (!raw || pipe < 1) {
      return m.reply(raraGuide("ftooltextrepeat", {
        kaomoji: "(๑˃ᴗ˂)ﻭ",
        sapaan: "teks mau diulang berkali-kali? tinggal kasih jumlahnya~",
        cara: "ketik jumlah lalu tanda | lalu teksnya",
        contoh: `${prefix}ftooltextrepeat 5|halo dunia`,
        note: "maksimal 20x pengulangan, hasil dipotong di 3000 karakter",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooltextrepeat");
    }
    const n = parseInt(raw.slice(0, pipe).trim(), 10);
    const text = raw.slice(pipe + 1).trim();
    if (!Number.isFinite(n) || n < 1 || !text) {
      await m.react("❌");
      return await sendUsageCard(sock, m, raraSalah("ftooltextrepeat", {
        kaomoji: "(・_・;)",
        pesan: "jumlahnya harus angka lebih dari 0 dan teksnya gak boleh kosong",
        contoh: `${prefix}ftooltextrepeat 5|halo dunia`,
      }), { name: "ftooltextrepeat" });
    }
    const times = Math.min(n, MAX_REPEAT);
    const full = Array.from({ length: times }, () => text).join("\n");
    const cut = full.length > MAX_CHARS;
    const out = cut ? full.slice(0, MAX_CHARS) : full;
    const lines = ["TEXT REPEAT BERHASIL",
      "",
      "```" + out + "```"];
    if (n > MAX_REPEAT) lines.push("", `⚠️ jumlah ${n} dibatasi jadi ${MAX_REPEAT}x`);
    if (cut) lines.push(`⚠️ hasil dipotong di ${MAX_CHARS} karakter`);
    await m.react("🐣");
    await m.reply(raraWrap("Text Repeat", lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Text Repeat", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
