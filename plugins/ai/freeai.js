// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/ai/freeai.js — free.ai GRATIS TANPA API KEY
// .freeai <pesan>          — chat AI (Qwen3-30B)
// .freeaiimage <prompt>    — text-to-image (sdxl)
// .freeaiimage <ratio> <prompt> — rasio 1:1 | 9:16 | 16:9 | 4:3 | 3:4 | 3:2 | 2:3 | 21:9

import { freeAIChat, freeAIImage, FREEAI_RATIOS } from "../../src/scraper/freeai.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const DEFAULT_SYSTEM = "Kamu adalah Nova AI, asisten yang ramah dan menjawab dengan singkat, padat, dan akurat. Balas dalam bahasa yang dipakai user (default bahasa Indonesia).";

const pluginConfig = {
  name: "freeai",
  alias: ["freeai", "freeaiimage", "freeaiimg", "aiimage"],
  category: "ai",
  description: "AI gratis tanpa API key — chat + buat gambar dari teks",
  usage: ".freeai <pesan>\n.freeaiimage <prompt>\n.freeaiimage <1:1|9:16|16:9|4:3|3:4|3:2|2:3|21:9> <prompt>",
  example: ".freeai apa itu AI?\n.freeaiimage naga lucu kartun\n.freeaiimage 9:16 pantai sunset",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 0, isEnabled: true,
};

const isImage = (cmd) => /^freeai(image|img)$/.test(cmd || "");

const ratioHelp = () => FREEAI_RATIOS.map((r) =>
  r === "1:1" ? "1:1 (default)" : r
).join(" | ");

async function handler(m, { sock }) {
  try {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();
    const image = isImage(m.command);

    // help
    if (!image && (sub === "help" || sub === "?")) {
      return m.reply(novaWrap("freeai",
        `🆓 FREE AI — gratis tanpa API key\n\n` +
        `💬 CHAT\n.freeai <pesan>\n\n` +
        `🎨 BUAT GAMBAR\n.freeaiimage <prompt>\n.freeaiimage <ratio> <prompt>\n\n` +
        `📐 Ratio: ${ratioHelp()}\n\n` +
        `Contoh: ${m.prefix}freeaiimage 9:16 pantai sunset`, "guide"));
    }

    // ── ratio parsing: arg pertama/terakhir format d:d → ratio, sisanya prompt ──
    let prompt = m.text?.trim() || "";
    let ratio = "1:1";
    if (image) {
      const tokens = prompt.split(/\s+/).filter(Boolean);
      const ratioIdx = tokens.findIndex((t) => /^\d{1,2}:\d{1,2}$/.test(t));
      if (ratioIdx >= 0) {
        const r = tokens[ratioIdx];
        if (!FREEAI_RATIOS.includes(r)) {
          await m.react("❌");
          return m.reply(novaWrap("freeai",
            `📐 Ratio *${r}* gak dikenal.\n\nPilihan: ${ratioHelp()}`, "warn"));
        }
        ratio = r;
        tokens.splice(ratioIdx, 1);
        prompt = tokens.join(" ");
      }
    }

    if (!prompt) {
      return m.reply(novaWrap("freeai",
        image
          ? `🎨 Mau bikin gambar apa?\n\n.freeaiimage <prompt>\n.freeaiimage <ratio> <prompt>\n\n📐 Ratio: ${ratioHelp()}\n\nContoh: ${m.prefix}freeaiimage 9:16 naga kartun`
          : `💬 Mau nanya apa?\n\n.freeai <pesan>\n\nContoh: ${m.prefix}freeai apa itu AI?`, "guide"));
    }

    await m.react("⏲️");

    // ── CHAT ──
    if (!image) {
      const { content, model } = await freeAIChat([
        { role: "system", content: DEFAULT_SYSTEM },
        { role: "user", content: prompt },
      ], { maxTokens: 300 });
      await m.react("🐣");
      return m.reply(`${content}\n\n⚡ ${model}`);
    }

    // ── IMAGE ──
    const img = await freeAIImage({ prompt, aspectRatio: ratio });
    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: { url: img.url },
      caption: `🆓 ${prompt.slice(0, 200)}\n📐 ${img.ratio} | sdxl`,
    }, { quoted: m });
    return;
  } catch (err) {
    console.error("freeai error:", err.message);
    await m.react("❌");
    return m.reply(novaWrap("freeai",
      /balasan AI kosong|gambar gak terkirim/.test(err?.message || "")
        ? te(m.prefix, m.command, m.pushName)
        : `free.ai lagi bermasalah: ${err.message}\n\nCoba lagi sebentar ya.`,
      "error"));
  }
}

export { pluginConfig as config, handler };
