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

  // ─── MANAJEMEN MEMBER ───
  kick: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan member dari grup',
    done: '✅ User dikeluarkan dari grup.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'remove')
  },
  add: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menambahkan nomor ke grup',
    done: '✅ User ditambahkan ke grup.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'add')
  },
  promote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menjadikan member sebagai admin',
    done: '✅ User sekarang menjadi admin.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'promote')
  },
  demote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menurunkan admin menjadi member biasa',
    done: '✅ User diturunkan menjadi member biasa.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'demote')
  },

  // ─── BLOKIR / UNBLOKIR (kick + blocklist lokal) ───
  block: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan dan memblokir user dari grup (tidak bisa masuk lagi)',
    done: '✅ User diblokir dan dikeluarkan dari grup.',
    run: async (conn, m, a) => {
      await conn.groupParticipantsUpdate(m.chat, [a.user], 'remove')
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
  if (/(kick|keluarkan|usir|tendang|buang)/.test(t)) return { tool: 'kick', args: {} }

  // ─── BLOKIR/UNBLOKIR ───
  if (/(blokir|blok|block|ban)\b/.test(t) && !/(unblok|unban|buka blokir|buka blok)/.test(t))
    return { tool: 'block', args: {} }
  if (/(unblokir|unblok|unblock|unban|buka blokir|buka blok|bebaskan)/.test(t))
    return { tool: 'unblock', args: {} }

  // ─── ADD MEMBER ───
  if (/(tambahkan|masukkan|add|tambah).*(nomor|member|orang|ke grup|ke gc|to group)/.test(t)) return { tool: 'add', args: {} }

  // ─── PROMOTE/DEMOTE ───
  if (/(jadikan|adminin|promote|naikin).*(admin)/.test(t)) return { tool: 'promote', args: {} }
  if (/(turunkan|cabut admin|demote|turunin).*(admin|member)/.test(t)) return { tool: 'demote', args: {} }

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
  if (/(aktifkan|on|nyalakan).*(approval|persetujuan|approve)/.test(t)) return { tool: 'approvalon', args: {} }
  if (/(matikan|off|nonaktifkan).*(approval|persetujuan|approve)/.test(t)) return { tool: 'approvaloff', args: {} }

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

// ================= OTAK AI — PROVIDER CHAIN =================
// 🔹 AI AGENT: Urutan provider — Groq utama (cepat 0.1s), IkyyXD fallback (gratis), DeepSeek cadangan
const PROVIDERS = [
  {
    name: 'groq',
    method: 'post',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () => process.env.GROQ_KEY || global.groqkey || '',
    model: 'openai/gpt-oss-120b',
    headers: (k) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`
    })
  },
  {
    name: 'ikyyxd-gemini',
    method: 'get',
    url: 'https://api.ikyyxd.my.id/ai/gemini',
    key: () => {
      try { return JSON.parse(fs.readFileSync('src/lib/apikey/apikeys.json','utf8')).ikyyxd || '' } catch { return '' }
    },
    headers: () => ({ 'Content-Type': 'application/json' })
  },
  {
    name: 'deepseek',
    method: 'post',
    url: 'https://api.deepseek.com/chat/completions',
    key: () => process.env.DEEPSEEK_KEY || global.deepseekkey || '',
    model: 'deepseek-chat',
    headers: (k) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`
    })
  }
]

// 🔹 AI AGENT: Fungsi umum nanya ke AI — coba provider satu-satu sampai sukses
export async function askAI(system, user) {
  for (const p of PROVIDERS) {
    const key = p.key?.()
    if (p.key && !key) continue
    try {
      let text
      if (p.method === 'get') {
        const fullPrompt = `${system}\n\n${user}`
        const url = `${p.url}?apikey=${encodeURIComponent(key)}&text=${encodeURIComponent(fullPrompt)}`
        const res = await fetch(url, { headers: p.headers(key) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.result || ''
      } else {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: p.headers(key),
          body: JSON.stringify({
            model: p.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            temperature: 0.1
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.choices?.[0]?.message?.content
      }
      if (!text) throw new Error('balasan kosong')
      console.log(`[AI] ${p.name} sukses`)
      return text
    } catch (e) {
      console.log(`[AI] ${p.name} gagal: ${e.message} → coba berikutnya...`)
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

  const sys = `Kamu adalah otak dari bot WhatsApp bernama "${ctx.botname || 'Bot'}".
Tugasmu MENERJEMAHKAN perintah user menjadi SATU objek JSON saja.

Daftar tools yang tersedia:
${toolsList}

Aturan WAJIB:
- Balas HANYA JSON mentah, tanpa \`\`\` dan tanpa teks lain
- Format: {"tool":"nama_tool","args":{},"reply":"kalimat singkat"}
- Nomor WA format 62xxx tanpa + dan tanpa strip. Mention yang tersedia: ${ctx.mentions || 'tidak ada'}
- Untuk setname/setdesc/hidetag/poll isi args.value dengan teksnya
- Jika perintah user BUKAN aksi bot (hanya bertanya/ngobrol), balas: {"tool":null,"reply":"jawaban percakapanmu"}

Contoh:
"tutup grup" → {"tool":"closegc","args":{},"reply":"Baik, menutup grup."}
"kick 62812" → {"tool":"kick","args":{"user":"62812"},"reply":"Oke."}
"blokir 62812" → {"tool":"block","args":{"user":"62812"},"reply":"Oke, user diblokir."}
"ganti deskripsi jadi grup belajar" → {"tool":"setdesc","args":{"value":"grup belajar"},"reply":"Oke."}
"apa itu nodejs" → {"tool":null,"reply":"Node.js adalah runtime JavaScript..."}`

  const raw = await askAI(sys, text)
  const clean = raw.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(clean.slice(start, end + 1))
}
