// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolsortlines — urutkan baris teks (port altftool.com/tools/all/sort-text-lines)
import { raraGuideV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolsortlines", alias: ["sortlines", "urutbaris", "sorttext"], category: "tools",
  description: "Urutkan baris teks A-Z, Z-A, atau acak", usage: ".ftoolsortlines <az|za|acak> <teks>",
  example: ".ftoolsortlines az mangga apel jeruk", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    // FIX: split(/\s+/) makan baris baru (\n) → multiline gak kepisah per baris.
    // Ambil token pertama (mode) TANPA ngerusak baris sisanya.
    const raw = (m.text || "").trim();
    const sp = raw.search(/\s/);
    const mode = (sp < 0 ? raw : raw.slice(0, sp)).toLowerCase();
    const text = sp < 0 ? "" : raw.slice(sp + 1);
    if (!mode || !["az", "za", "acak"].includes(mode) || !text) {
      return m.reply(raraGuideV2("ftoolsortlines", {
        kaomoji: "(๑˃ᴗ˂̵)و",
        sapaan: "daftar berantakan mau diurutin? pilih modenya~",
        cara: "ketik mode (az / za / acak) lalu daftarnya, satu item satu baris",
        contoh: `${prefix}ftoolsortlines az mangga\\napel\\njeruk`,
        note: "az = urutan naik, za = urutan turun, acak = diacak",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolsortlines");
    }
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      await m.react("❌");
      return m.reply(raraWrap("Sort Lines", ["ERROR: gak ada baris yang bisa diurutin"].join("\n")));
    }
    let out;
    if (mode === "az") out = [...lines].sort((a, b) => a.localeCompare(b, "id"));
    else if (mode === "za") out = [...lines].sort((a, b) => b.localeCompare(a, "id"));
    else {
      out = [...lines];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
    }
    await m.react("🐣");
    await m.reply(raraWrap("Sort Lines", [`HASIL SORT (${mode.toUpperCase()} ×${lines.length} baris)`,
      "",
      "```" + (out.join("\n").length > 800 ? out.join("\n").substring(0, 800) + "…" : out.join("\n")) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Sort Lines", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
