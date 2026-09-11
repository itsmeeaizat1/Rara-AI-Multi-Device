// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
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

export const TOOLS = {
  // ─── BUKA/TUTUP GRUP ───
  closegc: {
    perm: 'admin', danger: false,
    desc: 'menutup grup agar hanya admin yang bisa chat',
    done: '✅ Grup ditutup. Sekarang hanya admin yang bisa chat.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'announcement')
  },
  opengc: {
    perm: 'admin', danger: false,
    desc: 'membuka grup agar semua member bisa chat',
    done: '✅ Grup dibuka. Semua member bisa chat.',
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
      const { callImageGen } = await import('./nova-ai-service.js');
      const img = await callImageGen('gemini', prompt);
      await conn.sendMessage(m.chat, {
        image: Buffer.from(img.base64, 'base64'),
        caption: '🎨 ' + prompt.slice(0, 150),
      }, { quoted: m });
    }
  },

  // ─── MANAJEMEN MEMBER ───
  kick: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan member dari grup',
    done: '✅ User dikeluarkan dari grup.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'remove')
    }
  },
  add: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menambahkan nomor ke grup',
    done: '✅ User ditambahkan ke grup.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'add')
    }
  },
  promote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menjadikan member sebagai admin',
    done: '✅ User sekarang menjadi admin.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'promote')
    }
  },
  demote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menurunkan admin menjadi member biasa',
    done: '✅ User diturunkan menjadi member biasa.',
    run: async (conn, m, a) => {
      const pid = await resolveParticipantId(conn, m, a.user)
      return conn.groupParticipantsUpdate(m.chat, [pid], 'demote')
    }
  },

  // ─── BLOKIR / UNBLOKIR (kick + blocklist lokal) ───
  block: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan dan memblokir user dari grup (tidak bisa masuk lagi)',
    done: '✅ User diblokir dan dikeluarkan dari grup.',
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
    done: '✅ User dibebaskan dari blokir grup.',
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
    done: '✅ Nama grup diganti.',
    run: (conn, m, a) => conn.groupUpdateSubject(m.chat, a.value)
  },
  setdesc: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti deskripsi grup',
    done: '✅ Deskripsi grup diganti.',
    run: (conn, m, a) => conn.groupUpdateDescription(m.chat, a.value)
  },
  setpp: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti foto profil grup (reply gambar atau kirim gambar dengan caption)',
    done: '✅ Foto profil grup diganti.',
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
    done: '✅ Info grup dikunci. Hanya admin yang bisa mengedit.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'locked')
  },
  unlockedit: {
    perm: 'admin', danger: false,
    desc: 'membuka kunci pengaturan grup agar semua member bisa edit info grup',
    done: '✅ Info grup dibuka. Semua member bisa mengedit.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'unlocked')
  },

  // ─── LINK GRUP ───
  getlink: {
    perm: 'admin', danger: false,
    desc: 'mendapatkan link invite grup',
    done: '✅ Link grup diambil.',
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
    done: '✅ Link grup direset. Link lama tidak berlaku lagi.',
    run: (conn, m) => conn.groupRevokeInvite(m.chat)
  },

  // ─── APPROVAL MODE (member baru harus di-approve) ───
  approvalon: {
    perm: 'admin', danger: false,
    desc: 'mengaktifkan mode persetujuan member (member baru harus di-approve admin)',
    done: '✅ Mode persetujuan member aktif. Member baru harus di-approve admin dulu.',
    run: async (conn, m) => {
      const patch = { memberApprovalMode: { isMemberApprovalRequired: true } }
      await conn.groupSettingUpdate(m.chat, patch)
    }
  },
  approvaloff: {
    perm: 'admin', danger: false,
    desc: 'mematikan mode persetujuan member (member bisa langsung gabung)',
    done: '✅ Mode persetujuan member dimatikan. Member bisa langsung gabung.',
    run: async (conn, m) => {
      const patch = { memberApprovalMode: { isMemberApprovalRequired: false } }
      await conn.groupSettingUpdate(m.chat, patch)
    }
  },

  // ─── TAG / ANNOUNCE ───
  hidetag: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'memberi tag kepada semua member dengan pesan',
    done: '✅ Tag terkirim ke semua member.',
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
    done: '✅ Tag admin terkirim.',
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
    done: '✅ Polling dibuat.',
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
    done: '✅ Info grup ditampilkan.',
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
    done: '✅ Pesan dihapus.',
    run: async (conn, m) => {
      if (!m.quoted) throw new Error('Reply pesan yang mau dihapus.')
      await conn.sendMessage(m.chat, { delete: m.quoted.key })
    }
  },

  // ─── OWNER ONLY: LEAVE GROUP ───
  leavegc: {
    perm: 'owner', danger: false,
    desc: 'bot keluar dari grup (owner only)',
    done: '✅ Bot keluar dari grup.',
    run: (conn, m) => conn.groupLeave(m.chat)
  },
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

  // ─── LINK GRUP ───
  if (/(link|tautan|invite)\b/.test(t) && /(grup|gc|group)/.test(t) && !/reset|revoke/.test(t))
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
            max_tokens: 2048,
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
            max_tokens: 2048
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

