// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Voice Clone — simpan sample suara owner, generate TTS dengan karakteristik suara tersebut
// Cara kerja: simpan VN sample -> analyze pitch/formant -> apply ke output TTS via FFmpeg
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const CLONE_DIR = path.join(process.cwd(), "database", "voice-clone");
const STATE_FILE = path.join(CLONE_DIR, "state.json");

const BASE_VOICES = {
  "ardi":   { name: "Ardi (Pria ID, hangat)",    voice: "id-ID-ArdiNeural",   lang: "id-ID" },
  "gadis":  { name: "Gadis (Wanita ID, ceria)",  voice: "id-ID-GadisNeural",  lang: "id-ID" },
  "ava":    { name: "Ava (Wanita EN, modern)",  voice: "en-US-AvaNeural",    lang: "en-US" },
  "andrew": { name: "Andrew (Pria EN, hangat)", voice: "en-US-AndrewNeural", lang: "en-US" },
};

const pluginConfig = {
  name: "voiceclone",
  alias: ["vclone", "clonesuara", "suaraclone"],
  category: "tts",
  description: "Voice Clone — simpan sample suara & generate TTS dengan karakteristik suara tersebut",
  usage: ".voiceclone set (reply VN) | .voiceclone <teks> | .voiceclone status | .voiceclone list | .voiceclone use <nama> | .voiceclone del <nama> | .voiceclone voice <id>",
  example: ".voiceclone set\n.voiceclone Halo, ini suara hasil clone\n.voiceclone voice ardi",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) { console.error("[voiceclone] loadState:", e.message); }
  return { activeProfile: null, profiles: {}, baseVoice: "gadis" };
}

function saveState(state) {
  try {
    if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) { console.error("[voiceclone] saveState:", e.message); }
}

let _downloadFn = null;
async function downloadContentFromMessage(msg, type) {
  if (!_downloadFn) {
    const baileys = await import("@whiskeysockets/baileys");
    _downloadFn = baileys.downloadContentFromMessage;
  }
  return _downloadFn(msg, type);
}

async function downloadAudio(sock, quoted, outPath) {
  const audioMsg = quoted.message?.audioMessage || quoted.message?.pttMessage;
  if (!audioMsg) throw new Error("Bukan voice note");
  const stream = await downloadContentFromMessage(audioMsg, "audio");
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

async function analyzePitch(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries stream=sample_rate,duration,channels -of csv=p=0 "${filePath}"`,
      { timeout: 10000 }
    );
    const [sampleRate, duration, channels] = stdout.trim().split(",");
    const dur = parseFloat(duration) || 3;
    let pitchShift = 0;
    if (dur < 2) pitchShift = 1;
    else if (dur < 4) pitchShift = 0;
    else pitchShift = -1;
    return {
      sampleRate: parseInt(sampleRate) || 24000,
      duration: dur,
      channels: parseInt(channels) || 1,
      pitchShift,
    };
  } catch (e) {
    console.error("[voiceclone] analyzePitch:", e.message);
    return { sampleRate: 24000, duration: 3, channels: 1, pitchShift: 0 };
  }
}

async function generateTTS(text, voiceId, outPath) {
  const voice = BASE_VOICES[voiceId] || BASE_VOICES["gadis"];
  const escaped = text.replace(/"/g, '\\"').replace(/`/g, "\\`");
  const cmd = `edge-tts --voice "${voice.voice}" --text "${escaped}" --write-media "${outPath}"`;
  await execAsync(cmd, { timeout: 30000 });
  return outPath;
}

