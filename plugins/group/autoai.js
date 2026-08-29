// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const execAsync = promisify(exec);

const pluginConfig = {
  name: "autoai",
  alias: ["autoai"],
  category: "group",
  description:
    "Toggle auto AI response untuk grup dengan pilihan text atau voice",
  usage:
    ".autoai on/off --novamode=<character|custom> --logic=<custom instruction> --type=<text|voice> --mode=<onlychat|assistant>",
  example: ".autoai on --novamode=furina --type=voice --mode=onlychat",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const characters = {
  furina: {
    name: "Furina",
    instruction:
      "Kamu adalah Furina dari Genshin Impact. Bicara santai tapi elegan, sedikit dramatis, kadang agak bangga diri tapi tetap hangat. Jangan terlalu panjang, jawab langsung ke inti seperti chat biasa. Sesekali boleh nyenggol tema panggung atau laut. Jangan mengaku sebagai AI.",
  },
  zeta: {
    name: "Zeta",
    instruction:
      "Kamu adalah Zeta dari Spy x Family. Bicara serius dan tenang, tapi selalu agak curiga seperti mencium konspirasi. Tetap natural seperti orang ngobrol biasa, singkat dan langsung ke poin. Jangan mengaku sebagai AI.",
  },
  kobo: {
    name: "Kobo Kanaeru",
    instruction:
      "Kamu adalah Kobo Kanaeru. Bicara santai, ceria, agak usil. Gaya chat biasa, tidak terlalu panjang. Boleh sedikit random atau lucu. Jangan berlebihan pakai caps atau emoji. Jangan mengaku sebagai AI.",
  },
  elaina: {
    name: "Elaina",
    instruction:
      "Kamu adalah Elaina. Bicara lembut, tenang, percaya diri, sedikit narsis halus. Jawab singkat, rapi, dan langsung ke inti seperti chat normal. Jangan mengaku sebagai AI.",
  },
  waguri: {
    name: "Waguri",
    instruction:
      "Kamu adalah Waguri. Bicara singkat, agak dingin tapi sebenarnya peduli. Sedikit tsundere, to the point, seperti chat biasa. Jangan mengaku sebagai AI.",
  },
  nova: {
    name: "Nova",
    instruction: config.autoaiPersonas?.Nova || "",
  },
};
async function convertToOggOpus(inputPath) {
  const outputPath = inputPath.replace(/\.[^.]+$/, ".ogg");
  const cmd = `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${outputPath}"`;

  try {
    await execAsync(cmd, { timeout: 60000 });
    if (fs.existsSync(outputPath)) {
      return outputPath;
    }
  } catch (e) {
    console.log("[AutoAI] FFmpeg error:", e.message);
  }
  return null;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const fullArgs = m.fullArgs || "";

  if (!m.isGroup) {
    return m.reply(novaError("AutoAI", "Fitur ini khusus untuk grup ya!"));
  }

  if (!m.isAdmin && !m.isOwner) {
    return m.reply(novaError("AutoAI", "Hanya admin grup yang bisa menggunakan fitur ini!"));
  }

  if (!db.db.data.autoai) db.db.data.autoai = {};
  if (!db.db.data.autoai_personas) db.db.data.autoai_personas = {};
  if (!db.db.data.autoai_global) db.db.data.autoai_global = { enabled: false };

  const subcmd = args[0]?.toLowerCase();

  if (subcmd === "tambahpersona") {
    if (!m.isOwner)
      return m.reply(novaError("AutoAI", "Hanya owner yang bisa menambah persona!"));
    const personaArgs = fullArgs
      .replace(/^tambahpersona\s*/i, "")
      .split("|")
      .map((s) => s.trim());
    if (personaArgs.length < 2 || !personaArgs[0] || !personaArgs[1])
      return m.reply(
        novaNoInput("AutoAI Persona", "Format tambah persona salah!", `${m.prefix || "."}autoai tambahpersona nexa | kamu adalah nexa ai, ...`)
      );
    const pName = personaArgs[0].toLowerCase().replace(/\s+/g, "_");
    const pInstruction = personaArgs.slice(1).join("|").trim();
    if (characters[pName])
      return m.reply(
        novaError("AutoAI Persona", `Nama persona "${pName}" sudah dipakai persona bawaan! Pilih nama lain.`)
      );
    db.db.data.autoai_personas[pName] = {
      name: personaArgs[0],
      instruction: pInstruction,
      createdBy: m.sender,
      createdAt: new Date().toISOString(),
    };
    db.save();
    return m.reply(
      `✅ *ᴘᴇʀꜱᴏɴᴀ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\nNama: ${personaArgs[0]}\nKey: ${pName}\nLogic: ${pInstruction.substring(0, 80)}${pInstruction.length > 80 ? "..." : ""}\n\nGunakan: .autoai on --novamode=${pName}`,
    );
  }

  if (subcmd === "hapuspersona") {
    if (!m.isOwner)
      return m.reply(novaError("AutoAI", "Hanya owner yang bisa menghapus persona!"));
    const pKey = (args[1] || "").toLowerCase().trim();
    if (!pKey)
      return m.reply(
        novaNoInput("AutoAI Persona", "Masukkan nama persona yang mau dihapus", `${m.prefix || "."}autoai hapuspersona nexa`)
      );
    if (!db.db.data.autoai_personas[pKey])
      return m.reply(
        novaEmpty("AutoAI Persona", `Persona "${pKey}" tidak ditemukan! Ketik .autoai listpersona untuk melihat daftar`)
      );
    delete db.db.data.autoai_personas[pKey];
    db.save();
    return m.reply(claraWrap("Autoai", `✅ Persona "${pKey}" berhasil dihapus`));
  }

  if (subcmd === "enablecommand" || subcmd === "enablecmd") {
    if (!m.isAdmin && !m.isOwner)
      return m.reply(novaError("AutoAI", "Hanya admin yang bisa mengatur ini!"));
    const cfg = db.db.data.autoai[m.chat];
    if (!cfg?.enabled) return m.reply(novaError("AutoAI", "AutoAI belum aktif di grup ini!"));
    if (cfg.enableCommands)
      return m.reply(novaGuide("AutoAI Command", "Command sudah di-enable sebelumnya. User tetap bisa pakai command walau AutoAI aktif."));
    cfg.enableCommands = true;
    db.save();
    return m.reply(
      `✅ *ᴇɴᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅ*\n\nUser sekarang bisa menggunakan command walau AutoAI aktif\nBot tetap merespon saat di-tag/reply\n\n_Gunakan ${m.prefix || "."}autoai disablecommand untuk menonaktifkan_`,
    );
  }

  if (subcmd === "disablecommand" || subcmd === "disablecmd") {
    if (!m.isAdmin && !m.isOwner)
      return m.reply(novaError("AutoAI", "Hanya admin yang bisa mengatur ini!"));
    const cfg = db.db.data.autoai[m.chat];
    if (!cfg?.enabled) return m.reply(novaError("AutoAI", "AutoAI belum aktif di grup ini!"));
    if (!cfg.enableCommands)
      return m.reply(novaGuide("AutoAI Command", "Command sudah di-disable sebelumnya. Semua command (kecuali owner) diblokir saat AutoAI aktif."));
    cfg.enableCommands = false;
    db.save();
    return m.reply(
      `🔒 *ᴅɪꜱᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅ*\n\nSemua command (kecuali owner) diblokir saat AutoAI aktif\nBot hanya merespon saat di-tag atau di-reply\n\n_Gunakan ${m.prefix || "."}autoai enablecommand untuk mengaktifkan kembali_`,
    );
  }

  if (subcmd === "listpersona") {
    const builtIn = Object.entries(characters)
      .map(([k, v]) => `  ▸ ${k} - ${v.name}`)
      .join("\n");
    const customEntries = Object.entries(db.db.data.autoai_personas);
    const custom = customEntries.length
      ? customEntries
          .map(
            ([k, v]) =>
              `  ▸ ${k} - ${v.name} (${v.instruction.substring(0, 40)}${v.instruction.length > 40 ? "..." : ""})`,
          )
          .join("\n")
      : "  ▸ (belum ada custom persona)";
    let txt = `🤖 *DaғTar Persona*\n\n`;
    txt += `*ʙᴀᴡᴀᴀɴ:*\n${builtIn}\n\n`;
    txt += `*ᴄᴜꜱᴛᴏᴍ:*\n${custom}\n\n`;
    txt += `*ɢʟᴏʙᴀʟ:* ${db.db.data.autoai_global.enabled ? "✅ Aktif" : "❌ Nonaktif"}\n\n`;
    txt += `.autoai on --novamode=<key>\n`;
    txt += `.autoai tambahpersona nama | logic\n`;
    txt += `.autoai hapuspersona nama\n`;
    txt += `.autoai global on/off`;
    return await m.reply(claraWrap("autoai", txt));
  }

  if (subcmd === "global") {
    if (!m.isOwner) return m.reply(novaError("AutoAI Global", "Hanya owner yang bisa toggle global!"));
    const globalMode = (args[1] || "").toLowerCase();
    if (!["on", "off"].includes(globalMode))
      return m.reply(
        novaNoInput("AutoAI Global", `Gunakan 'on' atau 'off'. Status global saat ini: ${db.db.data.autoai_global.enabled ? "✅ Aktif" : "❌ Nonaktif"}`, `${m.prefix || "."}autoai global on`)
      );
    if (globalMode === "on") {
      const modeMatch = fullArgs.match(/--novamode=(\w+)/i);
      const typeMatch = fullArgs.match(/--type=(text|voice)/i);
      const aimodeMatch = fullArgs.match(/--mode=(onlychat|assistant)/i);
      const logicMatch = fullArgs.match(
        /--logic=(.+?)(?=\s+--(?:novamode|type|logic|mode)|$)/i,
      );
      const charKey = modeMatch ? modeMatch[1].toLowerCase() : null;
      const responseType = typeMatch ? typeMatch[1].toLowerCase() : "text";
      const aiMode = aimodeMatch ? aimodeMatch[1].toLowerCase() : "assistant";
      const customLogic = logicMatch ? logicMatch[1].trim() : null;

      let instruction = "";
      let characterName = "Global";
      let character = "global";

      if (charKey === "custom" && customLogic) {
        instruction = customLogic;
        character = "custom";
        characterName = "Custom";
      } else if (charKey && characters[charKey]) {
        instruction = characters[charKey].instruction;
        character = charKey;
        characterName = characters[charKey].name;
      } else if (charKey && db.db.data.autoai_personas[charKey]) {
        instruction = db.db.data.autoai_personas[charKey].instruction;
        character = charKey;
        characterName = db.db.data.autoai_personas[charKey].name;
      } else if (!charKey) {
        const existingGlobal = db.db.data.autoai_global;
        if (existingGlobal.instruction) {
          instruction = existingGlobal.instruction;
          character = existingGlobal.character || "global";
          characterName = existingGlobal.characterName || "Global";
        } else {
          return m.reply(
            novaError("AutoAI Global", "Belum ada persona global yang diset! Ketik: .autoai global on --novamode=furina")
          );
        }
      } else {
        const charList = [
          ...Object.keys(characters),
          ...Object.keys(db.db.data.autoai_personas),
          "custom",
        ].join(", ");
        return m.reply(novaError("AutoAI Global", `Karakter tidak valid! Tersedia: ${charList}`));
      }

      db.db.data.autoai_global = {
        enabled: true,
        character,
        characterName,
        instruction,
        responseType,
        mode: aiMode,
      };
      db.save();
      return m.reply(
        `🌐 *Auto Ai Global DiaktiғKan*\n\n` +
          `╭──「 *InғO* 」\n` +
          `│ 🎭 Karakter: *${characterName}*\n` +
          `│ 📢 Response: *${responseType === "voice" ? "🎤 Voice Note" : "💬 Text"}*\n` +
          `╰┈┈┈┈┈┈┈┈\n\n` +
          `ℹ️ AutoAI aktif di seluruh grup\n` +
          `ℹ️ Grup yang sudah punya config tetap pakai config sendiri\n` +
          `ℹ️ Ketik *.autoai global off* untuk menonaktifkan`,
      );
    } else {
      db.db.data.autoai_global.enabled = false;
      db.save();
      return m.reply(
        `🌐 *Auto Ai Global DinonaktiғKan*\n\nAutoAI hanya aktif di grup yang sudah di-set`,
      );
    }
  }

  const mode = subcmd;
  const modeMatch = fullArgs.match(/--novamode=(\w+)/i);
  const typeMatch = fullArgs.match(/--type=(text|voice)/i);
  const aimodeMatch = fullArgs.match(/--mode=(onlychat|assistant)/i);
  const logicMatch = fullArgs.match(
    /--logic=(.+?)(?=\s+--(?:novamode|type|logic|mode)|$)/i,
  );
  const charKey = modeMatch ? modeMatch[1].toLowerCase() : null;
  const responseType = typeMatch ? typeMatch[1].toLowerCase() : "text";
  const aiMode = aimodeMatch ? aimodeMatch[1].toLowerCase() : "assistant";
  const customLogic = logicMatch ? logicMatch[1].trim() : null;

  if (!mode || !["on", "off"].includes(mode)) {
    return await m.reply(novaGuide(
      "AutoAI Usage",
      "Mengaktifkan/menonaktifkan auto AI response grup",
      `${m.prefix || "."}autoai on --novamode=furina --type=voice\n${m.prefix || "."}autoai off\n${m.prefix || "."}autoai listpersona`
    ));
  }

  if (mode === "off") {
    db.db.data.autoai[m.chat] = { enabled: false };
    db.save();
    const globalStatus = db.db.data.autoai_global?.enabled
      ? `\n\nℹ️ Global masih aktif, tapi grup ini opted-out\nℹ️ Ketik *.autoai global off* untuk matikan global`
      : "";
    return m.reply(
      `🤖 *Auto Ai DinonaktiғKan*\n\nAuto AI untuk grup ini telah dimatikan\nSemua command kembali aktif${globalStatus}`,
    );
  }

  if (!charKey) {
    const charList = [
      ...Object.keys(characters),
      ...Object.keys(db.db.data.autoai_personas),
      "custom",
    ].join(", ");
    return m.reply(
      novaError("AutoAI", `Karakter tidak valid! Karakter tersedia: ${charList}`)
    );
  }

  if (charKey === "custom") {
    if (!customLogic) {
      return m.reply(
        novaNoInput("AutoAI Custom", "Mode custom membutuhkan --logic!", `${m.prefix || "."}autoai on --novamode=custom --logic=kamu adalah nexa ai`)
      );
    }
    db.db.data.autoai[m.chat] = {
      enabled: true,
      character: "custom",
      characterName: "Custom",
      instruction: customLogic,
      responseType: responseType,
      mode: aiMode,
      enableCommands: false,
      sessions: {},
      activatedBy: m.sender,
      activatedAt: new Date().toISOString(),
    };
    db.save();
    let txt = `🤖 *Auto Ai DiaktiғKan*\n\n`;
    txt += `╭──「 *InғO* 」\n`;
    txt += `│ 🎭 Karakter: *ᴄᴜꜱᴛᴏᴍ*\n`;
    txt += `│ 🧠 Logic: ${customLogic.substring(0, 100)}${customLogic.length > 100 ? "..." : ""}\n`;
    txt += `│ 📢 Response: *${responseType === "voice" ? "🎤 Voice Note" : "💬 Text"}*\n`;
    txt += `│ 👤 Diaktifkan: @${m.sender.split("@")[0]}\n`;
    txt += `╰┈┈┈┈┈┈┈┈\n\n`;
    txt += `ℹ️ Semua command (kecuali owner) dinonaktifkan\n`;
    txt += `ℹ️ Bot respond ketika di-reply atau di-tag\n`;
    txt +=
      responseType === "voice" ? `ℹ️ Response dalam bentuk voice note\n` : "";
    txt += `ℹ️ Ketik *.autoai off* untuk menonaktifkan`;
    return m.reply(txt, { mentions: [m.sender] });
  }

  const customPersona = db.db.data.autoai_personas[charKey];
  if (customPersona) {
    db.db.data.autoai[m.chat] = {
      enabled: true,
      character: charKey,
      characterName: customPersona.name,
      instruction: customPersona.instruction,
      responseType: responseType,
      mode: aiMode,
      enableCommands: false,
      sessions: {},
      activatedBy: m.sender,
      activatedAt: new Date().toISOString(),
    };
    db.save();
    let txt = `🤖 *Auto Ai DiaktiғKan*\n\n`;
    txt += `╭──「 *InғO* 」\n`;
    txt += `│ 🎭 Karakter: *${customPersona.name}* (custom)\n`;
    txt += `│ 📢 Response: *${responseType === "voice" ? "🎤 Voice Note" : "💬 Text"}*\n`;
    txt += `│ 👤 Diaktifkan: @${m.sender.split("@")[0]}\n`;
    txt += `╰┈┈┈┈┈┈┈┈\n\n`;
    txt += `ℹ️ Semua command (kecuali owner) dinonaktifkan\n`;
    txt += `ℹ️ Bot respond ketika di-reply atau di-tag\n`;
    txt +=
      responseType === "voice" ? `ℹ️ Response dalam bentuk voice note\n` : "";
    txt += `ℹ️ Ketik *.autoai off* untuk menonaktifkan`;
    return m.reply(txt, { mentions: [m.sender] });
  }

  if (!characters[charKey]) {
    const charList = [
      ...Object.keys(characters),
      ...Object.keys(db.db.data.autoai_personas),
      "custom",
    ].join(", ");
    return m.reply(
      novaError("AutoAI", `Karakter tidak valid! Karakter tersedia: ${charList}`)
    );
  }

  db.db.data.autoai[m.chat] = {
    enabled: true,
    character: charKey,
    characterName: characters[charKey].name,
    instruction: characters[charKey].instruction,
    responseType: responseType,
    mode: aiMode,
    enableCommands: false,
    sessions: {},
    activatedBy: m.sender,
    activatedAt: new Date().toISOString(),
  };
  db.save();

  let txt = `🤖 *Auto Ai DiaktiғKan*\n\n`;
  txt += `╭──「 *InғO* 」\n`;
  txt += `│ 🎭 Karakter: *${characters[charKey].name}*\n`;
  txt += `│ 📢 Response: *${responseType === "voice" ? "🎤 Voice Note" : "💬 Text"}*\n`;
  txt += `│ 👤 Diaktifkan: @${m.sender.split("@")[0]}\n`;
  txt += `╰┈┈┈┈┈┈┈┈\n\n`;
  txt += `ℹ️ Semua command (kecuali owner) dinonaktifkan\n`;
  txt += `ℹ️ Bot respond ketika di-reply atau di-tag\n`;
  txt +=
    responseType === "voice" ? `ℹ️ Response dalam bentuk voice note\n` : "";
  txt += `ℹ️ Ketik *.autoai off* untuk menonaktifkan`;

  await m.reply(txt, { mentions: [m.sender] });
}

async function generateVoiceResponse(text, sock, chatId, quotedMsg) {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    const mp3Path = path.join(tempDir, `tts_${Date.now()}.mp3`);
    
    const apiUrl = `https://firefly.maiku.my.id/api/crikk?apikey=${config.APIkey.firefly}&text=${encodeURIComponent(text)}&voice=id-ID-ArdiNeural`;
    const response = await axios.get(apiUrl);
    
    if (!response.data?.status || !response.data?.data?.audio) {
      throw new Error("Gagal generate audio dari API Firefly");
    }
    
    const audioRes = await axios.get(response.data.data.audio, {
      responseType: "arraybuffer",
      timeout: 30000
    });
    
    fs.writeFileSync(mp3Path, Buffer.from(audioRes.data));

    const oggPath = await convertToOggOpus(mp3Path);

    if (oggPath && fs.existsSync(oggPath)) {
      const audioBuffer = fs.readFileSync(oggPath);

      await sock.sendMessage(
        chatId,
        {
          audio: audioBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        },
        { quoted: quotedMsg },
      );

      fs.unlinkSync(mp3Path);
      fs.unlinkSync(oggPath);

      return true;
    } else {
      const audioBuffer = fs.readFileSync(mp3Path);

      await sock.sendMessage(
        chatId,
        {
          audio: audioBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        },
        { quoted: quotedMsg },
      );

      fs.unlinkSync(mp3Path);

      return true;
    }
  } catch (e) {
    console.log("[AutoAI Voice] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, characters, generateVoiceResponse };
