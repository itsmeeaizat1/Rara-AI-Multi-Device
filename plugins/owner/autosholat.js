// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import * as timeHelper from "../../src/lib/rara-time.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import config from "../../config.js";
import {
  getTodaySchedule,
  extractPrayerTimes,
  searchKota,
} from "../../src/lib/rara-sholat-api.js";
import {
  REMINDER_MINUTES,
  IQAMAH_DELAY,
} from "../../src/lib/rara-sholat-scheduler.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraLine } from "../../src/lib/rara-menu-style.js";
import { initSholatScheduler, stopSholatScheduler } from "../../src/lib/rara-sholat-scheduler.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch owner) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}

function raraWrap(title, text) {
  const scMap = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  const body = Array.isArray(text) ? text.join("\n") : text;
  // Convert body to small caps tapi skip baris command (.xxx) dan preserve *bold*
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `${toSC(title)}\n\n${scBody}`;
}


const pluginConfig = {
  name: "autosholat",
  alias: ["autosholat"],
  category: "owner",
  description: "Toggle pengingat waktu sholat otomatis dengan audio adzan dan tutup grup",
  usage: ".autosholat on/off/status/kota <nama>",
  example: ".autosholat on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const AUDIO_ADZAN = "https://media.vocaroo.com/mp3/1ofLT2YUJAjQ";

async function handler(m, { sock, db }) {
  const args = m.args[0]?.toLowerCase();
  const database = getDatabase();
  
  if (!args || args === "status") {
    const status = database.setting("autoSholat") ? "Aktif ✅" : "Nonaktif ❌";
    const closeGroup = database.setting("autoSholatCloseGroup") ? "Ya ✅" : "Tidak ❌";
    const duration = database.setting("autoSholatDuration") || 5;
    const kotaSetting = database.setting("autoSholatKota") || { id: "1301", nama: "KOTA JAKARTA" };
    
    let jadwalText = "";
    try {
      const jadwalData = await getTodaySchedule(kotaSetting.id);
      const times = extractPrayerTimes(jadwalData);
      for (const [nama, waktu] of Object.entries(times)) {
        jadwalText += `- **${nama.charAt(0).toUpperCase() + nama.slice(1)}**: ${waktu}\n`;
      }
    } catch {
      jadwalText = "- Gagal memuat jadwal dari MyQuran\n";
    }

    return m.reply( `🕌 *Auto Sholat - Sistem Pengingat Waktu Beribadah*\n\n` +
      `Sistem saat ini telah diatur untuk membantu kamu dan para anggota grup mengingat waktu beribadah secara otomatis. Berikut adalah pengaturan yang sedang berjalan:\n\n` +
      `- Status Pengingat: ${status}\n` +
      `- Penutupan Grup Otomatis: ${closeGroup}\n` +
      `- Durasi Penutupan: ${duration} menit\n` +
      `- Lokasi Pengingat Saat Ini: ${kotaSetting.nama}\n\n` +
      `Jadwal Sholat Hari Ini:\n` +
      jadwalText + `\n` +
      `Panduan Pengaturan Fitur:\n` +
      `- Ketik \`${m.prefix}autosholat on\` untuk mengaktifkan sistem pengingat.\n` +
      `- Ketik \`${m.prefix}autosholat off\` untuk mematikan sistem pengingat.\n` +
      `- Ketik \`${m.prefix}autosholat close on\` atau \`off\` untuk menyalakan/mematikan fitur tutup grup otomatis.\n` +
      `- Ketik \`${m.prefix}autosholat duration <angka>\` untuk menentukan berapa lama grup akan ditutup (dalam menit).\n` +
      `- Ketik \`${m.prefix}autosholat kota <nama daerah>\` untuk menyinkronkan waktu sholat dengan daerah yang kamu pilih.\n\n` +
      `_Semua jadwal diambil secara presisi dan langsung dari pusat data MyQuran API._`, "autosholat");
  }

  if (args === "on") {
    database.setting("autoSholat", true);
    await database.save();
    // Start / re-schedule cron jobs
    try {
      initSholatScheduler(sock);
    } catch (e) {
      console.error("[autosholat] Failed to init scheduler:", e.message);
    }
    const kota = database.setting("autoSholatKota") || { nama: "KOTA JAKARTA" };
    return m.reply(
      `*Sistem Pengingat Sholat Diaktifkan*\n\n` +
      `3 layer notifikasi aktif:\n` +
      `1. Pengingat ${REMINDER_MINUTES} menit sebelum adzan\n` +
      `2. Adzan + audio saat waktu tiba\n` +
      `3. Iqamah setelah adzan\n\n` +
      `Lokasi: ${kota.nama}`
    );
  }

  if (args === "off") {
    database.setting("autoSholat", false);
    await database.save();
    // Stop all cron jobs
    try {
      stopSholatScheduler();
    } catch (e) {
      console.error("[autosholat] Failed to stop scheduler:", e.message);
    }
    return m.reply(
      `❌ *Sistem Pengingat Sholat Dinonaktifkan.*\n\n` +
      `Baiklah, aku tidak akan lagi menyiarkan jadwal sholat dan memutarkan audio adzan secara otomatis ke grup-grup.`
    );
  }

  if (args === "close") {
    const subArg = m.args[1]?.toLowerCase();
    if (subArg === "on") {
      database.setting("autoSholatCloseGroup", true);
      return m.reply(
        `🔒 *Fitur Tutup Grup Otomatis Diaktifkan!*\n\n` +
        `Saat waktu sholat tiba, aku akan secara otomatis menutup akses obrolan grup agar semuanya bisa fokus beribadah terlebih dahulu. Keren, kan?`
      );
    }
    if (subArg === "off") {
      database.setting("autoSholatCloseGroup", false);
      return m.reply(
        `🔓 *Fitur Tutup Grup Otomatis Dimatikan.*\n\n` +
        `Sekarang grup tidak akan ditutup saat azan berkumandang, sehingga obrolan bisa terus berjalan tanpa hambatan.`
      );
    }
    return m.reply(`Oh, maaf. Formatnya sedikit keliru. Silakan gunakan \`${m.prefix}autosholat close on\` atau \`${m.prefix}autosholat close off\`.`);
  }

  if (args === "duration") {
    const duration = parseInt(m.args[1]);
    if (isNaN(duration) || duration < 1 || duration > 60) {
      return m.reply(raraWrap("Autosholat", `Tolong masukkan angka antara 1 sampai 60 untuk durasi penutupan grup (dalam menit).`));
    }
    database.setting("autoSholatDuration", duration);
    return m.reply(
      `⏱️ *Durasi Penutupan Grup Telah Diperbarui!*\n\n` +
      `Nantinya, akses obrolan di grup akan dikunci selama ${duration} menit berturut-turut pada setiap jadwal sholat sebelum kubuka kembali secara otomatis.`
    );
  }

  if (args === "kota") {
    const kotaName = m.args.slice(1).join(" ").trim();
    if (!kotaName) {
      return m.reply( `Tolong sebutkan nama kotanya juga! Misalnya, \`${m.prefix}autosholat kota Surabaya\`.`, "autosholat");
    }
    try {
      const result = await searchKota(kotaName);
      if (!result) {
        return m.reply(raraWrap("Autosholat", `Aduh, aku sudah mencari di database MyQuran tapi nama daerah ${kotaName} tidak dapat kutemukan. Coba nama kota yang lain?`));
      }
      database.setting("autoSholatKota", {
        id: result.id,
        nama: result.lokasi,
      });
      return m.reply(
        `📍 *Lokasi Pengingat Berhasil Diperbarui!*\n\n` +
        `Seluruh jadwal sholat sekarang telah dikalibrasi ulang untuk menyesuaikan dengan wilayah **${result.lokasi}**.`
      );
    } catch (e) {
      await m.reply(raraWrap("autosholat", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  { const __navText = `Perintah yang kamu masukkan kurang tepat. Kamu bisa menggunakan parameter seperti \`on\`, \`off\`, \`status\`, \`close\`, \`duration\`, atau \`kota\`.`; return await m.reply(__navText); };
}

async function runAutoSholat(sock) {
  const db = getDatabase();
  if (!db.setting("autoSholat")) return;
  
  const kotaSetting = db.setting("autoSholatKota") || {
    id: "1301",
    nama: "KOTA JAKARTA",
  };
  
  let times;
  try {
    const jadwalData = await getTodaySchedule(kotaSetting.id);
    times = extractPrayerTimes(jadwalData);
  } catch {
    return;
  }
  
  const JADWAL = {
    subuh: times.subuh,
    dzuhur: times.dzuhur,
    ashar: times.ashar,
    maghrib: times.maghrib,
    isya: times.isya,
  };
  
  const timeNow = timeHelper.getCurrentTimeString();
  if (!global.autoSholatLock) global.autoSholatLock = {};
  
  for (const [sholat, waktu] of Object.entries(JADWAL)) {
    if (waktu === "-") continue;
    
    if (timeNow === waktu && !global.autoSholatLock[sholat]) {
      global.autoSholatLock[sholat] = true;
      try {
        global.isFetchingGroups = true;
        const groupsObj = await sock.groupFetchAllParticipating();
        global.isFetchingGroups = false;
        
        const groupList = Object.keys(groupsObj);
        const closeGroup = db.setting("autoSholatCloseGroup") || false;
        const duration = db.setting("autoSholatDuration") || 5;

        for (const jid of groupList) {
          const groupData = db.data?.groups?.[jid] || {};
          if (groupData.notifSholat === false) continue;
          
          try {
            const caption =
              `🕌 Pemberitahuan Waktu Sholat ${sholat.toUpperCase()}** 🕌\n\n` +
              `Sudah saatnya mengistirahatkan sejenak urusan duniamu! Waktu untuk menunaikan ibadah sholat ${sholat} telah tiba untuk wilayah ${kotaSetting.nama} dan sekitarnya (tepatnya pada pukul ${waktu} WIB).\n\n` +
              `Mari segarkan pikiran, ambil air wudhu, dan hampiri panggilan suci-Nya. Selamat menunaikan ibadah sholat! 🤲\n\n` +
              (closeGroup ? `_Sebagai bentuk penghormatan, sistem akan menutup obrolan grup ini untuk sementara waktu (selama ${duration} menit)._` : "");
            
            const msgTeks = await sock.sendMessage(jid, {
              text: caption,
            });

            await sock.sendMessage(jid, {
              audio: { url: AUDIO_ADZAN },
              mimetype: "audio/mpeg",
              ptt: false,
            }, { quoted: msgTeks });
            {
              const card = await dlCard("audio", { url: AUDIO_ADZAN }, [["Engine", "Audio Adzan"], ["Sholat", String(sholat || "-")], ["Kota", String(kotaSetting?.nama || "-")]]);
              if (card) await sock.sendMessage(jid, { text: card }, { quoted: msgTeks });
            }

            if (closeGroup) {
              await sock.groupSettingUpdate(jid, "announcement");
            }
            await new Promise((res) => setTimeout(res, 500));
          } catch (e) {
            console.log(`Gagal mengirim pesan sholat ke grup ${jid}:`, e.message);
          }
        }
        
        if (closeGroup) {
          setTimeout(async () => {
            for (const jid of groupList) {
              try {
                await sock.groupSettingUpdate(jid, "not_announcement");
                await sock.sendMessage(jid, {
                  text: `✅ *Waktu Penutupan Telah Berakhir*\n\nSesi ibadah sholat ${sholat} telah usai. Obrolan grup sekarang sudah kubuka kembali secara otomatis. Selamat melanjutkan aktivitas kembali!`,
                });
                await new Promise((res) => setTimeout(res, 600));
              } catch (e) {
                console.log(`Gagal membuka obrolan grup ${jid}:`, e.message);
              }
            }
            console.log(`Selesai mereset pembukaan seluruh grup.`);
          }, duration * 60 * 1000);
        }
        
        console.log(`Penyiaran adzan ${sholat} berhasil dilakukan ke ${groupList.length} grup secara paralel.`);
      } catch (error) {
        global.isFetchingGroups = false;
        console.error("Terdapat kesalahan pada eksekutor:", error.message);
      }
      
      setTimeout(() => {
        delete global.autoSholatLock[sholat];
      }, 2 * 60 * 1000);
    }
  }
}

export { pluginConfig as config, handler, runAutoSholat, AUDIO_ADZAN };
