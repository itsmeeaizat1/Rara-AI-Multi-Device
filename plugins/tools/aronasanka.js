// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aronasanka",
  alias: ["aronasanka"],
  category: "tools",
  description: "Chat dengan Arona (Blue Archive) via Sanka AI",
  usage: ".aronasanka <text>",
  example: ".aronasanka hai arona",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

async function handler(m, { sock, args }) {
  const text = args.join(" ").trim();

  if (!text) {
    let txt = `Arona AI\n\n`;
    txt += `Chat dengan Arona (Blue Archive)\n\n`;
    txt += `\`${m.prefix}arona <text>\`\n\n`;
    txt += `Contoh:\n`;
    txt += `1. \`${m.prefix}arona hai arona\`\n`;
    txt += `2. \`${m.prefix}arona cerita dong\`\n`;
    txt += `3. \`${m.prefix}arona sensei lagi sibuk\``;
    return await m.reply( txt, { commandName: "aronasanka" });
  }
  try {
    const url = `${API_BASE}/ai/arona?apikey=${API_KEY}&text=${encodeURIComponent(text)}`;

    const res = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.status) {
      throw new Error(res.data?.message || "API error");
    }

    const reply = res.data.result;

    if (!reply || reply.trim() === "") {
      throw new Error("Reply kosong dari API");
    }

    let txt = `Arona\n\n`;
    txt += `${reply}`;

    await m.reply( txt, { commandName: "aronasanka" });
  } catch (e) {
    console.error("[ARONASANKA] Error:", e.message);
    let txt = `Gagal chat dengan Arona!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("aronasanka", txt));
  }
}

export { pluginConfig as config, handler };