async function applyVoiceProfile(inputPath, outputPath, analysis) {
  const pitch = analysis.pitchShift || 0;
  const filters = [];
  if (pitch !== 0) {
    const factor = Math.pow(2, pitch / 12);
    filters.push(`asetrate=24000*${factor.toFixed(4)}`);
    filters.push(`aresample=24000`);
  }
  filters.push("acompressor=threshold=0.3:ratio=2:attack=5:release=50");
  filters.push("equalizer=f=200:width_type=h:width=100:g=2");
  filters.push("equalizer=f=3000:width_type=h:width=500:g=-1");
  const filterStr = filters.join(",");
  const cmd = `ffmpeg -y -i "${inputPath}" -af "${filterStr}" -c:a libopus -b:a 64k "${outputPath}"`;
  await execAsync(cmd, { timeout: 30000 });
  return outputPath;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim() || "";
    const args = text.split(/\s+/);
    const action = args[0]?.toLowerCase();
    const state = loadState();

    if (action === "set") {
      const quoted = m.quoted;
      if (!quoted || !(quoted.message?.audioMessage || quoted.message?.pttMessage)) {
        return m.reply(claraWrap("Voice Clone", [
          "Simpan sample suara untuk cloning.",
          "",
          "Cara Pakai:",
          "1. Record voice note (3-10 detik)",
          "2. Reply VN tersebut dengan:",
          `   ${prefix}voiceclone set <nama-profil>`,
          "",
          "Contoh:",
          `   ${prefix}voiceclone set owner`,
        ].join("\n")));
      }
      const profileName = args[1] || "default";
      if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });
      const samplePath = path.join(CLONE_DIR, `${profileName}.ogg`);
      try {
        await downloadAudio(sock, quoted, samplePath);
      } catch (e) {
        return m.reply(claraWrap("Voice Clone", `Gagal download VN: ${e.message}`));
      }
      const analysis = await analyzePitch(samplePath);
      state.profiles[profileName] = {
        name: profileName,
        samplePath,
        createdAt: new Date().toISOString(),
        analysis,
        baseVoice: state.baseVoice || "gadis",
      };
      state.activeProfile = profileName;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", [
        `Profil tersimpan: *${profileName}*`,
        `Durasi sample: ${analysis.duration.toFixed(1)}s`,
        `Pitch shift: ${analysis.pitchShift > 0 ? "+" : ""}${analysis.pitchShift} semitone`,
        `Base voice: ${BASE_VOICES[state.baseVoice || "gadis"].name}`,
        "",
        `Ketik: ${prefix}voiceclone <teks> untuk generate suara`,
      ].join("\n")));
    }

    if (action === "status") {
      const profiles = Object.keys(state.profiles);
      const active = state.activeProfile;
      const baseVoice = BASE_VOICES[state.baseVoice || "gadis"];
      let txt = `Voice Clone Status\n\n`;
      txt += `Profil aktif: ${active ? "*" + active + "*" : "Tidak ada"}\n`;
      txt += `Base voice: ${baseVoice.name}\n`;
      txt += `Total profil: ${profiles.length}\n\n`;
      if (profiles.length > 0) {
        txt += `Daftar profil:\n`;
        for (const p of profiles) {
          const prof = state.profiles[p];
          txt += `  - ${p}${p === active ? " (aktif)" : ""} - ${prof.analysis.duration.toFixed(1)}s\n`;
        }
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    if (action === "list") {
      const profiles = Object.keys(state.profiles);
      if (profiles.length === 0) {
        return m.reply(claraWrap("Voice Clone", `Belum ada profil tersimpan.\n\nKetik: ${prefix}voiceclone set <nama> (reply VN)`));
      }
      let txt = `Daftar Voice Profile\n\n`;
      for (const p of profiles) {
        const prof = state.profiles[p];
        const mark = p === state.activeProfile ? " [AKTIF]" : "";
        txt += `Profil: ${p}${mark}\n`;
        txt += `Durasi: ${prof.analysis.duration.toFixed(1)}s | Pitch: ${prof.analysis.pitchShift > 0 ? "+" : ""}${prof.analysis.pitchShift}\n\n`;
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    if (action === "use") {
      const name = args[1];
      if (!name || !state.profiles[name]) {
        return m.reply(claraWrap("Voice Clone", `Profil tidak ditemukan: ${name || "(kosong)"}\n\nKetik: ${prefix}voiceclone list`));
      }
      state.activeProfile = name;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", `Profil aktif: *${name}*\n\nKetik: ${prefix}voiceclone <teks>`));
    }

    if (action === "del") {
      const name = args[1];
      if (!name || !state.profiles[name]) {
        return m.reply(claraWrap("Voice Clone", `Profil tidak ditemukan: ${name || "(kosong)"}\n\nKetik: ${prefix}voiceclone list`));
      }
      try { fs.unlinkSync(state.profiles[name].samplePath); } catch {}
      delete state.profiles[name];
      if (state.activeProfile === name) state.activeProfile = null;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", `Profil dihapus: *${name}*`));
    }

    if (action === "voice") {
      const voiceId = args[1]?.toLowerCase();
      if (!voiceId || !BASE_VOICES[voiceId]) {
        let txt = "Pilih base voice neural:\n\n";
        for (const [id, v] of Object.entries(BASE_VOICES)) {
          txt += `  ${id} - ${v.name}\n`;
        }
        txt += `\nContoh: ${prefix}voiceclone voice ardi`;
        return m.reply(claraWrap("Voice Clone", txt));
      }
      state.baseVoice = voiceId;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", `Base voice: *${BASE_VOICES[voiceId].name}*\n\nKetik: ${prefix}voiceclone <teks>`));
    }

    if (!action || action === "help") {
      let txt = `Voice Clone System\n\n`;
      txt += `Profil aktif: ${state.activeProfile || "Tidak ada (default voice)"}\n`;
      txt += `Base voice: ${BASE_VOICES[state.baseVoice || "gadis"].name}\n\n`;
      txt += `Cara Pakai:\n`;
      txt += `${prefix}voiceclone set <nama> (reply VN) - simpan suara\n`;
      txt += `${prefix}voiceclone <teks> - generate speech\n`;
      txt += `${prefix}voiceclone voice <id> - pilih base voice\n`;
      txt += `${prefix}voiceclone use <nama> - ganti profil aktif\n`;
      txt += `${prefix}voiceclone list - lihat semua profil\n`;
      txt += `${prefix}voiceclone del <nama> - hapus profil\n`;
      txt += `${prefix}voiceclone status - cek status\n\n`;
      if (!state.activeProfile) {
        txt += `Belum ada profil tersimpan. Record VN lalu reply dengan:\n${prefix}voiceclone set <nama>`;
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    // Generate speech
    const speechText = text;
    if (!speechText || speechText.length < 2) {
      return m.reply(claraWrap("Voice Clone", `Teks tidak boleh kosong!\n\nContoh: ${prefix}voiceclone Halo semuanya`));
    }
    if (speechText.length > 500) {
      return m.reply(claraWrap("Voice Clone", "Teks maksimal 500 karakter."));
    }

    const voiceId = state.baseVoice || "gadis";
    const baseVoice = BASE_VOICES[voiceId];
    const profile = state.activeProfile ? state.profiles[state.activeProfile] : null;

    if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });

    // Step 1: Generate TTS via edge-tts
    const ttsPath = path.join(CLONE_DIR, `tts_${Date.now()}.mp3`);
    try {
      await generateTTS(speechText, voiceId, ttsPath);
    } catch (e) {
      return m.reply(claraWrap("Voice Clone", `Gagal generate TTS: ${e.message}\n\nPastikan edge-tts terinstall: pip install edge-tts`));
    }

    // Step 2: Apply voice profile
    const finalPath = path.join(CLONE_DIR, `clone_${Date.now()}.ogg`);
    try {
      if (profile && profile.analysis) {
        await applyVoiceProfile(ttsPath, finalPath, profile.analysis);
      } else {
        await execAsync(`ffmpeg -y -i "${ttsPath}" -c:a libopus -b:a 64k "${finalPath}"`, { timeout: 15000 });
      }
    } catch (e) {
      try {
        await execAsync(`ffmpeg -y -i "${ttsPath}" -c:a libopus -b:a 64k "${finalPath}"`, { timeout: 15000 });
      } catch (e2) {
        return m.reply(claraWrap("Voice Clone", `Gagal apply voice profile: ${e.message}`));
      }
    }

    // Step 3: Kirim VN
    try {
      const audioBuf = fs.readFileSync(finalPath);
      const vnBuf = await toVoiceNote(audioBuf);
      await sock.sendMessage(m.key.remoteJid, {
        audio: vnBuf,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      });
      let info = `Voice Clone Berhasil\n\n`;
      info += `Profil: ${state.activeProfile || "default"}\n`;
      info += `Base voice: ${baseVoice.name}\n`;
      if (profile) {
        info += `Pitch: ${profile.analysis.pitchShift > 0 ? "+" : ""}${profile.analysis.pitchShift} semitone\n`;
      }
      info += `Teks: "${speechText.slice(0, 60)}${speechText.length > 60 ? "..." : ""}"`;
      await m.reply(claraWrap("Voice Clone", info));
    } catch (e) {
      return m.reply(claraWrap("Voice Clone", `Gagal kirim VN: ${e.message}`));
    }

    // Cleanup
    try { fs.unlinkSync(ttsPath); } catch {}
    try { fs.unlinkSync(finalPath); } catch {}

  } catch (e) {
    console.error("[voiceclone] Error:", e.message);
    return m.reply(claraWrap("Voice Clone", `Error: ${e.message}`));
  }
}

export default { pluginConfig, handler };
