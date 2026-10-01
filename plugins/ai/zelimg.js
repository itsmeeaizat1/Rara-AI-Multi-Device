// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 ZelAI Image — 22 generator gambar zelapi (text2img + edit foto)
// 🔹 Prefix z. text2img: prompt → gambar. imgedit: WAJIB reply foto + prompt.
// ═════════════════════════════════════════════

import { zelImageEndpoint, _setZelHttpForTest, _setZelKeyForTest } from "../../src/scraper/zelapi.js";
import { ZEL_IMAGE_REGISTRY, getZelImageSpec } from "../../src/lib/nova-zel-registry.js";
import { novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { sendImage } from "../../src/lib/nova-message.js";
import { fetchBuffer } from "../../src/lib/nova-utils.js";

// seam test: mock unduh gambar
let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "zelimg",
  alias: ["zimg", ...Object.keys(ZEL_IMAGE_REGISTRY)],
  category: "ai",
  description: "22 generator gambar AI zelapi — text2img & edit foto (prefix z)",
  usage: ".zimg list | .z<generator> <prompt> (edit: reply foto + prompt)",
  example: ".zbingimage kucing astronot | reply foto + .znanobananedit jadi ghibli",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "").toLowerCase();
    const args = m.args || [];

    // .zimg list / .zimg doang
    if (cmd === "zimg" && (!args.length || ["list", "daftar"].includes((args[0] || "").toLowerCase()))) {
      const text2img = Object.entries(ZEL_IMAGE_REGISTRY).filter(([, s]) => s.type !== "imgedit");
      const imgedit = Object.entries(ZEL_IMAGE_REGISTRY).filter(([, s]) => s.type === "imgedit");
      return m.reply(novaWrap("zelai",
        `🎨 *ZELAPI IMAGE — ${Object.keys(ZEL_IMAGE_REGISTRY).length} GENERATOR (PREFIX Z)*\n\n` +
        `🖼️ *TEXT → GAMBAR:*\n${text2img.map(([c, s]) => `• .${c} — ${s.desc}`).join("\n")}\n\n` +
        `✏️ *EDIT FOTO (reply foto + prompt):*\n${imgedit.map(([c, s]) => `• .${c} — ${s.desc}`).join("\n")}\n\n` +
        `💡 Contoh: .zbingimage kucing astronot\n💡 Edit: reply foto terus .znanobananedit ubah jadi gaya ghibli`));
    }

    const spec = getZelImageSpec(cmd) || (cmd !== "zimg" ? null : null);
    if (!spec) {
      return m.reply(novaWrap("zelai", `💡 Ketik *.zimg list* buat daftar generator gambar zelapi.`));
    }

    const prompt = args.join(" ").trim();
    const isImgEdit = spec.type === "imgedit" || (spec.type === "flex" && m.quoted?.isImage);
    if (isImgEdit && !m.quoted?.isImage) {
      return m.reply(novaGuideV2(cmd, {
 kaomoji: "(๑ᵔ⤙ᵔ๑)",
 sapaan: spec.desc + " (wajib reply foto dulu ya!)",
        cara: "reply foto + ketik prompt ini sebagai caption",
        contoh: `reply foto → ${m.prefix}${cmd} ubah jadi kartun`,
        spec: ["⚡ energi 2", "⏱ 20dtk", "💸 gratis"],
      }));
    }
    if (!prompt) return m.reply(novaGuideV2(cmd, {
 kaomoji: "(≧ω≦)",
 sapaan: spec.desc + "!",
      cara: (isImgEdit || spec.type === "imgedit") ? "reply foto + ketik prompt ini sebagai caption" : "ketik prompt/deskripsinya sesudah command",
      contoh: (isImgEdit || spec.type === "imgedit") ? `reply foto → ${m.prefix}${cmd} jadi gaya ghibli` : `${m.prefix}${cmd} kucing astronot lucu`,
      spec: ["⚡ energi 2", "⏱ 20dtk", "💸 gratis"],
    }));

    await m.react("🧠");

    // upload foto buat mode edit
    let imageUrl;
    if (m.quoted?.isImage) {
      try {
        const buf = await m.quoted.download();
        const form = new FormData();
        form.append("files[]", new Blob([buf]), "img.jpg");
        const up = await fetch("https://uguu.se/upload", { method: "POST", body: form });
        const j = await up.json();
        imageUrl = j?.files?.[0]?.url;
      } catch {}
      if (!imageUrl) {
        await m.react("❌");
        return m.reply(novaWrap("zelai", "⚠️ Gagal upload foto — coba kirim ulang."));
      }
    }

    const r = await zelImageEndpoint(spec.path, prompt, {
      imageUrl,
      needImage: spec.type === "imgedit",
      textParam: spec.textParam,
      imageParam: spec.imageParam,
    });
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "⚠️ Key zelapi belum di-set.",
        TEXT_KOSONG: "⚠️ Prompt kosong.",
        NEED_IMAGE: "⚠️ Generator ini WAJIB reply foto + prompt.",
      };
      return m.reply(novaWrap("zelai", map[r.error] || `⚠️ *${cmd.toUpperCase()} MATI:* ${r.error}`));
    }

    await m.react("🐣");
    // buffer langsung
    if (r.buffer) {
      return sendImage(sock, m.chat, r.buffer, `🎨 _(${cmd} — zelapi)_ ${prompt.slice(0, 80)}`, { quoted: m });
    }
    // kirim max 2 gambar dari URL
    const urls = (r.images || []).slice(0, 2);
    let sent = 0;
    for (const u of urls) {
      try {
        const buf = await getBuf(u);
        await sendImage(sock, m.chat, buf, sent === 0 ? `🎨 _(${cmd} — zelapi)_ ${prompt.slice(0, 80)}` : "", { quoted: m });
        sent++;
      } catch {}
    }
    if (!sent) {
      await m.react("❌");
      return m.reply(novaWrap("zelai", `⚠️ Gambar dapet URL tapi gagal diunduh — coba lagi atau generator lain (.zimg list).`));
    }
    return;
  } catch (err) {
    console.error("[zelimg]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("zelai", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setZelHttpForTest, _setZelKeyForTest };
