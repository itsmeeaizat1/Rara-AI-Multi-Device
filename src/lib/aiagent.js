// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { searchWeb, fetchPagePreview } from "./nova-websearch.js";
import { detectYtSearchIntent } from "./nova-yt-search.js";
import { detectSiteSearchIntent } from './nova-site-search.js';
import { getAllSkills, awaitSkillPacks } from "./nova-skills.js";
// 🔧 RE-EXPORT — plugin (novaai.js dll) ambil getAllSkills dari sini.
// BUGFIX 12 Sep: re-export gak ada → novaai.js import error
// "does not provide an export named 'getAllSkills'" → plugin gagal load
// senyap → .novaagent unknown command di bot.
export { getAllSkills };
import { getMcpToolEntries } from "./nova-mcp.js";
// ============================================================
// 🔹 AI AGENT — Otak AI yang bisa ngatur fitur bot via bahasa natural
// 🔹 Berbeda dari AI biasa (aichat/deepseek), AI Agent bisa EKSEKUSI aksi:
// 🔹 tutup grup, kick, promote, setname, hidetag, blokir, ubah pengaturan, dll
// 🔹 Alur: localParse (instan, 25+ perintah) → DeepSeek (fallback cerdas) → Pollinations
// ============================================================

// ================= DAFTAR TOOLS (whitelist) =================
// AI hanya boleh MEMILIH nama di daftar ini — tidak bisa eksekusi di luar
// 🔹 Map jid user → id participant PERSIS dari metadata grup (aman utk grup LID)
async function resolveParticipantId(conn, m, jid) {
  try {
    const gc = await conn.groupMetadata(m.chat)
    const { findParticipantByNumber } = await import('./nova-lid.js')
    const p = findParticipantByNumber(gc.participants, jid)
    return p?.id || jid
  } catch { return jid }
}

// 🔹 TOOL_TOPIC — kata kunci topik khas tiap tool (request owner 13 Sep
// 2026: "bisa gak setelah aksi berhasil dia ngomong natural kyk AI, jangan
// teks template kaku terus"). Konfirmasi sekarang BOLEH pakai decision.reply
// (bahasa natural AI, variatif) — TAPI kalau reply-nya nyebut topik tool
// LAIN yang bukan tool yang beneran dieksekusi (bug nyata: reply nyebut
// "gambar" padahal tool yang jalan "setdesc"), dianggap suspicious/halusinasi
// → fallback ke tool.done (akurat, statis). Cuma tool yang topiknya rawan
// ketukar (info grup: nama/deskripsi/foto profil/gambar/tutup-buka) yang
// dicek — tool lain (kick/block/dll) tetap bebas natural.
export const TOOL_TOPIC = {
  searchsite: 'situs web',
  closegc: 'tutup',
  opengc: 'dibuka',
  setname: 'nama grup',
  setdesc: 'deskripsi',
  setpp: 'foto profil',
  genimage: 'gambar',
  lockedit: 'kunci',
  unlockedit: 'unlock',
}

// 🔹 TOOL_NATURAL_DOING — frasa natural fase "SEDANG ngerjain" (request
// owner 13 Sep 2026: "kliatan agent itu hidup bgt kyk asisten sungguhan, klo
// mau melakukan atau sdh dilakukan dia ngomong gt" — bukan cuma konfirmasi
// SETELAH aksi yang natural, status SEBELUM aksi jalan juga harus kerasa
// kayak asisten asli lagi ngomong "oke bentar ya", bukan status teknis
// "sedang mengeksekusi: closegc..."). Dipakai novaai.js pas status loading
// sebelum tool.run() — fallback generik kalau tool gak ada di map.
export const TOOL_NATURAL_DOING = {
  searchsite: 'nyariin di situs web-nya...',
  closegc: 'nutup grupnya',
  opengc: 'buka grupnya',
  genimage: 'bikin gambarnya',
  kick: 'ngeluarin dia dari grup',
  add: 'nambahin ke grup',
  promote: 'jadiin dia admin',
  demote: 'turunin dia dari admin',
  block: 'blokir & keluarin dia',
  unblock: 'bebasin dia dari blokir',
  setname: 'ganti nama grupnya',
  setdesc: 'ganti deskripsi grupnya',
  setpp: 'ganti foto profil grupnya',
  lockedit: 'kunci info grupnya',
  unlockedit: 'buka kunci info grupnya',
  getlink: 'ambilin link grupnya',
  revokelink: 'reset link grupnya',
  approvalon: 'aktifin approval member',
  approvaloff: 'matiin approval member',
  hidetag: 'tag semua member',
  tagadmin: 'tag semua admin',
  poll: 'bikin pollingnya',
  groupinfo: 'cek info grupnya',
  delmsg: 'hapus pesannya',
  antilinkon: 'aktifin antilink',
  antilinkoff: 'matiin antilink',
  antibadwordon: 'aktifin antibadword',
  antibadwordoff: 'matiin antibadword',
  antistickeron: 'aktifin antisticker',
  antistickeroff: 'matiin antisticker',
  antivoiceon: 'aktifin antivoice',
  antivoiceoff: 'matiin antivoice',
  antispamon: 'aktifin antispam',
  antispamoff: 'matiin antispam',
  leavegc: 'keluar dari grup',
  download: 'download filenya',
  createfile: 'buatin filenya',
}

