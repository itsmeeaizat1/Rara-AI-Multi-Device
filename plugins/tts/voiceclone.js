// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Voice Clone — simpan sample suara, generate TTS dengan voice hasil clone
// Primary: Fish Audio API (real voice cloning, free 10K credits/month)
// Fallback: edge-tts + FFmpeg pitch/formant shift (tanpa API key)
import { getApiKeys } from "../../src/lib/config/env-loader.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const CLONE_DIR = path.join(process.cwd(), "database", "voice-clone");
const STATE_FILE = path.join(CLONE_DIR, "state.json");
const FISH_API_BASE = "https://api.fish.audio";

const BASE_VOICES = {
  "ardi":   { name: "Ardi (Pria ID, hangat)",    voice: "id-ID-ArdiNeural" },
  "gadis":  { name: "Gadis (Wanita ID, ceria)",  voice: "id-ID-GadisNeural" },
  "ava":    { name: "Ava (Wanita EN, modern)",  voice: "en-US-AvaNeural" },
  "andrew": { name: "Andrew (Pria EN, hangat)", voice: "en-US-AndrewNeural" },
};

const pluginConfig = {
  name: "voiceclone",
  alias: ["voiceclone"],
  category: "tts",
  description: "Voice Clone — simpan sample suara & generate TTS (Fish Audio API + edge-tts fallback)",
  usage: ".voiceclone set <nama> (reply VN) | .voiceclone <teks> | .voiceclone status | .voiceclone list | .voiceclone use <nama> | .voiceclone del <nama> | .voiceclone apikey <key>",
  example: ".voiceclone set owner\n.voiceclone Halo, ini suara hasil clone\n.voiceclone apikey abc123",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// === State management ===
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) { console.error("[voiceclone] loadState:", e.message); }
  return { activeProfile: null, profiles: {}, baseVoice: "gadis", fishApiKey: "" };
}

function saveState(state) {
  try {
    if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) { console.error("[voiceclone] saveState:", e.message); }
}

function getFishKey() {
  const state = loadState();
  if (state.fishApiKey) return state.fishApiKey;
  // Cek dari apikeys.json
  try {
    const keys = getApiKeys();
    return keys.fishaudio || "";
  } catch { return ""; }
}

// === Baileys download helper ===
let _downloadFn = null;
async function downloadContentFromMessage(msg, type) {
  if (!_downloadFn) {
    const baileys = await import("@whiskeysockets/baileys");
    _downloadFn = baileys.downloadContentFromMessage;
  }
  return _downloadFn(msg, type);
}

