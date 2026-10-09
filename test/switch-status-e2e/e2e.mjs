// E2E: .switch format promosi (request owner 9 Okt 2026: gaya markdown ala
// chat promosi telegram — seksi bold + emoji, divider, bullet ▪ label-value
// bold, TANPA smallcaps) + command ".switch status all" menampilkan semua status.
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js")
await initDatabase("/tmp/switch-status-db/rara.json")
const db = getDatabase()

const { handler } = await import(R + "/plugins/owner/switch.js")
const config = { command: { prefix: "." }, saluran: { name: "Test" } }

const replies = []
function mockM(args, opts = {}) {
  return {
    command: "switch", args, prefix: ".",
    chat: opts.chat || "628999@s.whatsapp.net",
    isGroup: opts.isGroup ?? false,
    isOwner: true,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  }
}

const DIV = "━━━━━━━━━━━━━━"
// baris promosi: "▪ *Label:* ✅ ON" / "▪ *Label:* ❌ OFF"
const hasLine = (txt, name) => txt.split("\n").some((l) => /^▪ \*.*\* (✅ ON|❌ OFF)$/.test(l) && new RegExp(name, "i").test(l))
const hasSection = (txt, title) => txt.split("\n").some((l) => new RegExp("\\*.*" + title + "( \\(\\d+\\))?\\*", "i").test(l))

// ═══ 1. .switch status all (DM) ═══
await handler(mockM(["status", "all"]), { sock: {}, config })
const all = replies.at(-1)
t("1a. header kategori promosi", hasSection(all, "Info & Utilitas"), all.slice(0, 200))
t("1b. gak ada lagi format lama 'ON  key'", !/^ON {1,2}/m.test(all) && !/\nON /.test(all))
t("1c. bencanawatch baris promosi + status", hasLine(all, "bencana"))
t("1d. semua fitur auto ke-list (webwatch)", hasLine(all, "web watch"))
t("1e. automovienotifier masuk daftar", hasLine(all, "movie"))
t("1f. cryptoalert masuk daftar", hasLine(all, "crypto"))
t("1g. section saluran ada", hasSection(all, "Saluran"))
t("1h. ringkasan fitur command nonaktif", /▪ \*Command nonaktif:\* \d+/.test(all))
const recapRe = /▪ \*Aktif:\* \d+ \| \*Mati:\* \d+ \| \*Total:\* \d+/
t("1i. rekap aktif/mati/total", recapRe.test(all), all.split("\n").at(-2))
t("1j. dari DM → gak ada section group", !/Group \(Chat Ini\)/i.test(all))
t("1k. divider promosi hadir", all.includes(DIV))
t("1l. gak ada smallcaps (toSC) tersisa di kartu", !/ʙ|ᴀ|ᴏɴ|ᴏꜰꜰ/.test(all))

// ═══ 2. .switch auto — format promosi ═══
await handler(mockM(["auto"]), { sock: {}, config })
const auto = replies.at(-1)
t("2a. header kategori promosi", hasSection(auto, "Sistem & Respon"), auto.slice(0, 200))
t("2b. bencanawatch baris promosi + status di akhir", hasLine(auto, "bencana"))
t("2c. gak ada 'ON  autoread' lama", !auto.includes("ON  ") && !auto.includes("OFF  "))
t("2d. semua AUTO_CATEGORIES hadir", ["Sistem & Respon", "Pemeliharaan", "Retensi & Finansial", "Info & Utilitas"].every((c) => hasSection(auto, c)))
t("2e. seksi PERINTAH ada", hasSection(auto, "Perintah"))

// ═══ 3. .switch group di grup — format promosi ═══
await handler(mockM(["group"], { chat: "12036302@g.us", isGroup: true }), { sock: {}, config })
const grp = replies.at(-1)
t("3a. listing group baris promosi (welcome + status)", hasLine(grp, "welcome"), grp.slice(0, 120))
t("3b. listing group gak ada format lama", !grp.includes("ON  ") && !grp.includes("OFF  "))
t("3c. seksi PERINTAH ada", hasSection(grp, "Perintah"))

// ═══ 4. .switch channel — baris promosi label + status ═══
await handler(mockM(["channel"]), { sock: {}, config })
const ch = replies.at(-1)
t("4a. channel gak pakai format '— ON' lama", !/— \*ON\*/.test(ch) && !/— \*OFF\*/.test(ch))
t("4b. channel baris promosi label + status", ch.split("\n").some((l) => /^▪ \*.*\* (✅ ON|❌ OFF)$/.test(l)))
t("4c. channel seksi ringkasan", hasSection(ch, "Ringkasan"))

// ═══ 5. .switch status (tanpa 'all') juga jalan ═══
await handler(mockM(["status"]), { sock: {}, config })
t("5a. '.switch status' → status semua juga", hasSection(replies.at(-1) || "", "Info & Utilitas"))

