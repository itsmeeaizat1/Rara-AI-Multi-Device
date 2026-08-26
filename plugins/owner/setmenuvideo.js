// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import fs from "fs";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setmenuvideo",
  alias: ["setmenuvideo", "menuvideo", "setvideo", "videomenu"],
  category: "owner",
  desc: "Set video/GIF untuk menu V1 (URL atau local). Kosong = pakai assets/video/nova-mp4.mp4",
  usage: ".setmenuvideo <url>\n.setmenuvideo local\n.setmenuvideo check",
  example: ".setmenuvideo https://example.com/intro.mp4\n.setmenuvideo local",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const prefix = config.command?.prefix || ".";
  const subCmd = args[0]?.toLowerCase();

  // ─── Check current video source ───
  if (!subCmd || subCmd === "check" || subCmd === "status") {
    const menuUrl = config.ui?.menuVideoUrl || "";
    const allmenuUrl = config.ui?.allmenuVideoUrl || "";
    const localPath = config.assets?.["nova-mp4"] || "./assets/video/nova-mp4.mp4";
    const localExists = fs.existsSync(localPath);

    const lines = [
      `┊ Sumber Video Menu V1`,
      ``,
      `┊ Menu:`,
      menuUrl
        ? `┊    URL: ${menuUrl}`
        : `┊    Local: ${localPath} ${localExists ? "✅" : "❌"}`,
      ``,
      `┊ AllMenu:`,
      allmenuUrl
        ? `┊    URL: ${allmenuUrl}`
        : `┊    Local: ${localPath} ${localExists ? "✅" : "❌"}`,
      ``,
      `┊ Cara ubah:`,
      `┊    ${prefix}setmenuvideo <url> - Set URL video menu`,
      `┊    ${prefix}setmenuvideo local - Menu pakai file local`,
      `┊    ${prefix}setmenuvideo allmenu <url> - Set URL allmenu`,
      `┊    ${prefix}setmenuvideo allmenu local - Allmenu pakai local`,
    ];

    await m.reply(claraWrap("SetMenuVideo", lines.join("\n")));
    return;
  }

  // ─── Set allmenu video source ───
  if (subCmd === "allmenu") {
    const value = args[1]?.toLowerCase();
    if (!value || value === "local") {
      config.ui.allmenuVideoUrl = "";
      await m.reply(claraWrap("SetMenuVideo", `✅ AllMenu video diubah ke *LOCAL* (${config.assets?.["nova-mp4"] || "assets/video/nova-mp4.mp4"})`));
      return;
    }
    const url = args[1];
    if (!/^https?:\/\//i.test(url)) {
      await m.reply(claraWrap("SetMenuVideo", `❌ URL tidak valid. Pastikan dimulai dengan http:// atau https://`));
      return;
    }
    config.ui.allmenuVideoUrl = url;
    await m.reply(claraWrap("SetMenuVideo", `✅ AllMenu video diubah ke URL:\n${url}`));
    return;
  }

  // ─── Set menu video source to local ───
  if (subCmd === "local") {
    config.ui.menuVideoUrl = "";
    await m.reply(claraWrap("SetMenuVideo", `✅ Menu video diubah ke *LOCAL* (${config.assets?.["nova-mp4"] || "assets/video/nova-mp4.mp4"})`));
    return;
  }

  // ─── Set menu video URL ───
  const url = args[0];
  if (!/^https?:\/\//i.test(url)) {
    await m.reply(claraWrap("SetMenuVideo", `❌ URL tidak valid. Pastikan dimulai dengan http:// atau https://`));
    return;
  }

  config.ui.menuVideoUrl = url;
  await m.reply(claraWrap("SetMenuVideo", `✅ Menu video diubah ke URL:\n${url}\n\nGunakan ${prefix}setmenuvideo allmenu <url> untuk set allmenu juga`));
}

export default { config: pluginConfig, handler };
