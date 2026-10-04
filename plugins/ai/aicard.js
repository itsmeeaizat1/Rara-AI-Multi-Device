// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .aicard — kartu GenAI native WhatsApp (engine: src/lib/rara-airich-hi.js)
// SATU-SATUNYA engine AI rich Rara (GenAI card port) — HTML bubble NIXCODE udah dihapus total 29 Sep.
import { raraGuide, raraError } from "../../src/lib/rara-menu-style.js";
import { AIRich } from "../../src/lib/rara-airich-hi.js";
import { notifyRichDownload } from "../../src/lib/rara-airich.js";

const pluginConfig = {
  name: "aicard",
  alias: ["airichcard", "richcard", "genaicard"],
  category: "ai",
  description: "Kirim kartu GenAI native WhatsApp (markdown + code block keren kayak balasan Meta AI)",
  usage: ".aicard <teks>",
  example: ".aicard Halo semua\n```js\nconsole.log('hai')\n```",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Parse teks user jadi kartu: baris pertama = judul, ```fence``` = code block
function parseToRich(rich, bodyText) {
  const lines = bodyText.split("\n");
  let title = null;
  let rest = bodyText;

  const startsWithFence = bodyText.trimStart().startsWith("```");
  if (!startsWithFence && lines.length > 1 && lines[0].trim()) {
    title = lines[0].trim();
    rest = lines.slice(1).join("\n").trim();
  }
  if (title) rich.setTitle(title);

  const segs = rest.split("```");
  let hasText = false;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (i % 2 === 1) {
      const nl = seg.indexOf("\n");
      let lang = "javascript";
      let code = seg;
      if (nl > -1 && seg.slice(0, nl).trim()) {
        lang = seg.slice(0, nl).trim().toLowerCase();
        code = seg.slice(nl + 1);
      }
      rich.addCode(lang, code.replace(/\n$/, ""));
    } else if (seg.trim()) {
      rich.addText(seg.trim(), { hyperlink: true, citation: true, latex: true });
      hasText = true;
    }
  }
  if (!hasText && segs.length === 1 && bodyText.trim()) {
    rich.addText(bodyText.trim(), { hyperlink: true, citation: true, latex: true });
  }
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");

    const raw = m.text?.trim() || "";
    const bodyText = raw.replace(new RegExp(`^${prefix}aicard\\s+`, "i"), "").trim();

    if (!bodyText) {
      await m.react("🐣");
      await m.reply(
        raraGuide(
          "aicard",
          "Kartu GenAI native WhatsApp: markdown, hyperlink, LaTeX, dan code block tersorot keren kayak balasan Meta AI.",
          `${prefix}aicard Halo semua`,
          "Bungkus kode dengan tanda ``` diikuti bahasa, enter, lalu kodenya. Baris pertama jadi judul kartu."
        )
      );
      return { handled: true };
    }

    const rich = new AIRich(sock);
    parseToRich(rich, bodyText);

    await notifyRichDownload(m);
    await rich.send(m.chat, {});
    await m.react("⚡");
  } catch (error) {
    console.error("[aicard]:", error.message);
    await m.react("❌");
    await m.reply(raraError("AIcard", "Gagal kirim kartu GenAI, coba lagi ya"));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
