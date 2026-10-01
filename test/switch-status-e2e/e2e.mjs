// E2E: .switch format status baru (nama fitur smallcaps + status di akhir)
// + command ".switch status all" menampilkan semua status aktif & mati.
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
const { toSC } = await import(R + "/src/lib/rara-menu-style.js")
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

const scOn = toSC("on"), scOff = toSC("off")
const expectLine = (txt, key, state) =>
  txt.includes(toSC(key) + " " + (state ? scOn : scOff))

// ═══ 1. .switch status all (DM) ═══
await handler(mockM(["status", "all"]), { sock: {}, config })
const all = replies.at(-1)
t("1a. header kategori smallcaps", all.includes(toSC("Info & Utilitas")), all.slice(0, 200))
t("1b. gak ada lagi format lama 'ON  key'", !/^ON {1,2}/m.test(all) && !/\nON /.test(all))
t("1c. bencanawatch ada status di akhir", expectLine(all, "bencanawatch", true) || expectLine(all, "bencanawatch", false))
t("1d. semua fitur auto ke-list (webwatch)", all.includes(toSC("webwatch")))
t("1e. automovienotifier masuk daftar", all.includes(toSC("automovienotifier")))
t("1f. cryptoalert masuk daftar", all.includes(toSC("cryptoalert")))
t("1g. section saluran ada", all.includes(toSC("Saluran")))
t("1h. ringkasan fitur command nonaktif", all.includes(toSC("command nonaktif")))
const recapRe = new RegExp(toSC("Aktif") + ": \\d+ \\| " + toSC("Mati") + ": \\d+ \\| " + toSC("Total") + ": \\d+")
t("1i. rekap aktif/mati/total", recapRe.test(all), all.split("\n").at(-2))
t("1j. dari DM → gak ada section group", !all.includes(toSC("Group (Chat Ini)")))

// ═══ 2. .switch auto — format baru ═══
await handler(mockM(["auto"]), { sock: {}, config })
const auto = replies.at(-1)
t("2a. header kategori smallcaps", auto.includes(toSC("Sistem & Respon")))
t("2b. format 'ʙᴇɴᴄᴀɴᴀᴡᴀᴛᴄʜ ᴏɴ' di akhir fitur", expectLine(auto, "bencanawatch", true) || expectLine(auto, "bencanawatch", false))
t("2c. gak ada 'ON  autoread' lama", !auto.includes("ON  ") && !auto.includes("OFF  "))
t("2d. semua AUTO_CATEGORIES hadir", ["Sistem & Respon", "Pemeliharaan", "Retensi & Finansial", "Info & Utilitas"].every((c) => auto.includes(toSC(c))))

// ═══ 3. .switch group di grup — format baru ═══
await handler(mockM(["group"], { chat: "12036302@g.us", isGroup: true }), { sock: {}, config })
const grp = replies.at(-1)
t("3a. listing group format baru (welcome + status di akhir)", expectLine(grp, "welcome", true) || expectLine(grp, "welcome", false))
t("3b. listing group gak ada format lama", !grp.includes("ON  ") && !grp.includes("OFF  "))

// ═══ 4. .switch channel — status di akhir label ═══
await handler(mockM(["channel"]), { sock: {}, config })
const ch = replies.at(-1)
t("4a. channel gak pakai format '— ON' lama", !/— \*ON\*/.test(ch) && !/— \*OFF\*/.test(ch))
t("4b. channel label + status kecil di akhir", ch.includes(scOn) || ch.includes(scOff))

// ═══ 5. .switch status (tanpa 'all') juga jalan ═══
await handler(mockM(["status"]), { sock: {}, config })
t("5a. '.switch status' → status semua juga", replies.at(-1).includes(toSC("Info & Utilitas")))

// ═══ 6. Sampling format baris persis contoh owner ═══
const sample = all.split("\n").find((l) => l.startsWith(toSC("bencanawatch")))
out("   ↳ contoh baris: " + sample)
t("6a. baris persis pola '<fitur>ᴏɴ/ᴏꜰꜰ' tanpa bullet", sample && (sample.endsWith(scOn) || sample.endsWith(scOff)))

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
  t("n3. menu utama tampilkan target sekarang", main.text.includes(toSC("Target sekarang")), main.text.slice(0, 80))

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
  t("n10. set grup <jid> mentah diterima dari klik tombol", replies.some((r) => r.includes("grup terpilih") && r.includes("12036302TEST@g.us")), replies.at(-1)?.slice(0, 100))

  // 5. fallback teks: sock tanpa sendButton → m.reply tetep jalan
  const before = replies.length
  await handler(mockM(["auto", "autosholat", "set"]), { sock: {}, config })
  t("n11. fallback teks menu utama (sendButton gak ada)", replies.length === before + 1 && /TARGET|Target/i.test(replies.at(-1)))

  // 6. set dm semua via id tombol (simulasi klik) → config dm all
  await handler(mockM(["auto", "autosholat", "set", "dm", "semua"]), { sock: {}, config })
  t("n12. klik tombol Semua User DM → set dm semua jalan", replies.some((r) => /SEMUA DM/i.test(r)))

  // 7. klik tombol gabungan + reset
  await handler(mockM(["auto", "autosholat", "set", "gabungan"]), { sock: {}, config })
  t("n13. klik tombol Gabungan jalan", replies.some((r) => /SEMUA GRUP \+ SEMUA DM|GRUP \+ SEMUA DM/i.test(r)))
  await handler(mockM(["auto", "autosholat", "set", "reset"]), { sock: {}, config })
  t("n14. klik tombol Reset jalan", replies.some((r) => /direset ke default/i.test(r)))
}

process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
