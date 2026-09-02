// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// textpro.js — Text effect maker via ephoto360 scraping (lokal, no API key)
import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "textpro",
  alias: ["textpro"],
  category: "maker",
  description: "Text effect maker dengan 20+ style (ephoto360 scraping)",
  usage: ".textpro <style> <teks> | .textpro list",
  example: ".textpro neon Halo Dunia",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const STYLES = {
  neon: { url: "https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html", emoji: "🔴", desc: "Neon glitch text" },
  glitch: { url: "https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html", emoji: "⚡", desc: "Glitch effect" },
  glow: { url: "https://en.ephoto360.com/create-glowing-text-effects-online-706.html", emoji: "✨", desc: "Glowing text" },
  blackpink: { url: "https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html", emoji: "🖤", desc: "Blackpink style" },
  gradient: { url: "https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html", emoji: "🎨", desc: "3D gradient text" },
  gold: { url: "https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html", emoji: "🥇", desc: "Luxury gold text" },
  galaxy: { url: "https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html", emoji: "🌌", desc: "Galaxy style" },
  typography: { url: "https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html", emoji: "✍️", desc: "Typography style" },
  pixel: { url: "https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html", emoji: "👾", desc: "Pixel glitch text" },
  paper: { url: "https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html", emoji: "📄", desc: "Paper cut style" },
  watercolor: { url: "https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html", emoji: "🎨", desc: "Watercolor text" },
  cartoon: { url: "https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html", emoji: "🎨", desc: "Cartoon graffiti" },
  underwater: { url: "https://en.ephoto360.com/3d-underwater-text-effect-online-682.html", emoji: "🌊", desc: "Underwater text" },
  cloud: { url: "https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html", emoji: "☁️", desc: "Cloud text effect" },
  sand: { url: "https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html", emoji: "🏖️", desc: "Sand write text" },
  royal: { url: "https://en.ephoto360.com/royal-text-effect-online-free-471.html", emoji: "👑", desc: "Royal text" },
  multineon: { url: "https://en.ephoto360.com/create-multicolored-neon-light-signatures-591.html", emoji: "🌈", desc: "Multicolored neon" },
  hologram: { url: "https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html", emoji: "🔮", desc: "3D hologram text" },
  bplogo: { url: "https://en.ephoto360.com/create-blackpink-logo-online-free-607.html", emoji: "🖤", desc: "Blackpink logo" },
  erase: { url: "https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html", emoji: "🧹", desc: "Eraser deleting text" },
};

async function ephoto360(url, text) {
  const res = await axios.get(url, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36" },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data);
  const token = $("input[name=token]").val();
  const buildServer = $("input[name=build_server]").val();
  const buildServerId = $("input[name=build_server_id]").val();
  if (!token || !buildServer) throw new Error("Gagal parse ephoto360");

  const form = new FormData();
  form.append("text[]", text);
  form.append("token", token);
  form.append("build_server", buildServer);
  form.append("build_server_id", buildServerId);

  const postRes = await axios.post(url, form, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "cookie": res.headers["set-cookie"]?.join("; "),
      ...form.getHeaders(),
    },
    timeout: 30000,
  });

  const $$ = cheerio.load(postRes.data);
  const formValueStr = $$("input[name=form_value_input]").val();
  if (!formValueStr) throw new Error("Gagal dapat form value");

  const formValue = JSON.parse(formValueStr);
  formValue["text[]"] = formValue.text;
  delete formValue.text;

  const { data: finalRes } = await axios.post(
    "https://en.ephoto360.com/effect/create-image",
    new URLSearchParams(formValue),
    {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "cookie": res.headers["set-cookie"].join("; "),
      },
      timeout: 30000,
    }
  );

  if (!finalRes.image) throw new Error("Gagal generate gambar");
  return buildServer + finalRes.image;
}

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const style = (args[0] || "").toLowerCase();
  const content = args.slice(1).join(" ");

  if (!style || style === "list") {
    const list = Object.entries(STYLES)
      .map(([k, v]) => `${v.emoji} ${k} — ${v.desc}`)
      .join("\n");
    return m.reply(claraWrap("Text Pro", [
      "Daftar style tersedia:",
      "",
      list,
      "",
      `Cara: ${m.prefix}textpro <style> <teks>`,
      `Contoh: ${m.prefix}textpro neon Halo Dunia`,
    ].join("\n")));
  }

  if (!STYLES[style]) {
    return m.reply(claraWrap("Text Pro", `Style tidak ditemukan: ${style}\nKetik ${m.prefix}textpro list`));
  }

  if (!content) {
    return m.reply(claraWrap("Text Pro", `Masukkan teks!\nContoh: ${m.prefix}textpro ${style} Halo Dunia`));
  }

  try {
    await m.react("🕒");
    const st = STYLES[style];
    const imageUrl = await ephoto360(st.url, content);
    const { data: imgBuf } = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
    const buffer = Buffer.from(imgBuf);

    if (buffer.length < 100) throw new Error("Gambar kosong");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: claraWrap("Text Pro", `${st.emoji} ${style} — ${st.desc}\nTeks: ${content}`),
    }, { quoted: m });
  } catch (err) {
    console.error("[textpro] Error:", err.message);
    await m.react("❌");
    m.reply(claraWrap("Text Pro", `Gagal generate: ${err.message}`));
  }
}

export { pluginConfig as config, handler };