export const TOOLS = {
  // ─── BUKA/TUTUP GRUP ───
  closegc: {
    perm: 'admin', danger: false,
    desc: 'menutup grup agar hanya admin yang bisa chat',
    done: '✅ Oke, udah aku tutup grupnya — sekarang cuma admin yang bisa kirim pesan.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'announcement')
  },
  opengc: {
    perm: 'admin', danger: false,
    desc: 'membuka grup agar semua member bisa chat',
    done: '✅ Sip, grup udah aku buka lagi — semua member bisa chat kayak biasa.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'not_announcement')
  },

  // ─── GENERATE GAMBAR (AI IMAGE) ───
  genimage: {
    perm: 'user', args: ['prompt'], danger: false,
    desc: 'generate/membuat GAMBAR dari teks via AI image (contoh: "buatkan gambar kucing astronot")',
    done: '✅ Gambarnya udah dibuatin di atas ya.',
    run: async (conn, m, a) => {
      const prompt = String(a?.prompt || a?.text || '').trim();
      if (!prompt) throw new Error('deskripsi gambarnya apa?');
      // 🔹 FIX 13 Sep 2026 (owner report: minta gambar masih keluar
      // pollinations padahal harusnya nano banana): dulu callImageGen
      // ('gemini') provider TUNGGAL — key Gemini mati → freeFallback
      // internal = pollinations, nano-banana gak pernah kesentuh. Sekarang
      // pakai RANTAI callImageGenChain: key hidup duluan → NANO-BANANA
      // canvas (free) → pollinations cuma juru penyelamat terakhir.
      // Engine ikut ditulis di caption biar keliatan beneran pakai apa.
      const { callImageGenChain } = await import('./nova-ai-service.js');
      const img = await callImageGenChain(prompt, { ratio: a?.ratio || undefined });
      await conn.sendMessage(m.chat, {
        image: Buffer.from(img.base64, 'base64'),
        caption: '🎨 ' + prompt.slice(0, 150) + (img.via ? '\n_(engine: ' + img.via + ')_' : '') + (img.ratio && img.ratio !== '1:1' ? ' _(rasio: ' + img.ratio + ')_' : ''),
      }, { quoted: m });
    }
  },

  // ─── SEARCH YOUTUBE + KIRIM VIDEO SAMPEL (fix owner 14 Sep 2026: ".novaagent
  // carikan/cairkan bot alya md di youtube" hasilnya beda/nyasar — request
  // YouTube gak pernah ke-detect, jatuh ke think() AI yang milih tool salah
  // atau jawab dari halusinasi. Sekarang: cari video di YouTube (yt-search,
  // engine sama kaya .yts/.playvideo — akurat tanpa browser), kirim KARTU
  // INFO (judul/channel/durasi/views/deskripsi/link video lain) + VIDEO
  // SAMPEL hasil unduhan (rantai nova-ytdlp → IkyyXD ytmp4 → ytdl.js,
  // 480p biar cepat & hemat, konversi H.264+AAC biar keputar di WA).
  // Gagal unduh → kartu info + link tetap keluar, tool gak mati.
  searchyt: {
    perm: 'user', args: ['query', 'download'], danger: false,
    desc: 'MENCARI VIDEO di YouTube lalu kirim THUMBNAIL PREVIEW + deskripsi plain text (judul/channel/durasi/views/deskripsi/link). Default TIDAK ngunduh video. Kasih download=true HANYA kalau user eksplisit minta UNDUH/PUTAR/NONTON videonya (contoh: "carikan video tutorial dpixel di youtube" → preview, "unduh video bot alya md" → download:true)',
    done: '✅ Hasil pencarian YouTube udah aku kirim di atas ya.',
    // request owner 14 Sep: ".aisuperagent juga di-upgrade — dua agent
    // bermasalah ngbug" → logic cari YouTube dipindah ke LIB BERSAMA
    // src/lib/nova-yt-search.js supaya .novaagent DAN .aisuperagent
    // (tool ytsearch + deteksi lokal) manggil engine yang sama persis —
    // gak ada dua implementasi yang bisa beda perilaku.
    run: async (conn, m, a) => {
      const { searchYoutubeAndSend } = await import('./nova-yt-search.js');
      return searchYoutubeAndSend(conn, m, {
        query: a?.query || a?.q || a?.text || a?.value,
        wantDownload: !!(a?.download || a?.dl || a?.unduh),
        deps: __searchytDeps,
      });
    }
  },

  // ─── SITE SEARCH (BROWSER BUKA SITUS SEMBARANG) ───
  // request owner 14 Sep: "cba tes klo disuruh cari kayak carikan
  // aplikasi whatsapp di apkmiror" — tes live: planner milih tool
  // download (403) karena gak ada tool buka situs. Sekarang chromium
  // beneran buka web-nya (DuckDuckGo site: search + halaman utama),
  // kartu plain text + narasi alive — LIB BERSAMA nova-site-search.js
  // (dipakai juga .aisuperagent — deteksi lokal).
  searchsite: {
    perm: 'user', args: ['site', 'query'], danger: false,
    desc: 'MENCARI SESUATU di SITUS WEB tertentu (apkmirror/apkpure/playstore/shopee/dll — domain apa pun) pakai browser beneran lalu kirim hasilnya plain text (judul/link/deskripsi/isi halaman + AI jelasin hasilnya). Pakai kalau user minta cari sesuatu DI SEBUAH SITUS (contoh: "carikan aplikasi whatsapp di apkmirror"). JANGAN pakai buat link file langsung (itu download) atau YouTube (itu searchyt)',
    done: '✅ Hasil pencariannya udah aku kirim di atas ya.',
    run: async (conn, m, a) => {
      const { searchSiteAndSend } = await import('./nova-site-search.js');
      return searchSiteAndSend(conn, m, {
        site: a?.site || a?.website || a?.situs || a?.domain,
        query: a?.query || a?.q || a?.text || a?.value,
        deps: __siteSearchDeps,
      });
    }
  },

  // ─── MANAJEMEN MEMBER ───
  kick: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan member dari grup',
    done: '✅ Oke, udah aku keluarkan dari grup.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'remove')
    }
  },
  add: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menambahkan nomor ke grup',
    done: '✅ Sip, udah aku tambahin ke grup.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'add')
    }
  },
  promote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menjadikan member sebagai admin',
    done: '✅ Udah aku jadiin admin sekarang.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'promote')
    }
  },
  demote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menurunkan admin menjadi member biasa',
    done: '✅ Udah aku turunin jadi member biasa.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'demote')
    }
  },

  // ─── BLOKIR / UNBLOKIR (kick + blocklist lokal) ───
  block: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan dan memblokir user dari grup (tidak bisa masuk lagi)',
    done: '✅ Udah aku blokir & keluarkan dari grup.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      await conn.groupParticipantsUpdate(m.chat, [pid], 'remove')
      try {
        const { getDatabase } = await import('./nova-database.js')
        const db = getDatabase()
        if (!db.db.data.groupBlocklist) db.db.data.groupBlocklist = {}
        if (!db.db.data.groupBlocklist[m.chat]) db.db.data.groupBlocklist[m.chat] = []
        if (!db.db.data.groupBlocklist[m.chat].includes(a.user)) {
          db.db.data.groupBlocklist[m.chat].push(a.user)
          db.markDirty('settings')
          db.db.write?.()
        }
      } catch (e) { console.error('[aiagent] block save:', e.message) }
    }
  },
  unblock: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'membuka blokir user di grup (bisa masuk lagi)',
    done: '✅ Udah aku bebasin dari blokir grup.',
    run: async (conn, m, a) => {
      try {
        const { getDatabase } = await import('./nova-database.js')
        const db = getDatabase()
        if (db.db.data.groupBlocklist?.[m.chat]) {
          db.db.data.groupBlocklist[m.chat] = db.db.data.groupBlocklist[m.chat].filter(u => u !== a.user)
          db.markDirty('settings')
          db.db.write?.()
        }
      } catch (e) { console.error('[aiagent] unblock:', e.message) }
    }
  },

  // ─── INFO GRUP ───
  setname: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti nama grup',
    done: '✅ Oke, nama grupnya udah aku ganti.',
    run: (conn, m, a) => conn.groupUpdateSubject(m.chat, a.value)
  },
  setdesc: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti deskripsi grup',
    done: '✅ Oke, deskripsi grupnya udah aku ganti.',
    run: (conn, m, a) => conn.groupUpdateDescription(m.chat, a.value)
  },
  setpp: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti foto profil grup (reply gambar atau kirim gambar dengan caption)',
    done: '✅ Sip, foto profil grupnya udah aku ganti.',
    run: async (conn, m, a) => {
      let imgBuffer
      if (m.quoted?.message?.imageMessage || m.quoted?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const msg = m.quoted.message.imageMessage || m.quoted.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
        imgBuffer = await conn.downloadMediaMessage({ message: { imageMessage: msg } })
      }
      else if (m.message?.imageMessage) {
        imgBuffer = await conn.downloadMediaMessage(m)
      }
      if (!imgBuffer) throw new Error('Reply gambar atau kirim gambar dulu.')
      await conn.updateProfilePicture(m.chat, imgBuffer)
    }
  },

  // ─── PENGATURAN GRUP (lock/unlock edit info) ───
  lockedit: {
    perm: 'admin', danger: false,
    desc: 'mengunci pengaturan grup agar hanya admin yang bisa edit info grup',
    done: '✅ Oke, info grup udah aku kunci — cuma admin yang bisa edit sekarang.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'locked')
  },
  unlockedit: {
    perm: 'admin', danger: false,
    desc: 'membuka kunci pengaturan grup agar semua member bisa edit info grup',
    done: '✅ Sip, kunci info grup udah aku buka — semua member bisa edit lagi.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'unlocked')
  },

  // ─── LINK GRUP ───
  getlink: {
    perm: 'admin', danger: false,
    desc: 'mendapatkan link invite grup',
    done: '✅ Nih, link grupnya udah aku ambil.',
    run: async (conn, m) => {
      const code = await conn.groupInviteCode(m.chat)
      await conn.sendMessage(m.chat, {
        text: '🔗 Link Grup:\nhttps://chat.whatsapp.com/' + code
      }, { quoted: m })
    }
  },
  revokelink: {
    perm: 'admin', danger: false,
    desc: 'mereset/merevoke link invite grup (link lama tidak berlaku)',
    done: '✅ Udah aku reset link grupnya — link lama gak berlaku lagi ya.',
    run: (conn, m) => conn.groupRevokeInvite(m.chat)
  },

  // ─── APPROVAL MODE (member baru harus di-approve) ───
  approvalon: {
    perm: 'admin', danger: false,
    desc: 'mengaktifkan mode persetujuan member (member baru harus di-approve admin)',
    done: '✅ Oke, mode approval member udah aku aktifin — member baru wajib di-approve admin dulu.',
    run: async (conn, m) => {
      const patch = { memberApprovalMode: { isMemberApprovalRequired: true } }
      await conn.groupSettingUpdate(m.chat, patch)
    }
  },
  approvaloff: {
    perm: 'admin', danger: false,
    desc: 'mematikan mode persetujuan member (member bisa langsung gabung)',
    done: '✅ Sip, mode approval udah aku matiin — member baru bisa langsung gabung.',
    run: async (conn, m) => {
      const patch = { memberApprovalMode: { isMemberApprovalRequired: false } }
      await conn.groupSettingUpdate(m.chat, patch)
    }
  },

  // ─── TAG / ANNOUNCE ───
  hidetag: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'memberi tag kepada semua member dengan pesan',
    done: '✅ Udah aku tag semua member.',
    run: async (conn, m, a) => {
      const gc = await conn.groupMetadata(m.chat)
      await conn.sendMessage(m.chat, {
        text: a.value || '',
        mentions: gc.participants.map(p => p.id)
      }, { quoted: m })
    }
  },
  tagadmin: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'memberi tag kepada semua admin grup dengan pesan',
    done: '✅ Udah aku tag semua admin.',
    run: async (conn, m, a) => {
      const gc = await conn.groupMetadata(m.chat)
      const admins = gc.participants.filter(p => p.admin).map(p => p.id)
      await conn.sendMessage(m.chat, {
        text: a.value || '',
        mentions: admins
      }, { quoted: m })
    }
  },

  // ─── POLL ───
  poll: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'membuat polling di grup (format: pertanyaan | opsi1, opsi2, opsi3)',
    done: '✅ Sip, pollingnya udah aku buatin.',
    run: async (conn, m, a) => {
      const parts = (a.value || '').split('|')
      const question = parts[0]?.trim()
      const options = parts[1]?.split(',').map(o => o.trim()).filter(Boolean)
      if (!question || options.length < 2) throw new Error('Format: pertanyaan | opsi1, opsi2, opsi3')
      await conn.sendMessage(m.chat, {
        poll: { name: question, values: options, selectableCount: 1 }
      })
    }
  },

  // ─── INFO GRUP ───
  groupinfo: {
    perm: 'admin', danger: false,
    desc: 'menampilkan info lengkap grup (nama, member, admin, deskripsi)',
    done: '✅ Nih, info grupnya.',
    run: async (conn, m) => {
      const gc = await conn.groupMetadata(m.chat)
      const admins = gc.participants.filter(p => p.admin).map(p => p.id.split('@')[0]).join(', ')
      let text = '📊 INFO GRUP\n\n'
      text += 'Nama: ' + gc.subject + '\n'
      text += 'ID: ' + gc.id + '\n'
      text += 'Member: ' + gc.participants.length + '\n'
      text += 'Admin: ' + (gc.participants.filter(p => p.admin).length) + '\n'
      text += 'Admin list: ' + admins + '\n'
      text += 'Dibuat: ' + new Date(gc.creation * 1000).toLocaleString('id-ID') + '\n'
      if (gc.desc) text += 'Deskripsi:\n' + gc.desc
      await conn.sendMessage(m.chat, { text }, { quoted: m })
    }
  },

  // ─── DELETE PESAN (admin only) ───
  delmsg: {
    perm: 'admin', danger: false,
    desc: 'menghapus pesan yang di-reply (admin only)',
    done: '✅ Oke, pesannya udah aku hapus.',
    run: async (conn, m) => {
      if (!m.quoted) throw new Error('Reply pesan yang mau dihapus.')
      await conn.sendMessage(m.chat, { delete: m.quoted.key })
    }
  },

  // ─── TOGGLE FITUR AUTOMOD (request owner 12 Sep 2026: "aktifkan antilink
  // digrup ini" — sebelumnya malah kesasar ke getlink, sekarang tool asli;
  // pola on/off TERPISAH ala closegc/opengc & approvalon/approvaloff) ───
  antilinkon: {
    perm: 'admin', danger: false,
    desc: 'menyalakan filter anti-link di grup ini',
    done: '🛡️ Anti-Link di grup ini: AKTIF ✅',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antilink', true)
    }
  },
  antilinkoff: {
    perm: 'admin', danger: false,
    desc: 'mematikan filter anti-link di grup ini',
    done: '🛡️ Anti-Link di grup ini: MATI ❌',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antilink', false)
    }
  },
  antibadwordon: {
    perm: 'admin', danger: false,
    desc: 'menyalakan filter kata kasar di grup ini',
    done: '🛡️ Anti-Badword di grup ini: AKTIF ✅',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antibadword', true)
    }
  },
  antibadwordoff: {
    perm: 'admin', danger: false,
    desc: 'mematikan filter kata kasar di grup ini',
    done: '🛡️ Anti-Badword di grup ini: MATI ❌',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antibadword', false)
    }
  },
  antistickeron: {
    perm: 'admin', danger: false,
    desc: 'menyalakan blokir sticker di grup ini',
    done: '🛡️ Anti-Sticker di grup ini: AKTIF ✅',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antisticker', true)
    }
  },
  antistickeroff: {
    perm: 'admin', danger: false,
    desc: 'mematikan blokir sticker di grup ini',
    done: '🛡️ Anti-Sticker di grup ini: MATI ❌',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antisticker', false)
    }
  },
  antivoiceon: {
    perm: 'admin', danger: false,
    desc: 'menyalakan blokir voice note di grup ini',
    done: '🛡️ Anti-Voice Note di grup ini: AKTIF ✅',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antivoice', true)
    }
  },
  antivoiceoff: {
    perm: 'admin', danger: false,
    desc: 'mematikan blokir voice note di grup ini',
    done: '🛡️ Anti-Voice Note di grup ini: MATI ❌',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antivoice', false)
    }
  },
  antispamon: {
    perm: 'admin', danger: false,
    desc: 'menyalakan filter spam di grup ini',
    done: '🛡️ Anti-Spam di grup ini: AKTIF ✅',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antispam', true)
    }
  },
  antispamoff: {
    perm: 'admin', danger: false,
    desc: 'mematikan filter spam di grup ini',
    done: '🛡️ Anti-Spam di grup ini: MATI ❌',
    run: async (conn, m) => {
      const { setAutomodRule } = await import('./nova-automation-hub.js')
      setAutomodRule(m.chat, 'antispam', false)
    }
  },

  // ─── OWNER ONLY: LEAVE GROUP ───
  leavegc: {
    perm: 'owner', danger: false,
    desc: 'bot keluar dari grup (owner only)',
    done: '✅ Oke, aku keluar dari grup ya.',
    run: (conn, m) => conn.groupLeave(m.chat)
  },

  // ─── DOWNLOAD FILE DARI WEB (request owner 12 Sep 2026: "aku maunya dia
  // bisa browsing, bsa download file dr web ... serba bisa layaknya
  // superagent sungguhan" — porting pola tool download .aisuperagent) ───
  download: {
    perm: 'user', args: ['url'], danger: false,
    desc: 'UNDUH FILE dari link URL langsung (apk/zip/mp3/pdf/exe/dll apa saja) — pakai kalau user minta download/unduh file dari link. Link WAJIB langsung ke file, bukan halaman web',
    done: '✅ Filenya udah aku unduh dan kirim di atas ya.',
    run: async (conn, m, a) => {
      const raw = String(a?.url || a?.link || a?.value || '').trim()
      if (!/^https?:\/\//i.test(raw)) throw new Error('Kasih link langsung ke file-nya (http/https) — contoh: https://situs.com/app.apk')
      const MAX_MB = parseInt(process.env.AGENT_DL_MAX_MB || '100', 10) || 100
      const res = await fetch(raw, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: '*/*' },
        signal: AbortSignal.timeout(120000),
      }).catch(() => null)
      if (!res) throw new Error('gak bisa nyampe link-nya (koneksi/timeout)')
      if (!res.ok) throw new Error('server jawab HTTP ' + res.status)
      const len = parseInt(res.headers.get('content-length') || '0', 10)
      if (len && len > MAX_MB * 1024 * 1024) throw new Error('file ' + (len / 1048576).toFixed(1) + ' MB kegedean (max ' + MAX_MB + ' MB)')
      // nama file: Content-Disposition → path URL → fallback
      const cd = res.headers.get('content-disposition') || ''
      const cdM = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
      let name = cdM ? decodeURIComponent(cdM[1]).trim() : ''
      if (!name) { try { name = decodeURIComponent(new URL(raw).pathname.split('/').pop() || '').trim() } catch {} }
      name = (name || 'file').replace(/[\u0000-\u001f\\\/:*?"<>|]/g, '').slice(0, 80).trim() || 'file'
      const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase()
      if (ct.includes('text/html') && !ext) throw new Error('link itu halaman web, bukan file langsung — kasih link yang ujungnya nama file')
      const mime = ext === 'apk' ? 'application/vnd.android.package-archive'
        : ext === 'zip' ? 'application/zip'
        : ct && !ct.includes('text/html') ? ct : 'application/octet-stream'
      const buf = Buffer.from(await res.arrayBuffer())
      if (!buf.length) throw new Error('file kosong / gak bisa diunduh')
      if (buf.length > MAX_MB * 1024 * 1024) throw new Error('file kegedean (lebih dari ' + MAX_MB + ' MB)')
      await conn.sendMessage(m.chat, { document: buf, fileName: name, mimetype: mime }, { quoted: m })
    }
  },

  // ─── CREATE FILE (request owner 12 Sep 2026: "bisa buatkan file kyk txt,
  // doc, xls, ja, html dll" — .novaagent serba bisa layaknya superagent) ───
  // AI isi args: name (nama file tanpa ekstensi), ext (txt/doc/xls/xlsx/js/
  // html/py/php/json/md/css), content (ISI file lengkap — untuk xls/xlsx isi
  // tabel CSV: baris = record, kolom dipisah koma; koma dalam teks pakai "...").
  createfile: {
    perm: 'user', args: ['name', 'ext', 'content'], danger: false,
    desc: 'MEMBUAT FILE (txt/doc/xls/xlsx/js/html/css/py/php/json/md) — pakai kalau user minta dibuatkan file/dokumen/daftar/kode program. Isi: name = nama file singkat tanpa spasi/ekstensi, ext = jenis file (txt/doc/xls/js/html/py/dll), content = ISI FILE LENGKAP seakan-akan file SUDAH JADI FINAL (untuk xls/xlsx tulis tabel CSV per baris). KHUSUS KODE PROGRAM (html/js/py/dll): tulis KODE PENUH siap jalan — kalau html TULIS SEMUA dari <!DOCTYPE html> sampai </html> beserta style/script lengkap; HARAM elipsis 3 titik / placeholder / TODO / "KODE LENGKAP" sebagai singkatan — sistem otomatis ngecek dan MELANJUTKAN kode yang kepotong',
    done: '✅ Filenya udah aku buatin dan kirim di atas ya.',
    run: async (conn, m, a) => {
      const EXT_WHITELIST = ['txt','md','js','ts','html','css','json','py','php','java','sh','csv','sql','xml','doc','docx','xls','xlsx']
      let ext = String(a?.ext || a?.type || a?.format || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
      if (ext === 'javascript') ext = 'js'
      if (ext === 'word') ext = 'doc'
      if (ext === 'excel' || ext === 'spreadsheet') ext = 'xlsx'
      if (ext === 'text') ext = 'txt'
      let content = String(a?.content ?? a?.isi ?? a?.text ?? '')
      if (!content.trim()) throw new Error('isi file-nya (content) kosong — kasih konten lengkapnya')
      if (!EXT_WHITELIST.includes(ext)) {
        // fallback: tebakin dari nama file kalau AI kasih name ber-ext
        const nm = String(a?.name || '')
        const nmExt = (nm.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase()
        if (nmExt && EXT_WHITELIST.includes(nmExt)) ext = nmExt
        else if (/(kode|code|program|script|aplikasi|website|html)/i.test(content)) ext = 'js'
        else ext = 'txt'
      }
      let base = String(a?.name || a?.filename || 'file').replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40).trim()
      if (!base) base = 'file'

      // FIX OWNER 12 Sep 2026 ("buatkan login web topup, kode-nya gak
      // lengkap cm singkat"): kode yang kepotong (placeholder/tag gak
      // ketutup/bracket gak balance) DILENGKAPIN OTOMATIS via nova-codegen
      // loop — prompt quality bar + AI lanjutin PERSIS dari baris terakhir.
      try {
        const { CODE_EXTS, looksIncomplete, generateCompleteCode } = await import('./nova-codegen.js')
        if (CODE_EXTS.has(ext) && looksIncomplete(content, ext)) {
          const { aiChainChat } = await import('./nova-ai-fallback.js')
          const gen = await generateCompleteCode({
            spec: 'Lengkapi file ' + base + '.' + ext + ' sesuai draft berikut jadi versi final lengkap siap jalan:\n\n' + content,
            ext, lang: ext,
            aiChat: (p, o) => aiChainChat(p, { ...o, timeoutMs: 60000 }),
            maxRounds: 3,
          })
          if (gen.code && gen.code.length > content.length) content = gen.code
        }
      } catch { /* gagal melengkapi → kirim apa adanya, tool gak boleh mati */ }

      let buf
      let fileName
      let mimetype
      if (ext === 'xls' || ext === 'xlsx') {
        // CSV content → workbook Excel ASLI (exceljs) — AI dikasih format CSV
        const { parseCsvContent } = await import('./nova-createfile.js')
        const rows = parseCsvContent(content)
        if (!rows.length) throw new Error('tabelnya kosong — isi content dengan baris CSV (kolom dipisah koma)')
        const { buildWorkbook } = await import('./nova-createfile.js')
        buf = await buildWorkbook(rows, base)
        fileName = base + '.' + ext
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (ext === 'doc' || ext === 'docx') {
        // dokumen Word: HTML word-compatible bertipe .doc (Word lancar buka)
        const { buildWordHtml } = await import('./nova-createfile.js')
        buf = Buffer.from(buildWordHtml(content), 'utf-8')
        fileName = base + '.doc'
        mimetype = 'application/msword'
      } else {
        buf = Buffer.from(content, 'utf-8')
        fileName = base + '.' + ext
        mimetype = ext === 'html' ? 'text/html'
          : ext === 'js' || ext === 'ts' || ext === 'css' || ext === 'json' || ext === 'xml' || ext === 'sql' ? 'text/plain'
          : ext === 'csv' ? 'text/csv'
          : ext === 'txt' ? 'text/plain'
          : ext === 'md' ? 'text/markdown'
          : 'application/octet-stream'
      }
      await conn.sendMessage(m.chat, { document: buf, fileName, mimetype }, { quoted: m })
    }
  },
}

// ================= REGISTRY GABUNGAN (TOOLS + SKILLS + MCP) =================
// Request owner 12 Sep 2026: "jadi tool, skills dan mcp banyak yg dipasang
// lengkap agent sebagai tool tambahan atau kebutuhan yang dibutuhkan agent".
// TOOLS = tool inti; SKILLS = tool kecil serba bisa (nova-skills.js);
// MCP = tool dari server MCP eksternal (nova-mcp.js). Semua bentuknya sama
// (perm/args/danger/desc/run) → gerbang + executor novaai.js jalan generik.
export async function getAgentTools() {
  await awaitSkillPacks() // skill pack src/skills/ siap sebelum registry dibangun
  let mcp = {};
  try { mcp = await getMcpToolEntries(); } catch { /* MCP down gak boleh matiin agent */ }
  return { ...TOOLS, ...getAllSkills(), ...mcp };
}

// ================= RESOLVE NAMA MEMBER KE JID =================
// 🔹 AI AGENT: cari JID member grup dari nama/nomor yang disebut user
// 🔹 Sumber nama: sock.store.contacts (Baileys cache) + nova-activity-tracker (histori chat grup)
// 🔹 Return: string JID kalau ketemu 1, { multiple: [...] } kalau ambigu, null kalau tidak ketemu
export async function resolveUserByName(sock, m, nameQuery) {
  if (!nameQuery || !m?.chat) return null
  const digitsOnly = String(nameQuery).replace(/[^0-9]/g, '')
  // Kalau sudah berupa nomor WA valid (8-15 digit), langsung pakai itu
  if (/^\d{8,15}$/.test(digitsOnly) && !/[a-zA-Z]/.test(String(nameQuery))) {
    return digitsOnly + '@s.whatsapp.net'
  }

  const query = String(nameQuery).toLowerCase().trim()
  if (!query) return null

  // Kalimat user sering nempel partikel ("kick budi dong ya") —
  // siapkan beberapa varian query: lengkap → tanpa kata pengisi → kata terpanjang
  const fillers = /\b(dong|dulu|dongg|ya|yah|deh|sih|kak|kakak|bang|bangs|nih|tuh|banget|yang|itu|dia|tolong|coba|please|aja|saja|sekarang|cepet|gpp|gak apa apa)\b/gi
  const stripped = query.replace(fillers, ' ').replace(/\s+/g, ' ').trim()
  const longest = stripped.split(' ').filter(Boolean).sort((a, b) => b.length - a.length)[0] || ''
  const queries = [query]
  if (stripped && stripped !== query) queries.push(stripped)
  if (longest && longest.length >= 3 && !queries.includes(longest)) queries.push(longest)

  try {
    const gc = await sock.groupMetadata(m.chat)
    const participantJids = new Set(gc.participants.map(p => p.id))

    // sumber pesan grup (paling fresh) disiapkan sekali di luar per-variant
    let groupMsgs = null
    if (sock.store?.messages?.get) {
      try {
        const chatMsgs = sock.store.messages.get(m.chat)
        if (chatMsgs) {
          groupMsgs = typeof chatMsgs.values === 'function'
            ? [...chatMsgs.values()]
            : Object.values(chatMsgs)
          groupMsgs.reverse() // pesan terbaru dulu → nama paling fresh menang
        }
      } catch { /* store messages tidak tersedia */ }
    }

    for (const q of queries) {
      const candidates = []
      const seen = new Set()

      // Sumber 1: Baileys contact store (nama kontak/notify — kini juga terisi
      // dari pushName member grup, lihat fix connection.js)
      for (const jid of participantJids) {
        const ct = sock.store?.contacts?.[jid]
        const name = ct?.name || ct?.notify || ct?.verifiedName || ''
        const num = jid.split('@')[0]
        if (name && name.toLowerCase().includes(q) && !seen.has(jid)) {
          candidates.push({ jid, name })
          seen.add(jid)
        } else if (digitsOnly.length >= 5 && num.includes(digitsOnly) && !seen.has(jid)) {
          candidates.push({ jid, name: num })
          seen.add(jid)
        }
      }

      // Sumber 2: histori aktivitas grup (nama tersimpan dari pushName saat chat)
      try {
        const { getLeaderboard } = await import('./nova-activity-tracker.js')
        const members = getLeaderboard(m.chat, 9999)
        for (const mem of members) {
          if (!participantJids.has(mem.jid)) continue
          if (mem.name && mem.name.toLowerCase().includes(q) && !seen.has(mem.jid)) {
            candidates.push({ jid: mem.jid, name: mem.name })
            seen.add(mem.jid)
          }
        }
      } catch { /* activity tracker tidak tersedia, lanjut tanpa itu */ }

      // Sumber 3: pushName dari pesan-pesan terakhir di grup ini
      // (paling andal buat member aktif — gak tergantung restart/contacts)
      if (groupMsgs) {
        for (const msg of groupMsgs) {
          const pj = msg?.key?.participant
          const pn = msg?.pushName || ''
          if (!pj || !pn) continue
          if (!participantJids.has(pj)) continue
          if (pn.toLowerCase().includes(q) && !seen.has(pj)) {
            candidates.push({ jid: pj, name: pn })
            seen.add(pj)
          }
        }
      }

      if (candidates.length === 1) return candidates[0].jid
      if (candidates.length > 1) return { multiple: candidates }
      // query varian berikutnya
    }
    return null
  } catch (e) {
    console.error('[aiagent] resolveUserByName error:', e.message)
    return null
  }
}

// ================= SEAM TEST searchyt (e2e offline) =================
// __searchytDeps di-inject dari test (yts / downloadVideoYtDlp / ikyyHttp /
// ytdlFn / toWhatsAppVideo) — kalau kosong, tool pakai modul asli via
// dynamic import (jalur produksi).
const __searchytDeps = {};
export function _setSearchytDepsForTest(d) { Object.assign(__searchytDeps, d); }
export function _resetSearchytDepsForTest() { for (const k of Object.keys(__searchytDeps)) delete __searchytDeps[k]; }

const __siteSearchDeps = {};
export function _setSiteSearchDepsForTest(d) { Object.assign(__siteSearchDeps, d); }
export function _resetSiteSearchDepsForTest() { for (const k of Object.keys(__siteSearchDeps)) delete __siteSearchDeps[k]; }

// ================= PARSER LOKAL (tanpa API, instan) =================
// 🔹 AI AGENT: parser lokal untuk perintah sederhana — instan, tanpa panggil API
// 🔹 Mendukung 25+ perintah tanpa perlu AI online
export function localParse(text) {
  const t = (text || '').toLowerCase()
  const original = text || ''

  // ─── LOCK/UNLOCK EDIT (cek SEBELUM buka/tutup grup) ───
  if (/(kunci|lock).*(edit|info|pengaturan|setting)/.test(t)) return { tool: 'lockedit', args: {} }
  if (/(buka|unlock).*(edit|info|pengaturan|setting)/.test(t)) return { tool: 'unlockedit', args: {} }

  // ─── BUKA/TUTUP GRUP ───
  if (/(tutup|kunci|close)/.test(t) && /grup|gc\b|group/.test(t)) return { tool: 'closegc', args: {} }
  if (/(buka|open)/.test(t) && /grup|gc\b|group/.test(t)) return { tool: 'opengc', args: {} }

  // ─── KICK/USIR ───
  if (/(kick|keluarkan|usir|tendang|buang)/.test(t)) {
    const nameMatch = original.replace(/(kick|keluarkan|usir|tendang|buang|dari grup|dari gc|dari group)/gi, '').trim()
    return { tool: 'kick', args: nameMatch ? { user: nameMatch } : {} }
  }

  // ─── BLOKIR/UNBLOKIR ───
  if (/(blokir|blok|block|ban)\b/.test(t) && !/(unblok|unban|buka blokir|buka blok)/.test(t)) {
    const nameMatch = original.replace(/(blokir|blok|block|ban|dari grup|dari gc|dari group)/gi, '').trim()
    return { tool: 'block', args: nameMatch ? { user: nameMatch } : {} }
  }
  if (/(unblokir|unblok|unblock|unban|buka blokir|buka blok|bebaskan)/.test(t)) {
    const nameMatch = original.replace(/(unblokir|unblok|unblock|unban|buka blokir|buka blok|bebaskan|dari grup|dari gc|dari group)/gi, '').trim()
    return { tool: 'unblock', args: nameMatch ? { user: nameMatch } : {} }
  }

  // ─── ADD MEMBER ───
  if (/(tambahkan|masukkan|add|tambah).*(nomor|member|orang|ke grup|ke gc|to group)/.test(t)) return { tool: 'add', args: {} }

  // ─── PROMOTE/DEMOTE ───
  if (/(jadikan|adminin|promote|naikin).*(admin)/.test(t)) {
    const nameMatch = original.replace(/(jadikan|adminin|promote|naikin|admin|jadi)/gi, '').trim()
    return { tool: 'promote', args: nameMatch ? { user: nameMatch } : {} }
  }
  if (/(turunkan|cabut admin|demote|turunin).*(admin|member)/.test(t)) {
    const nameMatch = original.replace(/(turunkan|cabut|demote|turunin|admin|member|jadi)/gi, '').trim()
    return { tool: 'demote', args: nameMatch ? { user: nameMatch } : {} }
  }

  // ─── SETNAME ───
  if (/ganti.*(nama|judul|subject)/.test(t) || /ubah.*(nama|judul)/.test(t)) {
    const match = original.match(/(?:jadi|menjadi|ke|jadi)\s+(.+)/i)
    return { tool: 'setname', args: { value: match ? match[1].trim() : original } }
  }

  // ─── SETDESC ───
  if (/ganti.*(deskripsi|desc|keterangan)/.test(t) || /ubah.*(deskripsi|desc)/.test(t)) {
    const match = original.match(/(?:jadi|menjadi|ke)\s+(.+)/i)
    return { tool: 'setdesc', args: { value: match ? match[1].trim() : original } }
  }

  // ─── SETPP (foto profil grup) ───
  if (/(ganti|ubah|update).*(foto|pp|profil|picture|avatar)/.test(t) && /(grup|gc|group)/.test(t))
    return { tool: 'setpp', args: {} }

  // ─── SEARCH YOUTUBE — CEK LOKAL DULU (fix owner 14 Sep 2026: request
  // YouTube gak pernah ke-detect → jatuh ke think() AI → tool salah /
  // halusinasi). Deteksi intent di LIB BERSAMA nova-yt-search.js
  // (dipakai juga .aisuperagent — request owner ".aisuperagent juga
  // upgrade, dua agent bermasalah ngbug"). Hasil cari = THUMBNAIL
  // preview + deskripsi plain text; video cuma diunduh kalau eksplisit.
  const __ytIntent = detectYtSearchIntent(t, original);
  if (__ytIntent) return { tool: 'searchyt', args: { query: __ytIntent.query, download: __ytIntent.download } };

  // ─── SITE SEARCH — CEK LOKAL setelah YouTube (request owner 14 Sep:
  // "carikan aplikasi whatsapp di apkmirror" tadinya milih tool
  // download → 403. Deteksi di LIB BERSAMA nova-site-search.js —
  // dipakai juga .aisuperagent). "di <situs>" + kata cari → searchsite.
  const __siteIntent = detectSiteSearchIntent(t, original);
  if (__siteIntent) return { tool: 'searchsite', args: { site: __siteIntent.site, query: __siteIntent.query } };

  // ─── GENERATE GAMBAR (AI IMAGE) — CEK LOKAL DULU, JANGAN LEWAT think() ───
  // Bug nyata dilaporkan owner 13 Sep 2026: ".novaagent buatkan gambar
  // kucing" (giliran kedua setelah sesi ngobrol ubah deskripsi grup) malah
  // think() balikin tool "setdesc" LAGI (AI provider bingung sama histori
  // sesi, ke-anchor ke aksi sebelumnya) + reply ngarang "gambar kucing
  // sedang dibuat" padahal genimage GAK PERNAH kepanggil. FIX: request
  // generate gambar dari teks langsung dideteksi LOKAL (instan, gak lewat
  // AI classification sama sekali) — imun dari kebingungan histori sesi.
  // Exclude foto profil/grup biar gak rebutan sama SETPP di atas.
  if ((/\bgambarkan\b/.test(t) || /\b(buatkan|buat|bikin|generate|create|hasilkan)\b.*\b(gambar|foto|lukisan|ilustrasi|poster|wallpaper)\b/.test(t))
      && !/(profil|\bpp\b|avatar|grup|gc\b|group)/.test(t)) {
    const prompt = original
      .replace(/\b(tolong|please|dong|ya|yah|deh|sih|min|coba|kak|bang)\b/gi, ' ')
      .replace(/\b(buatkan|buat|bikin|gambarkan|generate|create|hasilkan)\b/gi, ' ')
      .replace(/\b(gambar|foto|lukisan|ilustrasi|poster|wallpaper)(?:nya)?\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return { tool: 'genimage', args: { prompt: prompt || 'sesuatu yang menarik dan kreatif' } }
  }

  // ─── TOGGLE FITUR AUTOMOD (antilink/antibadword/antisticker/antivoice/
  // antispam) — CEK DULU sebelum LINK GRUP di bawah. Bug nyata dilaporkan
  // owner 12 Sep 2026: ".novaagent aktifkan antilink digrup ini" malah
  // ke-detect getlink (regex lama /(link|tautan|invite)\b/ nangkep substring
  // "link" di dalam "antilink" karena gak ada \b di AWAL match, cuma di akhir
  // — sekarang fitur toggle di cek LEBIH DULU + return early jadi gak sampe
  // ke pengecekan getlink sama sekali).
  const FEATURE_RULE = /\b(antilink|antibadword|antisticker|antivoice|antispam)\b/.exec(t)
  if (FEATURE_RULE) {
    const rule = FEATURE_RULE[1]
    const isOff = /\b(matikan|matiin|nonaktifkan|nonaktifin|hapus|lepas|cabut|off)\b/.test(t)
    const isOn = /\b(aktifkan|aktifin|nyalain|nyalakan|hidupkan|pasang|setel|set|on)\b/.test(t)
    if (isOff || isOn) return { tool: rule + (isOff ? 'off' : 'on'), args: {} }
  }

  // ─── LINK GRUP (HANYA kata "link/tautan/invite" BERDIRI SENDIRI — bukan
  // bagian dari nama fitur seperti "antilink", dicek FEATURE_RULE di atas) ───
  if (/\b(link|tautan|invite)\b/.test(t) && /(grup|gc|group)/.test(t) && !/reset|revoke/.test(t) && !FEATURE_RULE)
    return { tool: 'getlink', args: {} }
  if (/(reset|revoke|perbarui).*(link|invite)/.test(t)) return { tool: 'revokelink', args: {} }

  // ─── APPROVAL MODE ───
  if (/(aktifkan|on\b|nyalakan|hidupkan).*(approval|persetujuan|approve|setuju|izin.*gabung|izin.*masuk)/.test(t) ||
      /(izin|persetujuan).*(anggota|member).*(aktifkan|nyalakan|hidupkan|on\b)/.test(t))
    return { tool: 'approvalon', args: {} }
  if (/(matikan|off\b|nonaktifkan|hentikan).*(approval|persetujuan|approve|setuju|izin.*gabung|izin.*masuk)/.test(t) ||
      /(izin|persetujuan).*(anggota|member).*(matikan|hentikan|off\b|nonaktifkan)/.test(t))
    return { tool: 'approvaloff', args: {} }

  // ─── HIDETAG / TAG ALL ───
  if (/(tag|panggil|notify|hidetag).*(semua|all|semua member|all member)/.test(t)) {
    const match = original.match(/(?:dengan|isi|pesan)\s*:?\s*(.+)/i)
    return { tool: 'hidetag', args: { value: match ? match[1].trim() : original.replace(/(tag|panggil|semua|all|member|notify|hidetag)/gi, '').trim() } }
  }

  // ─── TAG ADMIN ───
  if (/(tag|panggil).*(admin)/.test(t)) {
    const match = original.match(/(?:dengan|isi|pesan)\s*:?\s*(.+)/i)
    return { tool: 'tagadmin', args: { value: match ? match[1].trim() : original.replace(/(tag|panggil|admin)/gi, '').trim() } }
  }

  // ─── POLL ───
  if (/(poll|polling|vote|voting)\b/.test(t)) {
    return { tool: 'poll', args: { value: original.replace(/(poll|polling|vote|voting)/gi, '').trim() } }
  }

  // ─── GROUP INFO ───
  if (/(info|detail|cek).*(grup|gc|group)/.test(t)) return { tool: 'groupinfo', args: {} }

  // ─── DELETE PESAN ───
  if (/(hapus|delete|del|buang).*(pesan|message|msg)/.test(t)) return { tool: 'delmsg', args: {} }
  if (/^hapus$/.test(t.trim())) return { tool: 'delmsg', args: {} }

  // ─── LEAVE GROUP (owner) ───
  if (/(keluar|leave|out).*(grup|gc|group)/.test(t)) return { tool: 'leavegc', args: {} }

  // ─── KALKULATOR INSTAN (skills 12 Sep 2026) ───
  // "berapa 25*4+10" / "5+5" → calc tanpa AI call. Nomor telepon gak boleh
  // ketangkap: "+62 812..." angka doang → di-skip.
  if (/^[\d\s+\-*/().^%x×÷]+$/i.test(t) && /\d[\d\s.]*[+\-*/^%]\s*\d/.test(t)) {
    const flat = t.replace(/[\s()\-]/g, "")
    if (!/^(\+?62|0)\d{7,}$/.test(flat)) return { tool: "calc", args: { expr: t } }
  }

  // ─── DOWNLOAD FILE DARI WEB (request owner 12 Sep 2026) ───
  // instan tanpa AI: "download file ini https://situs.com/app.apk"
  if (/\b(download|unduh|unduhin|donlot)\b/.test(t)) {
    const u = (t.match(/https?:\/\/\S+/) || [])[0]
    if (u) return { tool: 'download', args: { url: u } }
  }

  return null // tidak match → lanjut ke AI provider
}

// ================= OTAK AI — MULTI-PROVIDER CHAIN =================
// 🔹 AI AGENT: rantai provider sekarang dari CONFIG FILE biar owner tinggal
// set apikey tanpa sentuh kode: src/lib/apikey/ai-providers.json (list kebawah,
// urutan = prioritas). Dibaca LIVE tiap panggilan — edit file, langsung aktif.
// Provider free (source ikyy) preset key, langsung nembak API-nya.
import { getAiChain } from "./apikey/ai-chain.js";

// 🔹 AI AGENT: Fungsi umum nanya ke AI — coba provider satu-satu sampai sukses
// history opsional: [{role:'user'|'assistant', content}] — dipakai biar AI
// TAHU percakapan sebelumnya (fix bug: user jawab "iya" dianggap sesi baru).
export async function askAI(system, user, history = []) {
  const histTrimmed = Array.isArray(history) ? history.slice(-12) : []
  // Fold history jadi teks buat provider GET (cuma bisa kirim 1 field teks)
  const histAsText = histTrimmed.length
    ? histTrimmed.map(h => `${h.role === 'user' ? 'User' : 'Asisten'}: ${h.content}`).join('\n') + '\n'
    : ''
  const providers = getAiChain()
  if (!providers.length) throw new Error('Rantai AI kosong — cek src/lib/apikey/ai-providers.json')
  for (const p of providers) {
    const key = p.key?.()
    // key kosong & bukan provider free → skip (belum diisi owner)
    if (!key && !p.free) continue
    try {
      let text
      // 🔹 FORMAT MIN1AI (api.1min.ai) — pakai scraper min1ai.js (key aiSatuan.
      // min1ai + parsing resultObject + error map). REQUEST OWNER 11 Sep 2026:
      // "novaai dan autonovaai defaultnya qwen dr min1ai". Chain fold system+
      // history jadi 1 prompt (1min.ai cuma terima promptObject.prompt).
      if (p.format === 'min1ai') {
        const { min1aiChat } = await import('../scraper/min1ai.js')
        const fullPrompt = `${system}\n\n${histAsText ? histAsText + '\n' : ''}User: ${user}`
        // timeoutMs 35 dtk — jangan sampe user nunggu provider pertama hang 2 menit
        text = await min1aiChat(fullPrompt, { model: p.model || 'qwen3-8b', timeoutMs: 35000 })
      } else if (p.method === 'get') {
        const fullPrompt = `${system}\n\n${histAsText}User: ${user}`
        // tiap endpoint GET beda nama param teks (text/question/prompt)
        const tp = p.textParam || 'text'
        const url = key
          ? `${p.url}?apikey=${encodeURIComponent(key)}&${tp}=${encodeURIComponent(fullPrompt)}`
          : `${p.url}?${tp}=${encodeURIComponent(fullPrompt)}`
        const res = await fetch(url, { headers: p.headers(key), signal: AbortSignal.timeout(30000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.result || data?.result?.reply || ''
      } else if (p.format === 'anthropic') {
        // format Anthropic (Claude): system TERPISAH, wajib max_tokens
        const res = await fetch(p.url, {
          method: 'POST',
          headers: p.headers(key),
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            model: p.model,
            system,
            max_tokens: 8192,
            temperature: 0.1,
            messages: [
              ...histTrimmed.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
              { role: 'user', content: user }
            ]
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data?.content?.[0]?.text || ''
      } else {
        // format OpenAI-compatible (groq, deepseek, zhipu, kimi, dll)
        const res = await fetch(p.url, {
          method: 'POST',
          headers: p.headers(key),
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            model: p.model,
            messages: [
              { role: 'system', content: system },
              ...histTrimmed.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
              { role: 'user', content: user }
            ],
            temperature: 0.1,
            max_tokens: 8192
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.choices?.[0]?.message?.content
      }
      if (!text) throw new Error('balasan kosong')
      // FIX: model gpt-oss (groq) sering ngelorotin control char (\u0000 dsb)
      // di akhir output — bikin JSON.parse gagal ("Rule ditolak") & karakter
      // hantu di pesan WA. Strip semua C0 control kecuali newline & tab.
      text = String(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
      if (!text) throw new Error('balasan kosong setelah dibersihin')
      console.log(`[AI] provider "${p.name}" sukses`)
      return text
    } catch (e) {
      console.log(`[AI] provider "${p.name}" gagal: ${e.message} → lanjut provider berikutnya...`)
    }
  }
  throw new Error('Semua provider AI gagal')
}

// 🔹 SANITIZE REPLY — bug nyata dilaporkan owner 12 Sep 2026: ".novaagent hp
// terbaik tahun ini" dijawab niru gaya "Google AI Overview" — nulis markdown
// heading (###), markdown link [label](url), DAN URL PLACEHOLDER PALSU
// (http://googleusercontent.com/lmdx_content/... — bot GAK ADA browsing di
// jalur chat biasa novaai, jadi link itu 100% HALUSINASI model, bukan data
// asli) — hasilnya WhatsApp nampilin teks berantakan+link mati. Sanitizer ini
// jaring pengaman DEFENSI KEDUA (pertama = instruksi format di system prompt
// think() di bawah) — dipanggil di parseAIResponse (novaai.js) sebelum teks
// dikirim ke user.
export function sanitizeAiReply(text) {
  if (!text) return text;
  let s = String(text);
  // markdown link [label](url) → label doang (buang url, WA gak render link markdown)
  s = s.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1");
  // URL ke domain placeholder/tracking yang sering di-halusinasi model
  // (gaya "Google AI Overview"/SGE) — buang total, bukan data asli
  s = s.replace(/https?:\/\/[^\s)]*(?:googleusercontent\.com|gstatic\.com)[^\s)]*/gi, "");
  // markdown heading (### Judul) → buang tanda pagar, teks judul tetap
  s = s.replace(/^#{1,6}\s+/gm, "");
  // baris pembatas markdown murni (---, ***, ___) → buang
  s = s.replace(/^[-*_]{3,}\s*$/gm, "");
  // rapikan spasi/baris kosong berlebih akibat pembersihan di atas
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

// 🔹 DETEKSI QUERY BUTUH INFO TERKINI (fix 12 Sep 2026: owner report ".novaagent
// sebutkan berita X yang viral" cuma dijawab dari training data lama/halusinasi,
// padahal .novaagent gak punya browsing sama sekali — beda dari .aisuperagent).
// Heuristik kata kunci "berita terkini/viral/dll" → trigger quick web search
// SEBELUM think(), hasil dititip ke prompt biar jawaban akurat + boleh sertakan
// link sumber ASLI (bukan halusinasi).
// 🔹 FIX 17 Sep 2026 (owner report "carikan script md 5k fitur" gak nyari
// dari internet): pattern lama cuma nangkep kata "berita/terbaru/cari di web"
// — permintaan CARI BENDA DIGITAL dari internet (script/aplikasi/link/
// template/dll) lolos semua. Pattern tambahan: kata cari + objek digital.
const WEB_SEARCH_OBJECT_PATTERN = /\b(cari(kan|in)?|nyari(n|kan)?|carikan|bantu cari|coba cari)\b[^.?!]{0,60}\b(script|aplikasi|apk|link|website|situs|file|software|program|template|kode|game|produk|tutorial|contoh|rekomendasi|nama)\b/i;
const CURRENT_INFO_PATTERN = /\b(berita|viral|trending|terkini|terbaru|kabar(nya)?|heboh|kejadian|kasus|rame|ramai|hari ini|minggu ini|baru[\s-]?baru ini|browsing|cari di (web|google|internet|internet)|cek di (web|internet)|search di (web|google)|harga (hp|laptop|barang|produk))\b/i;
export function needsWebSearch(text) {
  const t = String(text || "");
  return CURRENT_INFO_PATTERN.test(t) || WEB_SEARCH_OBJECT_PATTERN.test(t);
}

// 🔹 FIX 17 Sep 2026: teks mentah user ("tolong carikan script md 5k fitur")
// bikin search engine ngambek (lowRelevance → null). Bersihin dulu: buang
// kata sopan/pengisi + kata kerja intent cari → sisa objek yang dicari.
export function buildSearchQuery(text) {
  return String(text || "")
    .replace(/\b(tolong|please|dong|ya|yah|deh|sih|min|kak|bang|coba|bantu|bantu aku|bantuin|cukup|kan)\b/gi, ' ')
    .replace(/\b(bantu|coba|tolong)?\s*(cari(kan|in)?|nyari(n|kan)?|search| searching|googling)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || String(text || '').trim();
}

// 🔹 CHAT TERUSAN (owner 17 Sep 2026: "kalau hasil jawabannya banyak banget
// sampai kena batas karakter di chat WA, kirim 2x chat sebagai chat terusan"):
// pecah teks panjang jadi beberapa pesan berantai — split di batas paragraf
// biar gak motong kalimat/kode di tengah baris. Hasil UTUH sampe abis.
export function splitChatChunks(text, { chunkChars = 6000, hardCap = 60000 } = {}) {
  let full = String(text || "");
  if (!full.trim()) return [];
  if (full.length > hardCap) full = full.slice(0, hardCap) + "\n…(teks melebihi batas maksimal WA — sisanya kepotong)";
  const parts = [];
  let rest = full;
  while (rest.length > chunkChars) {
    let cut = rest.lastIndexOf("\n\n", chunkChars);
    if (cut < chunkChars * 0.4) cut = rest.lastIndexOf("\n", chunkChars);
    if (cut < chunkChars * 0.4) cut = chunkChars;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\s*\n+/, "");
  }
  if (rest.trim()) parts.push(rest);
  return parts;
}

// 🔹 seam fallback chromium — semantik: function = mock; null = DISABLED
// (e2e gak boleh launch browser asli); undefined = chromium asli
let _browserSearchForTest;
export function _setBrowserSearchForTest(fn) { _browserSearchForTest = fn; }
export function _clearBrowserSearchForTest() { _browserSearchForTest = undefined; }

// 🔹 FALLBACK CHROMIUM (owner report 17 Sep 2026: "carikan berita makanan
// mbg beracun" dijawab "saya tidak tahu" — engine scrape Bing/DDG/Brave
// balikin SERP SAMPAH dari IP datacenter (tailor/ads page) → lowRelevance
// → null → AI jawab gak tahu. Chromium beneran (html.duckduckgo.com) LEWAT
// blok itu (pola sama kayak googleairich — jalan normal di VPS).
async function browserSearchFallback(query, limit) {
  if (typeof _browserSearchForTest === "function") return _browserSearchForTest(query, { limit });
  if (_browserSearchForTest === null) return null; // e2e disabled
  try {
    const { browserWebSearch } = await import("../scraper/nova-web-browser.js");
    return await browserWebSearch(query, { limit });
  } catch { return null; } // puppeteer gak ada → diem, lanjut jawab dari pengetahuan
}

// 🔹 pipeline internal: items SERP → sources (baca top halaman + filter
// relevansi) — dipakai hasil engine scrape MAUPUN chromium biar gak dobel kode
async function _sourcesFromItems(res, query, readTop) {
  const top = (res.items || []).slice(0, readTop);
  const pages = await Promise.all(top.map((it) =>
    Promise.race([
      fetchPagePreview(it.url),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).catch(() => null)
  ));
  let sources = top.map((it, i) => {
    const p = pages[i];
    const body = (p && !p.error && p.text && String(p.text).trim()) ? String(p.text).slice(0, 900) : (it.snippet || "");
    return { title: (p && p.title) || it.title, url: it.url, body };
  }).filter((s) => s.body);
  // FILTER RELEVANSI (ketemu pas smoke live 12 Sep: query berita MBG balikin
  // profil LinkedIn gak nyambung — konteks sampah bikin AI jawab ngawur).
  // Token query (len>=3, bukan stopwords) wajib overlap dengan title/body.
  const STOP = new Set(["yang","dengan","dan","untuk","dari","ini","itu","apa","kabar","berita","viral","terbaru","terkini","sebutkan","tolong","dong","lagi","banget","dikit","hari","minggu","ada","kasus","kabar"]);
  const tokens = String(query).toLowerCase().match(/[a-z0-9]+/g) || [];
  // stem ringan prefix Indonesia (beracun vs keracunan → core "racun" match)
  const stem = (w) => w.replace(/^(ber|ter|peng|pem|pen|per|ke|pe|me|di|se)/, "");
  const qt = [...new Set(tokens.filter((x) => x.length >= 3 && !STOP.has(x)).map(stem).filter((x) => x.length >= 3))];
  sources = sources.filter((s) => {
    if (!qt.length) return true; // query gak bisa ditoken → jangan buang semua
    const hay = (s.title + " " + s.body).toLowerCase();
    return qt.some((x) => hay.includes(x));
  });
  if (!sources.length) return null;
  const block = sources.map((s, i) => `[S${i + 1}] ${s.title}
Sumber: ${s.url}
${s.body}`).join("\n\n");
  return { block, sources };
}

// Search ringan 1x (bukan multi-fase kayak .aisuperagent) — max 2 halaman
// dibaca, timeout ketat biar gak nyandera timeout budget think(). Gagal =
// null (fallback diam-diam ke jawaban dari pengetahuan model, gak crash).
// 🔹 FIX OWNER 17 Sep 2026: "carikan berita makanan mbg beracun" dijawab
// "saya tidak tahu". Dua lubang: (1) engine scrape balikin SERP sampah
// (lowRelevance) → null; (2) engine "sukses" tapi halaman berita gak kebaca
// (blokir axios → snippet tersisa → filter relevansi buang semua) → null.
// Keduanya sekarang jatuh ke FALLBACK CHROMIUM (browser beneran lolos
// blokir datacenter — pola googleairich).
export async function quickWebSearch(query, { limit = 5, readTop = 2 } = {}) {
  try {
    // ── jalur 1: engine scrape (Bing/DDG/Brave) ──
    const res = await Promise.race([
      searchWeb(query, { limit }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("search timeout")), 12000)),
    ]).catch(() => null);
    if (res && !res.error && !res.lowRelevance && res.items?.length) {
      const out = await _sourcesFromItems(res, query, readTop);
      if (out) return out;
    }
    // ── jalur 2: CHROMIUM (scrape gagal / hasilnya mati semua) ──
    const items = await Promise.race([
      browserSearchFallback(query, limit),
      new Promise((resolve) => setTimeout(() => resolve(null), 28000)),
    ]).catch(() => null);
    if (!items?.length) return null;
    return await _sourcesFromItems({ items, engine: "chromium-ddg" }, query, readTop);
  } catch {
    return null;
  }
}

// 🔹 AI AGENT: think() — nerjemahin bahasa manusia jadi perintah tool (JSON)
// 🔹 AI hanya dipanggil kalau localParse tidak match
// Ekstrak dari think() (fix 12 Sep 2026) — testable tanpa nge-hit AI live,
// dipake e2e buat verifikasi blok webSearch/memory kecantol bener ke prompt.
export function buildThinkSystemPrompt(ctx = {}) {
  // Tools gabungan: TOOLS inti + SKILLS registry (request owner 12 Sep 2026)
  const allTools = { ...TOOLS, ...getAllSkills() }
  let toolsList = Object.entries(allTools)
    .map(([k, v]) => `- ${k}: ${v.desc}${v.args ? ' (butuh args: ' + v.args.join(', ') + ')' : ''}`)
    .join('\n')
  // 🔹 FIX 17 Sep 2026 (owner report "carikan script md 5k fitur" malah
  // dijawab createfile padahal harusnya jawab dari hasil pencarian web):
  // request yang udah ke-trigger quickWebSearch = user minta MENCARI dari
  // internet → tools DIKUNCI (tool & execCommand WAJIB null) biar model gak
  // bisa nyamber createfile/genimage/dll. Deterministik, gak andalkin niat
  // model.
  if (ctx.forceNoTools) {
    toolsList = '(KALI INI TIDAK ADA tool yang boleh dipakai — user minta MENCARI dari internet dan hasil pencarian nyata sudah disediakan di bawah. WAJIB isi "tool": null dan "execCommand": null, jawab lewat field "reply" dari hasil pencarian itu.)'
  }
  // + tool dari server MCP eksternal (kalau ada yang terpasang)
  const mcpTools = (ctx.mcpTools || []).slice(0, 30)
  if (mcpTools.length) {
    toolsList += '\n' + mcpTools.map((t) => `- ${t.name}: ${t.desc}`).join('\n')
  }

  const now = new Date()
  const tanggalSekarang = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta',
  })
  const jamSekarang = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta',
  }) + ' WIB'

  // 🔹 AUTO-EXECUTE: daftar command bot lain (sticker, download, dll) yang boleh dijalankan AI
  const execSection = ctx.executableCmds
    ? `\n\n== COMMAND BOT LAIN YANG BISA KAMU JALANKAN (via execCommand) ==\nCommand yang boleh: ${ctx.executableCmds}\nDaftar lengkap per kategori:\n${ctx.commandList || ''}\nKalau user minta sesuatu yang cocok dengan salah satu command ini (misal "jadikan stiker gambar ini" → command "s", "downloadin video tiktok ini" → command sesuai), isi field "execCommand" dengan NAMA command (tanpa titik/prefix) dan "execArgs" dengan argumennya (boleh kosong string). Field "tool" tetap null untuk kasus ini.`
    : ''
  // ctx.history diisi kalau ada percakapan sebelumnya di sesi ini (dikirim
  // sebagai pesan multi-turn ke provider) — WAJIB dipakai biar reply nyambung,
  // JANGAN pernah kasih sapaan generik ("Halo! Ada yang bisa dibantu?") kalau
  // histori sudah ada, karena artinya user sedang MELANJUTKAN topik.
  const historyNote = (ctx.history && ctx.history.length)
    ? `\n\nPENTING — SESI PERCAKAPAN AKTIF: kamu sudah ngobrol sama user ini sebelumnya (lihat pesan-pesan sebelum pesan terbaru). WAJIB nyambungin jawaban ke topik/konteks obrolan sebelumnya. Kalau user cuma jawab singkat ("iya", "mau", "boleh", "lanjut", dll), itu artinya user MENYETUJUI/MERESPON pertanyaan/tawaran kamu di pesan sebelumnya — TERUSKAN topik itu (misal kalau sebelumnya nawarin resep, langsung kasih resepnya), JANGAN balas sapaan generik seolah obrolan baru dimulai.
PENTING — ANTI REPEAT: pesan user TERBARU adalah perintah yang HARUS dikerjakan SEKARANG. Kalau di histori ada catatan [SUDAH DIEKSEKUSI], permintaan lama itu SUDAH SELESAI dan hasilnya sudah terkirim — JANGAN PERNAH mengulang tool yang sama untuk pesan baru. Minta gambar lalu minta cari sesuatu = dua perintah BERBEDA, kerjakan yang TERBARU.`
    : ''

  const sys = `Kamu adalah otak dari bot WhatsApp bernama "${ctx.botname || 'Bot'}".${historyNote}
Tugasmu MENERJEMAHKAN perintah user menjadi SATU objek JSON saja.

PENTING — FAKTA TERKINI (training data kamu punya cutoff lama, WAJIB pakai info ini, JANGAN tebak dari training data lama):
- Hari ini: ${tanggalSekarang}
- Jam sekarang: ${jamSekarang} (WIB / Asia/Jakarta)
- Presiden Republik Indonesia SAAT INI adalah Prabowo Subianto (dilantik 20 Oktober 2024). JANGAN jawab Joko Widodo/Jokowi sebagai presiden aktif — dia sudah tidak menjabat.
- Wakil Presiden RI saat ini adalah Gibran Rakabuming Raka.
- Jika ditanya jam/tanggal/waktu sekarang, JAWAB LANGSUNG pakai data di atas — JANGAN bilang "tidak bisa mengakses waktu".

Daftar tools grup (manajemen grup, whitelist ketat) yang tersedia:
${toolsList}
- Untuk kick/block/unblock/promote/demote: args.user BOLEH berupa NAMA member (misal "aizat 2") kalau user sebut nama, bukan hanya nomor/mention — sistem akan otomatis cari JID-nya dari nama itu. Isi args.user dengan nama/nomor APAPUN yang disebut user, jangan dikosongkan kalau ada nama yang disebut.${execSection}

Aturan WAJIB:
- Balas HANYA JSON mentah, tanpa \`\`\` dan tanpa teks lain
- Format: {"tool":"nama_tool"|null,"args":{},"execCommand":"nama_command"|null,"execArgs":"","reply":"..."}
- FORMAT FIELD "reply" (WAJIB, kamu TIDAK punya akses browsing/internet real-time di jalur ini — jawab dari pengetahuanmu, JANGAN PURA-PURA browsing): JANGAN PERNAH tulis markdown link [teks](url), JANGAN tulis URL/link apa pun (apalagi yang kamu ngaku-ngaku sebagai gambar/sumber produk — itu PASTI halusinasi, bukan link asli), JANGAN pakai markdown heading (### dst) atau baris pembatas (---), JANGAN niru format "Google AI Overview"/hasil mesin pencari. Tulis jawaban natural ala chat WhatsApp — paragraf pendek atau poin bernomor/•, bahasa biasa, boleh **bold** pakai *bintang* WhatsApp kalau perlu.
- KHUSUS kalau ada blok "== HASIL PENCARIAN WEB TERKINI ==" di bawah: itu hasil browsing ASLI baru saja, WAJIB dipakai sebagai dasar jawaban (jangan tebak dari training data lama untuk topik itu) dan BOLEH cantumkan link sumber [S1]/[S2] yang tercantum PERSIS di blok itu karena itu URL ASLI (bukan halusinasi), format "📎 Sumber: <url>" di akhir reply. Kalau blok itu TIDAK ADA, tetap berlaku aturan JANGAN tulis URL apa pun.
- Nomor WA format 62xxx tanpa + dan tanpa strip. Mention yang tersedia: ${ctx.mentions || 'tidak ada'}
- Untuk setname/setdesc/hidetag/poll isi args.value dengan teksnya
- Kalau "tool" dan "execCommand" TIDAK NULL (aksi grup/command dijalankan): "reply" konfirmasi SINGKAT 1 kalimat TAPI WAJIB natural & hidup kayak asisten sungguhan lagi ngomong ke temen sendiri (request owner 13 Sep: "kliatan agent itu hidup bgt kyk asisten sungguhan") — JANGAN template kaku "Baik, menutup grup."/"Oke, user diblokir." doang, VARIASIKAN gaya bahasa tiap kali (contoh nada: "sip, udah aku tutup ya", "oke beres, langsung aku kick", "noted, aku ganti sekarang"). Cukup nyambung sama aksi yang BENERAN dijalankan, JANGAN nyebut aksi/topik lain yang gak relevan (misal jangan nyebut "gambar" kalau tool yang jalan cuma ganti deskripsi).
- Kalau "tool" dan "execCommand" NULL (user cuma nanya/ngobrol/minta info seperti resep, penjelasan, list, dll): "reply" WAJIB LENGKAP DAN DETAIL, JANGAN dipotong/disingkat, JANGAN bilang "silakan beri tahu lebih lanjut" kalau informasinya sudah bisa kamu jawab langsung dari konteks yang ada. Jawab selengkap yang dibutuhkan, boleh panjang, boleh pakai poin bernomor.
- Jika perintah user BUKAN aksi bot (hanya bertanya/ngobrol), balas: {"tool":null,"execCommand":null,"reply":"jawaban lengkap kamu"}
- PRIORITAS TUGAS INFORMASI (request owner 12 Sep): pertanyaan informasi → JAWAB DARI PENGETAHUANMU SENDIRI DULU (tool:null, reply langsung) — "siapa prabowo", "apa itu fotosintesis", "ibu kota jepang" GAK perlu tool/skill/mcp. Tool (skill wiki/mcp/dll) itu SENJATA TERAKHIR: cuma kalau pertanyaannya emang domain spesifik tool itu DAN kamu bingun jawab sendiri (arti kata resmi → skill kbbi; gempa terkini → skill gempa; dokumentasi library → mcp). JANGAN manggil skill wiki/mcp buat pengetahuan umum yang kamu udah tahu.

Contoh:
"tutup grup" → {"tool":"closegc","args":{},"execCommand":null,"reply":"Sip, grup udah aku tutup ya, sekarang cuma admin yang bisa chat."}
"buatkan gambar kucing astronot" → {"tool":"genimage","args":{"prompt":"seekor kucing astronot di bulan, kartun lucu"},"execCommand":null,"reply":"Oke, gambarnya aku buatkan ya."}
"buatkan gambar kucing 9:16" → {"tool":"genimage","args":{"prompt":"kucing","ratio":"9:16"},"execCommand":null,"reply":"Oke, gambarnya aku buatkan rasio 9:16 ya."}
"kick aizat 2" → {"tool":"kick","args":{"user":"aizat 2"},"execCommand":null,"reply":"Oke beres, aizat 2 langsung aku keluarkan dari grup."}
"blokir 62812" → {"tool":"block","args":{"user":"62812"},"execCommand":null,"reply":"Noted, langsung aku blokir & keluarkan dari grup."}
"ganti deskripsi jadi grup belajar" → {"tool":"setdesc","args":{"value":"grup belajar"},"execCommand":null,"reply":"Sip, deskripsi grupnya udah aku ganti jadi grup belajar."}
"jadikan stiker gambar ini" → {"tool":null,"args":{},"execCommand":"s","execArgs":"","reply":"Oke, aku jadikan stiker ya!"}
"download apk dari https://situs.com/app.apk" → {"tool":"download","args":{"url":"https://situs.com/app.apk"},"execCommand":null,"reply":"Oke, aku unduh filenya ya."}
"buatkan file txt daftar belanja: beras 5kg, minyak 2 liter, gula 1kg" → {"tool":"createfile","args":{"name":"daftarbelanja","ext":"txt","content":"DAFTAR BELANJA\n1. Beras 5kg\n2. Minyak 2 liter\n3. Gula 1kg"},"execCommand":null,"reply":"Oke, aku buatin file txt daftar belanjanya."}
"buatkan file excel data siswa: nama, kelas. Andi 7A, Budi 7B" → {"tool":"createfile","args":{"name":"datasiswa","ext":"xlsx","content":"Nama,Kelas\nAndi,7A\nBudi,7B"},"execCommand":null,"reply":"Oke, aku buatin file Excel-nya."}
"buatkan kode html toko kue" → {"tool":"createfile","args":{"name":"tokokue","ext":"html","content":"<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><title>Toko Kue</title><style>body{font-family:sans-serif;background:#fdf6ec;margin:0}.kartu{background:#fff;border-radius:12px;padding:16px;width:240px;box-shadow:0 2px 8px rgba(0,0,0,.08)}button{background:#e6739f;color:#fff;border:0;padding:8px 16px;border-radius:8px;cursor:pointer}</style></head>\n<body><h1>Toko Kue</h1><div class=\"kartu\"><h3>Black Forest</h3><p>Rp95.000</p><button>Pesan</button></div><script>document.querySelectorAll(\"button\").forEach(b=>b.onclick=()=>alert(\"Pesanan dicatat!\"))</script></body></html>"},"execCommand":null,"reply":"Oke, aku buatin file html toko kuenya."}
RULE kode di content: kode HARUS utuh jadi seperti contoh di atas (boleh & bagus kalau lebih panjang sesuai permintaan) — JANGAN pernah pakai "..." / elipsis / "KODE LENGKAP ..." sebagai placeholder singkatan.
"apa itu nodejs" → {"tool":null,"execCommand":null,"reply":"Node.js adalah runtime JavaScript yang dibangun di atas engine V8 Chrome, dipakai untuk menjalankan JavaScript di luar browser (server-side). Cocok buat backend API, real-time app, dan tooling."}
"jam berapa sekarang" → {"tool":null,"execCommand":null,"reply":"Sekarang jam ${jamSekarang}."}
"siapa presiden indonesia" → {"tool":null,"execCommand":null,"reply":"Presiden Indonesia saat ini adalah Prabowo Subianto, didampingi Wakil Presiden Gibran Rakabuming Raka."}`

  // ctx.memory: blok MEMORI DURABEL tentang user (nova-memory.js) — ditempel
  // ke system prompt biar jawaban nyambung sama fakta user antar sesi
  const memorySection = ctx.memory
    ? `\n\n== MEMORI TENTANG USER ==\n${ctx.memory}`
    : ''

  // ctx.webSearch: hasil quickWebSearch() (fix 12 Sep 2026, lihat needsWebSearch
  // di atas) — dititip ke prompt biar jawaban berita/topik viral akurat +
  // boleh cite link sumber ASLI, bukan halusinasi dari training data lama
  // 🔹 FIX 17 Sep 2026 (owner report "carikan script md 5k fitur" malah
  // dijawab createfile): kalau user minta CARI SESUATU dari internet dan
  // hasil pencariannya ada, WAJIB jawab dari hasil pencarian (tool null) —
  // JANGAN bikin file/gambar. Kata "cari/carikan" = nyari barang/informasi
  // yang SUDAH ADA, bukan minta dibuatkan.
  const webSearchSection = ctx.webSearch
    ? `\n\n== HASIL PENCARIAN WEB TERKINI (HASIL NYATA DARI INTERNET) ==
${ctx.webSearch}

WAJIB: user minta MENCARI/menemukan sesuatu dari internet dan hasil pencarian nyata ada di atas — jawab dari hasil pencarian itu. Set "tool" ke null dan "execCommand" ke null, JANGAN pakai createfile/genimage (itu buat MEMBUAT barang baru, user minta MENCARI yang sudah ada). Sebutin sumber yang relevan secara natural.`
    : ''

  return sys + memorySection + webSearchSection
}

// 🔹 AI AGENT: think() — nerjemahin bahasa manusia jadi perintah tool (JSON)
// 🔹 AI hanya dipanggil kalau localParse tidak match
export async function think(text, ctx = {}) {
  // MCP: daftar tool server eksternal ke-merge ke prompt (best-effort,
  // server down = skip — agent gak boleh mati gara2 satu server ngambek)
  await awaitSkillPacks() // skill pack siap sebelum prompt kebangun
  if (!ctx.mcpTools) {
    try {
      const entries = await getMcpToolEntries()
      ctx.mcpTools = Object.entries(entries).map(([name, v]) => ({ name, desc: v.desc }))
    } catch { ctx.mcpTools = [] }
  }
  // ctx.history: percakapan sebelumnya dari session — fix bug "iya" dianggap
  // sesi baru (AI dulu selalu dipanggil single-shot tanpa histori sama sekali)
  const raw = await askAI(buildThinkSystemPrompt(ctx), text, ctx.history || [])
  const clean = raw.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(clean.slice(start, end + 1))
}