// 🔹 AI AGENT: think() — nerjemahin bahasa manusia jadi perintah tool (JSON)
// 🔹 AI hanya dipanggil kalau localParse tidak match
export async function think(text, ctx = {}) {
  const toolsList = Object.entries(TOOLS)
    .map(([k, v]) => `- ${k}: ${v.desc}${v.args ? ' (butuh args: ' + v.args.join(', ') + ')' : ''}`)
    .join('\n')

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
    ? `\n\nPENTING — SESI PERCAKAPAN AKTIF: kamu sudah ngobrol sama user ini sebelumnya (lihat pesan-pesan sebelum pesan terbaru). WAJIB nyambungin jawaban ke topik/konteks obrolan sebelumnya. Kalau user cuma jawab singkat ("iya", "mau", "boleh", "lanjut", dll), itu artinya user MENYETUJUI/MERESPON pertanyaan/tawaran kamu di pesan sebelumnya — TERUSKAN topik itu (misal kalau sebelumnya nawarin resep, langsung kasih resepnya), JANGAN balas sapaan generik seolah obrolan baru dimulai.`
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
- Nomor WA format 62xxx tanpa + dan tanpa strip. Mention yang tersedia: ${ctx.mentions || 'tidak ada'}
- Untuk setname/setdesc/hidetag/poll isi args.value dengan teksnya
- Kalau "tool" dan "execCommand" TIDAK NULL (aksi grup/command dijalankan): "reply" cukup konfirmasi SINGKAT 1 kalimat.
- Kalau "tool" dan "execCommand" NULL (user cuma nanya/ngobrol/minta info seperti resep, penjelasan, list, dll): "reply" WAJIB LENGKAP DAN DETAIL, JANGAN dipotong/disingkat, JANGAN bilang "silakan beri tahu lebih lanjut" kalau informasinya sudah bisa kamu jawab langsung dari konteks yang ada. Jawab selengkap yang dibutuhkan, boleh panjang, boleh pakai poin bernomor.
- Jika perintah user BUKAN aksi bot (hanya bertanya/ngobrol), balas: {"tool":null,"execCommand":null,"reply":"jawaban lengkap kamu"}

Contoh:
"tutup grup" → {"tool":"closegc","args":{},"execCommand":null,"reply":"Baik, menutup grup."}
"buatkan gambar kucing astronot" → {"tool":"genimage","args":{"prompt":"seekor kucing astronot di bulan, kartun lucu"},"execCommand":null,"reply":"Oke, gambarnya aku buatkan ya."}
"kick aizat 2" → {"tool":"kick","args":{"user":"aizat 2"},"execCommand":null,"reply":"Oke, coba kick aizat 2."}
"blokir 62812" → {"tool":"block","args":{"user":"62812"},"execCommand":null,"reply":"Oke, user diblokir."}
"ganti deskripsi jadi grup belajar" → {"tool":"setdesc","args":{"value":"grup belajar"},"execCommand":null,"reply":"Oke."}
"jadikan stiker gambar ini" → {"tool":null,"args":{},"execCommand":"s","execArgs":"","reply":"Oke, aku jadikan stiker ya!"}
"apa itu nodejs" → {"tool":null,"execCommand":null,"reply":"Node.js adalah runtime JavaScript yang dibangun di atas engine V8 Chrome, dipakai untuk menjalankan JavaScript di luar browser (server-side). Cocok buat backend API, real-time app, dan tooling."}
"jam berapa sekarang" → {"tool":null,"execCommand":null,"reply":"Sekarang jam ${jamSekarang}."}
"siapa presiden indonesia" → {"tool":null,"execCommand":null,"reply":"Presiden Indonesia saat ini adalah Prabowo Subianto, didampingi Wakil Presiden Gibran Rakabuming Raka."}`

  // ctx.history: percakapan sebelumnya dari session — fix bug "iya" dianggap
  // sesi baru (AI dulu selalu dipanggil single-shot tanpa histori sama sekali)
  const raw = await askAI(sys, text, ctx.history || [])
  const clean = raw.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(clean.slice(start, end + 1))
}