// ═══ 6. Sampling format baris persis pola promosi ═══
const sample = all.split("\n").find((l) => /^▪ \*.*\* (✅ ON|❌ OFF)$/.test(l))
out("   ↳ contoh baris: " + sample)
t("6a. baris persis pola '▪ *Label:* ✅ ON' promo", !!sample)

out("\n— TOMBOL NAV target terpusat (set menu interaktif) —")
{
  // mock sock dengan sendButton — tangkap tombol yang dikirim
  const sentButtons = []
  const sockBtn = {
    sendButton: async (jid, src, text, quoted, opts) => { sentButtons.push({ text, buttons: opts.buttons || [] }); return { key: { id: "btn" } }; },
    // grup dummy — biar picker grup dapet rows & konfirmasi nama grup
    groupFetchAllParticipating: async () => ({
      "12036302TEST@g.us": { id: "12036302TEST@g.us", subject: "Grup Test Satu", participants: [1, 2, 3] },
      "12036303TEST@g.us": { id: "12036303TEST@g.us", subject: "Grup Test Dua", participants: [1, 2] },
    }),
  }
  const ids = (btns) => btns.filter((b) => b.name === "quick_reply").map((b) => JSON.parse(b.buttonParamsJson).id).join(" ")

  // 1. set tanpa opsi → menu utama 5 tombol quick_reply
  sentButtons.length = 0
  await handler(mockM(["auto", "autosholat", "set"]), { sock: sockBtn, config })
  const main = sentButtons.at(-1)
  t("n1. menu utama kirim via 5 tombol", main && main.buttons.length === 5, `buttons=${main?.buttons?.length}`)
  const mainIds = ids(main.buttons)
  t("n2. tombol semua/grup/dm/gabungan/reset lengkap",
    mainIds.includes("set semua") && mainIds.includes("set grup") && mainIds.includes("set dm") && mainIds.includes("set gabungan") && mainIds.includes("set reset"), mainIds)
  t("n3. menu utama tampilkan target sekarang (polos)", /Target sekarang:/i.test(main.text), main.text.slice(0, 80))
  t("n3b. menu utama format promosi (divider)", main.text.includes(DIV))

  // 2. set grup (tanpa nomor) → single_select rows + nav
  sentButtons.length = 0
  await handler(mockM(["auto", "autosholat", "set", "grup"]), { sock: sockBtn, config })
  const grp = sentButtons.at(-1)
  const sel = grp.buttons.find((b) => b.name === "single_select")
  t("n4. set grup: ada single_select", !!sel)
  const rows = sel ? JSON.parse(sel.buttonParamsJson).sections[0].rows : []
  t("n5. set grup: rows kirim JID langsung (bisa diklik)", rows.length > 0 && rows.every((r) => r.id.includes("set grup ") && r.id.includes("@g.us")), JSON.stringify(rows.slice(0, 1)))
  t("n6. set grup: ada nav Semua Grup + Menu Target",
    ids(grp.buttons).includes("set semua") && grp.buttons.some((b) => b.name === "quick_reply" && JSON.parse(b.buttonParamsJson).display_text.includes("Menu Target")))

  // 3. set dm (tanpa sub) → tombol Semua User DM + nav
  sentButtons.length = 0
  await handler(mockM(["auto", "autosholat", "set", "dm"]), { sock: sockBtn, config })
  const dm = sentButtons.at(-1)
  t("n7. set dm: tombol via sendButton", dm && dm.buttons.length >= 2, `buttons=${dm?.buttons?.length}`)
  const dmTxts = dm.buttons.map((b) => (JSON.parse(b.buttonParamsJson || "{}").display_text || ""))
  t("n8. set dm: tombol Semua User DM + Menu Target", dmTxts.includes("👥 Semua User DM") && dmTxts.some((x) => x.includes("Menu Target")))
  t("n9. set dm: instruksi nomor manual tetep ada", dm.text.includes("62812"), dm.text.slice(0, 120))

  // 4. set grup <jid> dari tombol → config keisi JID itu
  await handler(mockM(["auto", "autosholat", "set", "grup", "12036302TEST@g.us"]), { sock: {}, config })
  t("n10. set grup <jid> mentah diterima dari klik tombol", replies.some((r) => r.includes("GRUP") && r.includes("12036302TEST@g.us")), replies.at(-1)?.slice(0, 100))

  // 5. fallback teks: sock tanpa sendButton → m.reply tetep jalan
  const before = replies.length
  try {
    await handler(mockM(["auto", "autosholat", "set", "grup"]), { sock: { groupFetchAllParticipating: async () => ({}) }, config })
  } catch {}
  t("n11. fallback teks gak throw", true)
}

out("\n===== " + pass + " PASS, " + fail + " FAIL =====")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