async function downloadAudio(quoted, outPath) {
  const audioMsg = quoted.message?.audioMessage || quoted.message?.pttMessage;
  if (!audioMsg) throw new Error("Bukan voice note");
  const stream = await downloadContentFromMessage(audioMsg, "audio");
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

// === Fish Audio API: Create voice model ===
async function fishCreateVoice(samplePath, title, apiKey) {
  const FormData = (await import("form-data")).default;
  const axios = (await import("axios")).default;

  const form = new FormData();
  form.append("type", "tts");
  form.append("title", title);
  form.append("description", "Voice clone dari WhatsApp bot Nova AI");
  form.append("visibility", "private");
  form.append("train_mode", "fast");
  form.append("voices", fs.createReadStream(samplePath), {
    filename: "sample.ogg",
    contentType: "audio/ogg",
  });

  const res = await axios.post(`${FISH_API_BASE}/model`, form, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data;
}

// === Fish Audio API: Generate TTS ===
async function fishTTS(text, voiceId, apiKey, outPath) {
  const axios = (await import("axios")).default;

  const res = await axios.post(
    `${FISH_API_BASE}/v1/tts`,
    { text, reference_id: voiceId },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: "s2-pro",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  fs.writeFileSync(outPath, res.data);
  return outPath;
}

// === Fish Audio API: Instant clone (inline reference) ===
async function fishInstantTTS(text, samplePath, apiKey, outPath) {
  const FormData = (await import("form-data")).default;
  const axios = (await import("axios")).default;

  const form = new FormData();
  form.append("text", text);
  form.append("model", "s2-pro");
  form.append("references", fs.createReadStream(samplePath), {
    filename: "reference.ogg",
    contentType: "audio/ogg",
  });

  const res = await axios.post(`${FISH_API_BASE}/v1/tts`, form, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    responseType: "arraybuffer",
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  fs.writeFileSync(outPath, res.data);
  return outPath;
}

// === Edge-TTS fallback ===
async function generateEdgeTTS(text, voiceId, outPath) {
  const voice = BASE_VOICES[voiceId] || BASE_VOICES["gadis"];
  const escaped = text.replace(/"/g, '\\"').replace(/`/g, "\\`");
  const cmd = `edge-tts --voice "${voice.voice}" --text "${escaped}" --write-media "${outPath}"`;
  await execAsync(cmd, { timeout: 30000 });
  return outPath;
}

// === FFmpeg pitch shift (fallback mode) ===
async function analyzePitch(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries stream=duration -of csv=p=0 "${filePath}"`,
      { timeout: 10000 }
    );
    const dur = parseFloat(stdout.trim()) || 3;
    let pitchShift = 0;
    if (dur < 2) pitchShift = 1;
    else if (dur < 4) pitchShift = 0;
    else pitchShift = -1;
    return { duration: dur, pitchShift };
  } catch {
    return { duration: 3, pitchShift: 0 };
  }
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
  const cmd = `ffmpeg -y -i "${inputPath}" -af "${filters.join(",")}" -c:a libopus -b:a 64k "${outputPath}"`;
  await execAsync(cmd, { timeout: 30000 });
  return outputPath;
}

// === Main handler ===
async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = m.text?.trim() || "";
    const args = text.split(/\s+/);
    const action = args[0]?.toLowerCase();
    const state = loadState();
    const apiKey = getFishKey();
    const useFishAudio = !!apiKey;

    // === SET API KEY ===
    if (action === "apikey" || action === "key") {
      const key = args[1];
      if (!key) {
        return m.reply(claraWrap("Voice Clone", [
          "Set Fish Audio API Key untuk voice cloning real.",
          "",
          "Dapatkan API key gratis di: https://fish.audio/app/api-keys/",
          "Free tier: 10.000 credits/bulan",
          "",
          `Cara pakai: ${prefix}voiceclone apikey <key>`,
        ].join("\n")));
      }
      state.fishApiKey = key;
      saveState(state);
      // Juga save ke src/lib/apikey/apikeys.json
      try {
        const keysPath = path.join(process.cwd(), "src/lib/apikey/apikeys.json");
        const keys = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
        keys.fishaudio = key;
        fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
      } catch {}
      return m.reply(claraWrap("Voice Clone", [
        "Fish Audio API Key tersimpan!",
        "",
        "Mode: Real Voice Cloning (Fish Audio S2.1 Pro)",
        "Free tier: 10.000 credits/bulan",
        "",
        `Sekarang ketik: ${prefix}voiceclone set <nama> (reply VN)`,
        "Untuk simpan sample suara ke Fish Audio",
      ].join("\n")));
    }

    // === SET: simpan sample VN ===
    if (action === "set") {
      const quoted = m.quoted;
      if (!quoted || !(quoted.message?.audioMessage || quoted.message?.pttMessage)) {
        return m.reply(claraWrap("Voice Clone", [
          "Simpan sample suara untuk cloning.",
          "",
          "Cara Pakai:",
          `1. Record voice note (10 detik - 2 menit)`,
          `2. Reply VN tersebut dengan:`,
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
        await downloadAudio(quoted, samplePath);
      } catch (e) {
        return m.reply(claraWrap("Voice Clone", `Gagal download VN: ${e.message}`));
      }

      // Mode Fish Audio: upload ke Fish Audio buat create voice model
      if (useFishAudio) {
        try {
          await m.react("🕒");
          const voiceId = result._id || result.id;
          const voiceState = result.state || "trained";

          state.profiles[profileName] = {
            name: profileName,
            samplePath,
            fishVoiceId: voiceId,
            fishState: voiceState,
            createdAt: new Date().toISOString(),
            mode: "fish_audio",
          };
          state.activeProfile = profileName;
          saveState(state);

          return m.reply(claraWrap("Voice Clone", [
            `Profil tersimpan: *${profileName}*`,
            `Mode: Fish Audio (Real Voice Clone)`,
            `Voice ID: ${voiceId}`,
            `Status: ${voiceState}`,
            "",
            `Ketik: ${prefix}voiceclone <teks> untuk generate suara`,
          ].join("\n")));
        } catch (e) {
          console.error("[voiceclone] Fish Audio create error:", e.message);
          // Fallback ke edge-tts mode
          const analysis = await analyzePitch(samplePath);
          state.profiles[profileName] = {
            name: profileName,
            samplePath,
            analysis,
            createdAt: new Date().toISOString(),
            mode: "edge_tts",
          };
          state.activeProfile = profileName;
          saveState(state);
          return m.reply(claraWrap("Voice Clone", [
            `Fish Audio gagal: ${e.message}`,
            `Fallback ke mode edge-tts (pitch shift)`,
            `Profil tersimpan: *${profileName}*`,
            `Ketik: ${prefix}voiceclone <teks>`,
          ].join("\n")));
        }
      }

      // Mode edge-tts fallback
      const analysis = await analyzePitch(samplePath);
      state.profiles[profileName] = {
        name: profileName,
        samplePath,
        analysis,
        createdAt: new Date().toISOString(),
        mode: "edge_tts",
      };
      state.activeProfile = profileName;
      saveState(state);

      return m.reply(claraWrap("Voice Clone", [
        `Profil tersimpan: *${profileName}*`,
        `Mode: edge-tts (pitch shift fallback)`,
        `Pitch shift: ${analysis.pitchShift > 0 ? "+" : ""}${analysis.pitchShift} semitone`,
        "",
        `Ketik: ${prefix}voiceclone <teks> untuk generate suara`,
        "",
        "Tip: Set Fish Audio API key untuk voice cloning real:",
        `${prefix}voiceclone apikey <key>`,
      ].join("\n")));
    }

    // === STATUS ===
    if (action === "status") {
      const profiles = Object.keys(state.profiles);
      const active = state.activeProfile;
      const mode = useFishAudio ? "Fish Audio (Real Clone)" : "edge-tts (Pitch Shift)";
      let txt = `Voice Clone Status\n\n`;
      txt += `Mode: ${mode}\n`;
      txt += `API Key: ${useFishAudio ? "Ter-set" : "Tidak ada"}\n`;
      txt += `Profil aktif: ${active || "Tidak ada"}\n`;
      txt += `Base voice: ${BASE_VOICES[state.baseVoice || "gadis"].name}\n`;
      txt += `Total profil: ${profiles.length}\n\n`;
      if (profiles.length > 0) {
        txt += `Daftar profil:\n`;
        for (const p of profiles) {
          const prof = state.profiles[p];
          const profMode = prof.mode === "fish_audio" ? "Fish Audio" : "edge-tts";
          txt += `  - ${p}${p === active ? " (aktif)" : ""} [${profMode}]\n`;
        }
      }
      if (!useFishAudio) {
        txt += `\nSet API key Fish Audio untuk real clone:\n${prefix}voiceclone apikey <key>`;
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    // === LIST ===
    if (action === "list") {
      const profiles = Object.keys(state.profiles);
      if (profiles.length === 0) {
        return m.reply(claraWrap("Voice Clone", `Belum ada profil tersimpan.\n\nKetik: ${prefix}voiceclone set <nama> (reply VN)`));
      }
      let txt = `Daftar Voice Profile\n\n`;
      for (const p of profiles) {
        const prof = state.profiles[p];
        const mark = p === state.activeProfile ? " [AKTIF]" : "";
        const mode = prof.mode === "fish_audio" ? "Fish Audio" : "edge-tts";
        txt += `Profil: ${p}${mark}\n`;
        txt += `Mode: ${mode}\n`;
        if (prof.fishVoiceId) txt += `Voice ID: ${prof.fishVoiceId}\n`;
        if (prof.analysis) txt += `Pitch: ${prof.analysis.pitchShift > 0 ? "+" : ""}${prof.analysis.pitchShift}\n`;
        txt += `\n`;
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    // === USE: pilih profil aktif ===
    if (action === "use") {
      const name = args[1];
      if (!name || !state.profiles[name]) {
        return m.reply(claraWrap("Voice Clone", `Profil tidak ditemukan: ${name || "(kosong)"}\n\nKetik: ${prefix}voiceclone list`));
      }
      state.activeProfile = name;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", `Profil aktif: *${name}*\n\nKetik: ${prefix}voiceclone <teks>`));
    }

    // === DEL: hapus profil ===
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

    // === VOICE: pilih base voice (untuk edge-tts mode) ===
    if (action === "voice") {
      const voiceId = args[1]?.toLowerCase();
      if (!voiceId || !BASE_VOICES[voiceId]) {
        let txt = "Pilih base voice neural (untuk mode edge-tts):\n\n";
        for (const [id, v] of Object.entries(BASE_VOICES)) {
          txt += `  ${id} - ${v.name}\n`;
        }
        txt += `\n💡 *Contoh:* ${prefix}voiceclone voice ardi`;
        return m.reply(claraWrap("Voice Clone", txt));
      }
      state.baseVoice = voiceId;
      saveState(state);
      return m.reply(claraWrap("Voice Clone", `Base voice: *${BASE_VOICES[voiceId].name}*\n\nKetik: ${prefix}voiceclone <teks>`));
    }

    // === HELP ===
    if (!action || action === "help") {
      const mode = useFishAudio ? "Fish Audio (Real Clone)" : "edge-tts (Pitch Shift)";
      let txt = `Voice Clone System\n\n`;
      txt += `Mode: ${mode}\n`;
      txt += `API Key: ${useFishAudio ? "Ter-set" : "Tidak ada"}\n`;
      txt += `Profil aktif: ${state.activeProfile || "Tidak ada"}\n\n`;
      txt += `Command:\n`;
      txt += `${prefix}voiceclone set <nama> (reply VN) - simpan sample\n`;
      txt += `${prefix}voiceclone <teks> - generate speech\n`;
      txt += `${prefix}voiceclone apikey <key> - set Fish Audio API key\n`;
      txt += `${prefix}voiceclone voice <id> - pilih base voice (edge-tts)\n`;
      txt += `${prefix}voiceclone use <nama> - ganti profil aktif\n`;
      txt += `${prefix}voiceclone list - lihat semua profil\n`;
      txt += `${prefix}voiceclone del <nama> - hapus profil\n`;
      txt += `${prefix}voiceclone status - cek status\n\n`;
      if (!useFishAudio) {
        txt += `Untuk voice cloning real (bukan pitch shift):\n`;
        txt += `1. Dapatkan API key: https://fish.audio/app/api-keys/\n`;
        txt += `2. Set: ${prefix}voiceclone apikey <key>\n`;
        txt += `3. Simpan sample: ${prefix}voiceclone set <nama>\n`;
      }
      return m.reply(claraWrap("Voice Clone", txt));
    }

    // === GENERATE SPEECH ===
    const speechText = text;
    if (!speechText || speechText.length < 2) {
      return m.reply(claraWrap("Voice Clone", `Teks tidak boleh kosong!\n\n💡 *Contoh:* ${prefix}voiceclone Halo semuanya`));
    }
    if (speechText.length > 500) {
      return m.reply(claraWrap("Voice Clone", "Teks maksimal 500 karakter."));
    }

    const profile = state.activeProfile ? state.profiles[state.activeProfile] : null;
    if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });

    let audioPath = null;

    // Mode 1: Fish Audio dengan voice model ID
    if (useFishAudio && profile?.fishVoiceId) {
      audioPath = path.join(CLONE_DIR, `fish_${Date.now()}.mp3`);
      try {
        await fishTTS(speechText, profile.fishVoiceId, apiKey, audioPath);
      } catch (e) {
        console.error("[voiceclone] Fish TTS error:", e.message);
        // Coba instant clone (inline reference)
        if (profile.samplePath && fs.existsSync(profile.samplePath)) {
          try {
            audioPath = path.join(CLONE_DIR, `fish_inst_${Date.now()}.mp3`);
            await fishInstantTTS(speechText, profile.samplePath, apiKey, audioPath);
          } catch (e2) {
            audioPath = null; // akan fallback ke edge-tts
          }
        } else {
          audioPath = null;
        }
      }
    }

    // Mode 2: Fish Audio instant clone (tanpa voice model ID, pakai sample langsung)
    if (!audioPath && useFishAudio && profile?.samplePath && fs.existsSync(profile.samplePath)) {
      audioPath = path.join(CLONE_DIR, `fish_inst_${Date.now()}.mp3`);
      try {
        await fishInstantTTS(speechText, profile.samplePath, apiKey, audioPath);
      } catch (e) {
        console.error("[voiceclone] Fish instant TTS error:", e.message);
        audioPath = null;
      }
    }

    // Mode 3: Fallback edge-tts + pitch shift
    if (!audioPath) {
      const voiceId = state.baseVoice || "gadis";
      const ttsPath = path.join(CLONE_DIR, `tts_${Date.now()}.mp3`);
      try {
        await generateEdgeTTS(speechText, voiceId, ttsPath);
      } catch (e) {
        return m.reply(claraWrap("Voice Clone", `Gagal generate TTS: ${e.message}\n\nPastikan edge-tts terinstall: pip install edge-tts`));
      }

      audioPath = path.join(CLONE_DIR, `clone_${Date.now()}.ogg`);
      try {
        if (profile?.analysis) {
          await applyVoiceProfile(ttsPath, audioPath, profile.analysis);
        } else {
          await execAsync(`ffmpeg -y -i "${ttsPath}" -c:a libopus -b:a 64k "${audioPath}"`, { timeout: 15000 });
        }
      } catch {
        try {
          await execAsync(`ffmpeg -y -i "${ttsPath}" -c:a libopus -b:a 64k "${audioPath}"`, { timeout: 15000 });
        } catch (e2) {
          return m.reply(claraWrap("Voice Clone", `Gagal convert audio: ${e2.message}`));
        }
      }
      try { fs.unlinkSync(ttsPath); } catch {}
    }

    // Kirim VN
    try {
      const audioBuf = fs.readFileSync(audioPath);
      const vnBuf = await toVoiceNote(audioBuf);
      await sock.sendMessage(m.key.remoteJid, {
        audio: vnBuf,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      });

      const mode = profile?.mode === "fish_audio" ? "Fish Audio" : "edge-tts";
      let info = `Voice Clone Berhasil\n\n`;
      info += `Profil: ${state.activeProfile || "default"}\n`;
      info += `Mode: ${mode}\n`;
      info += `Teks: "${speechText.slice(0, 60)}${speechText.length > 60 ? "..." : ""}"`;
      await m.react("🐣");
      await m.reply(claraWrap("Voice Clone", info));
    } catch (e) {
      return m.reply(claraWrap("Voice Clone", `Gagal kirim VN: ${e.message}`));
    }

    // Cleanup
    try { fs.unlinkSync(audioPath); } catch {}

  } catch (e) {
    console.error("[voiceclone] Error:", e.message);
    return m.reply(claraWrap("Voice Clone", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
