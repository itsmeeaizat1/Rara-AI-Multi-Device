// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Toggle Fitur — Owner dapat mengaktifkan/menonaktifkan command atau kategori fitur

import { getDatabase } from "../../src/lib/nova-database.js";
import { pluginStore } from "../../src/lib/nova-plugins.js";

const pluginConfig = {
  name: "togglefitur",
  alias: ["togglefitur", "onofffitur", "onoff"],
  category: "owner",
  description: "Aktifkan/nonaktifkan command atau kategori fitur bot",
  usage: ".togglefitur <command/category> | .togglefitur on <name> | .togglefitur off <name> | .togglefitur list",
  example: ".togglefitur off game",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 1,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.text || "").trim().split(/\s+/);
  const action = (args[0] || "").toLowerCase();
  const target = (args[1] || "").toLowerCase();

  // Helper: dapatkan semua kategori dari plugins yang loaded
  const getAllCategories = () => {
    const cats = pluginStore.categories;
    return [...cats.keys()].sort();
  };

  // Helper: dapatkan semua command names dari plugins yang loaded
  const getAllCommands = () => {
    const cmds = pluginStore.commands;
    return [...cmds.keys()].sort();
  };

  const disabledCmds = db.setting("disabledCommands") || [];
  const disabledCats = db.setting("disabledCategories") || [];

  // === TANPA ARGUMEN: tampilkan status ringkas ===
  if (!action) {
    let text = "╭──「 *TOGGLE FITUR* 」\n\n";
    text += "│ 📋 Panduan:\n";
    text += "│ • .togglefitur off game → matikan kategori\n";
    text += "│ • .togglefitur on kencanmatch → hidupkan command\n";
    text += "│ • .togglefitur list → lihat semua status\n\n";
    text += "│ 🔴 Kategori Nonaktif:\n";
    if (disabledCats.length > 0) {
      text += "│ " + disabledCats.map(c => "`" + c + "`").join(", ") + "\n";
    } else {
      text += "│ (semua kategori aktif)\n";
    }
    text += "\n│ 🔴 Command Nonaktif:\n";
    if (disabledCmds.length > 0) {
      text += "│ " + disabledCmds.map(c => "`" + c + "`").join(", ") + "\n";
    } else {
      text += "│ (semua command aktif)\n";
    }
    text += "\n╰──────────❀";
    return m.reply(text);
  }

  // === LIST: tampilkan semua kategori & command dengan status ===
  if (action === "list") {
    const allCats = getAllCategories();
    let text = "╭──「 *DAFTAR FITUR* 」\n\n";
    text += "│ 📂 KATEGORI (" + allCats.length + ")\n";
    for (const cat of allCats) {
      const isOff = disabledCats.includes(cat);
      text += "│ " + (isOff ? "🔴" : "🟢") + " " + cat + "\n";
    }
    if (disabledCmds.length > 0) {
      text += "\n│ ⚙️ COMMAND NONAKTIF (" + disabledCmds.length + ")\n";
      for (const cmd of disabledCmds) {
        text += "│ 🔴 " + cmd + "\n";
      }
    }
    text += "\n╰──────────❀";
    return m.reply(text);
  }

  // === ON / OFF / TOGGLE ===
  let mode = "";
  let name = "";

  if (action === "on") {
    mode = "on";
    name = target;
  } else if (action === "off") {
    mode = "off";
    name = target;
  } else {
    // Toggle mode: .togglefitur game → toggle kategori/command
    mode = "toggle";
    name = action;
  }

  if (!name) {
    return m.reply("╭──「 *TOGGLE FITUR* 」\n├── Contoh: .togglefitur off game\n├── Contoh: .togglefitur on kencanmatch\n╰──────────❀");
  }

  const allCats = getAllCategories();
  const allCmds = getAllCommands();
  const isCategory = allCats.includes(name);
  const isCommand = allCmds.includes(name);

  if (!isCategory && !isCommand) {
    return m.reply("╭──「 *TOGGLE FITUR* 」\n├── ❌ Fitur/kategori tidak ditemukan: " + name + "\n├── Ketik .togglefitur list untuk melihat daftar\n╰──────────❀");
  }

  // Cegah owner meng-nonaktifkan command owner sendiri
  if (isCommand && name === "togglefitur") {
    return m.reply("╭──「 *TOGGLE FITUR* 」\n├── ❌ Tidak bisa menonaktifkan command ini\n╰──────────❀");
  }

  const type = isCategory ? "kategori" : "command";
  const list = isCategory ? disabledCats : disabledCmds;
  const idx = list.indexOf(name);
  const isCurrentlyOff = idx !== -1;

  let newState;
  if (mode === "on") {
    if (isCurrentlyOff) {
      list.splice(idx, 1);
      newState = false;
    } else {
      return m.reply("╭──「 *TOGGLE FITUR* 」\n├── ✅ " + type + " " + name + " sudah aktif\n╰──────────❀");
    }
  } else if (mode === "off") {
    if (!isCurrentlyOff) {
      list.push(name);
      newState = true;
    } else {
      return m.reply("╭──「 *TOGGLE FITUR* 」\n├── 🔴 " + type + " " + name + " sudah nonaktif\n╰──────────❀");
    }
  } else {
    // Toggle
    if (isCurrentlyOff) {
      list.splice(idx, 1);
      newState = false;
    } else {
      list.push(name);
      newState = true;
    }
  }

  // Simpan ke database
  if (isCategory) {
    db.setting("disabledCategories", disabledCats);
  } else {
    db.setting("disabledCommands", disabledCmds);
  }

  const status = newState ? "🔴 Nonaktif" : "🟢 Aktif";
  const emoji = newState ? "⏸️" : "▶️";

  return m.reply(
    "╭──「 *TOGGLE FITUR* 」\n\n" +
    "│ " + emoji + " " + type.charAt(0).toUpperCase() + type.slice(1) + ": *" + name + "*\n" +
    "│ Status: " + status + "\n\n" +
    "╰──────────❀"
  );
}

export { pluginConfig as config, handler };
