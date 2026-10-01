// E2E .omnioutfitchanger (14 Sep 2026): virtual try-on multi-item
// (topi+baju+celana+sepatu) via session in-memory + native omnivton (1 item)
// / vision-describe + nano-banana chain (2-4 item). Engine + vision di-inject
// via seam biar gak nyamber API live.
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const {
  config,
  handler,
  handleOutfitPhotoHook,
  parseItemDesc,
  buildMultiItemPrompt,
  _setOmniOutfitDepsForTest,
} = await import(R + "/plugins/ai-image/omnioutfitchanger.js");
const { _resetAllSessionsForTest, getSession } = await import(R + "/src/lib/nova-outfit-session.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || ""));

const IMG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(1500, 7)]);
const SENDER = "62812@s.whatsapp.net";

function mockM(opts = {}) {
  return {
    command: opts.command || "omnioutfitchanger",
    args: opts.args || [],
    prefix: ".",
    chat: opts.chat || SENDER,
    sender: opts.sender || SENDER,
    pushName: "T",
    isGroup: false, isOwner: false, isCommand: opts.isCommand !== false,
    isImage: !!opts.isImage, isMedia: !!opts.isImage || !!opts.isMedia,
    quoted: opts.quoted || null,
    download: async () => opts.downloadBuf || IMG,
    react: async () => {},
    reply: async (txt) => { replies.push(norm(txt)); return { key: { id: "r" } }; },
  };
}
function quotedMock() {
  return { isMedia: true, isImage: true, type: "imageMessage", download: async () => IMG };
}

let replies = [];
let sent = [];
const sockMock = {
  sendMessage: async (chat, payload, opts) => { sent.push({ chat, payload, opts }); },
};

function reset() {
  replies = [];
  sent = [];
  _resetAllSessionsForTest();
}

// ═══ 1. plugin config ═══
out("\n— config —");
t("1a. nama omnioutfitchanger + kategori ai image", config.name === "omnioutfitchanger" && config.category === "ai image");
t("1b. alias lengkap", JSON.stringify(config.alias) === JSON.stringify(["omnioutfitchanger", "outfitchanger", "cobabaju", "tryon"]));

// ═══ 2. parseItemDesc ═══
out("\n— parseItemDesc —");
t("2a. deskripsi valid", parseItemDesc("Red baseball cap, cotton, curved brim.") === "Red baseball cap, cotton, curved brim.");
t("2b. BUKAN_ITEM → null", parseItemDesc("BUKAN_ITEM") === null);
t("2c. terlalu pendek → null", parseItemDesc("cap") === null);
t("2d. teks kosong → null", parseItemDesc("") === null);
t("2e. strip code fence + quote", parseItemDesc('```text\n"blue denim jacket"\n```') === "blue denim jacket");

// ═══ 3. buildMultiItemPrompt ═══
out("\n— buildMultiItemPrompt —");
{
  const p = buildMultiItemPrompt(["red cap", "white t-shirt"]);
  t("3a. numbering item", p.includes("1. red cap") && p.includes("2. white t-shirt"));
  t("3b. jaga wajah/pose/background", /face, identity/.test(p) && /pose/.test(p) && /background/.test(p));
}

// ═══ 4. handler — usage kosong ═══
out("\n— usage kosong —");
{
  reset();
  await handler(mockM({ args: [] }), { sock: sockMock });
  t("4a. usage muncul", replies[0]?.includes("virtual try-on") && replies[0]?.includes("reply foto orang"));
}

// ═══ 5. mulai session — reply foto orang ═══
out("\n— mulai session (reply foto orang) —");
{
  reset();
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  t("5a. konfirmasi foto disimpan", replies[0]?.includes("foto orang disimpan"));
  t("5b. session kebuat", !!getSession(SENDER));
  t("5c. personBuf tersimpan", Buffer.isBuffer(getSession(SENDER)?.personBuf));
}

// ═══ 6. hook tangkep foto item ═══
out("\n— hook: kirim foto item polos —");
{
  reset();
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock }); // mulai session
  replies = [];
  const m1 = mockM({ isImage: true, isCommand: false });
  const handled1 = await handleOutfitPhotoHook(m1);
  t("6a. foto ke-1 ke-handle (return true)", handled1 === true);
  t("6b. reply info item 1/4", replies[0]?.includes("item ke-1/4"));
  t("6c. item nyimpen ke session", getSession(SENDER)?.items.length === 1);

  const m2 = mockM({ isImage: true, isCommand: false });
  await handleOutfitPhotoHook(m2);
  const m3 = mockM({ isImage: true, isCommand: false });
  await handleOutfitPhotoHook(m3);
  const m4 = mockM({ isImage: true, isCommand: false });
  replies = [];
  await handleOutfitPhotoHook(m4);
  t("6d. item ke-4 full → pesan maksimal", replies[0]?.includes("maksimal") && getSession(SENDER)?.items.length === 4);

  // item ke-5 → ditolak, count tetap 4
  const m5 = mockM({ isImage: true, isCommand: false });
  replies = [];
  const handled5 = await handleOutfitPhotoHook(m5);
  t("6e. item ke-5 ditolak (tetap 4)", handled5 === true && getSession(SENDER)?.items.length === 4);
}

// ═══ 7. hook: gak ada session aktif → return false ═══
out("\n— hook tanpa session —");
{
  reset();
  const m1 = mockM({ isImage: true, isCommand: false });
  const handled = await handleOutfitPhotoHook(m1);
  t("7a. return false (lanjut pipeline normal)", handled === false);
}

// ═══ 8. .omnioutfitchanger batal ═══
out("\n— batal —");
{
  reset();
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  replies = [];
  await handler(mockM({ args: ["batal"] }), { sock: sockMock });
  t("8a. konfirmasi dibatalkan", replies[0]?.includes("dibatalkan"));
  t("8b. session terhapus", !getSession(SENDER));

  replies = [];
  await handler(mockM({ args: ["batal"] }), { sock: sockMock });
  t("8c. batal tanpa session → warning", replies[0]?.includes("gak ada session"));
}

// ═══ 9. pakai — tanpa session/item → guide ═══
out("\n— pakai tanpa session —");
{
  reset();
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("9a. guide belum ada item", replies[0]?.includes("belum ada session"));
}

// ═══ 10. pakai — 1 item → native omnivton ═══
out("\n— pakai 1 item (native omnivton) —");
{
  reset();
  let gotOpts = null;
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    zelImage: async (path_, prompt, opts) => {
      gotOpts = { path: path_, prompt, opts };
      return { ok: true, buffer: Buffer.from([1, 2, 3, 4, 5]) };
    },
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  sent = [];
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("10a. panggil endpoint omnivton", gotOpts?.path === "ai-image/omnivton");
  t("10b. opts noText + 2 gambar", gotOpts?.opts?.noText === true && !!gotOpts?.opts?.imageUrl && !!gotOpts?.opts?.imageUrl2);
  t("10c. imageParam person/outfit", gotOpts?.opts?.imageParam === "person" && gotOpts?.opts?.imageParam2 === "outfit");
  t("10d. hasil dikirim via sock.sendMessage", sent.length === 1 && Buffer.isBuffer(sent[0].payload.image));
  t("10e. caption sebut zelapi omnivton", norm(sent[0].payload.caption).includes("zelapi omnivton"));
  t("10f. session kehapus setelah proses", !getSession(SENDER));
}

// ═══ 11. pakai — multi item (vision + nano-banana) ═══
out("\n— pakai multi item (vision + nano-banana) —");
{
  reset();
  let visionCalls = 0;
  let editPromptUsed = "";
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    vision: async ({ question }) => {
      visionCalls++;
      return visionCalls === 1 ? "red baseball cap, cotton" : "white oversized t-shirt, cotton";
    },
    live3d: async (buf, prompt) => {
      editPromptUsed = prompt;
      return { image: Buffer.from([9, 9, 9, 9]) };
    },
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  sent = [];
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("11a. vision dipanggil per item (2x)", visionCalls === 2);
  t("11b. prompt gabungan berisi kedua deskripsi", editPromptUsed.includes("red baseball cap") && editPromptUsed.includes("white oversized t-shirt"));
  t("11c. hasil dikirim", sent.length === 1 && Buffer.isBuffer(sent[0].payload.image));
  t("11d. caption sebut nano-banana", norm(sent[0].payload.caption).includes("nano-banana"));
}

// ═══ 12. pakai — error: endpoint 1 item down ═══
out("\n— pakai 1 item, endpoint down —");
{
  reset();
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    zelImage: async () => ({ ok: false, error: "UPSTREAM_500" }),
    vision: async () => {
      throw new Error("vision down");
    }, // seam deterministik: vision juga gagal → error zelapi asli keluar (bukan nyamber vision live)
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  replies = [];
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("12a. error asli keluar", String(replies[0] || "").toLowerCase().includes("upstream_500"));
  t("12b. session kehapus walau gagal", !getSession(SENDER));
}

// ═══ 13. pakai — error: semua item multi bukan fashion ═══
out("\n— pakai multi item, semua BUKAN_ITEM —");
{
  reset();
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    vision: async () => "BUKAN_ITEM",
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  replies = [];
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("13a. pesan semua item gak kedeteksi", String(replies[0] || "").toLowerCase().includes("gak kedeteksi"));
}

// ═══ 14. pakai — error: semua engine edit down (multi item) ═══
out("\n— pakai multi item, semua engine edit down —");
{
  reset();
  _setOmniOutfitDepsForTest({
    uguu: async () => { throw new Error("upload down"); },
    vision: async () => "black sneakers, leather",
    live3d: async () => { throw new Error("live3d down"); },
    nanoBanana: async () => { throw new Error("kuroneko down"); },
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  await handleOutfitPhotoHook(mockM({ isImage: true, isCommand: false }));
  replies = [];
  await handler(mockM({ args: ["pakai"] }), { sock: sockMock });
  t("14a. error asli semua engine down", replies[0]?.includes("semua engine edit down"));
}

// ═══ 15. session expired (TTL 5 menit) ═══
out("\n— session expired —");
{
  reset();
  _setOmniOutfitDepsForTest({});
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock });
  const sess = getSession(SENDER);
  t("15a. session ada sebelum expired", !!sess);
  sess.createdAt = Date.now() - (6 * 60 * 1000); // mundurin 6 menit (TTL 5 menit)
  t("15b. session hilang setelah TTL lewat", !getSession(SENDER));

  // hook foto polos ke session yang udah expired → gak ke-handle (return false)
  const m1 = mockM({ isImage: true, isCommand: false });
  const handled = await handleOutfitPhotoHook(m1);
  t("15c. hook return false buat session expired", handled === false);
}

// ═══ 16. FIX 17 Sep 2026: one-shot — reply foto orang + caption "pakai" + lampir foto pakaian ═══
out("\n— one-shot: reply foto orang + lampir foto pakaian + pakai —");
{
  reset();
  let gotOpts = null;
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    zelImage: async (path_, prompt, opts) => {
      gotOpts = { path: path_, prompt, opts };
      return { ok: true, buffer: Buffer.from([1, 2, 3, 4, 5]) };
    },
  });
  // satu pesan: reply foto ORANG + caption ".omnioutfitchanger pakai" + LAMPIR foto pakaian
  await handler(mockM({ args: ["pakai"], quoted: quotedMock(), isImage: true }), { sock: sockMock });
  t("16a. TIDAK nyembur usage (langsung proses)", !replies[0] || !replies[0].includes("belum ada session"));
  t("16b. panggil endpoint omnivton one-shot", gotOpts?.path === "ai-image/omnivton");
  t("16c. hasil dikirim langsung", sent.length === 1 && Buffer.isBuffer(sent[0].payload.image));
  t("16d. session kehapus setelah proses", !getSession(SENDER));
}

// ═══ 17. FIX: session aktif + "pakai" + lampir foto pakaian → item terakhir, langsung proses ═══
out("\n— session aktif + lampir foto bareng pakai —");
{
  reset();
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    zelImage: async () => ({ ok: true, buffer: Buffer.from([7, 7, 7]) }),
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock }); // mulai session
  sent = [];
  // caption "pakai" + lampir foto pakaian → harus jadi item lalu langsung proses
  await handler(mockM({ args: ["pakai"], isImage: true }), { sock: sockMock });
  t("17a. langsung proses (bukan hint belum ada item)", !replies.some((r) => r.includes("belum ada session/item")));
  t("17b. hasil dikirim", sent.length === 1 && Buffer.isBuffer(sent[0].payload.image));
}

// ═══ 18. FIX: "pakai" + reply foto orang, belum ada session → mulai session + minta item ═══
out("\n— pakai + reply foto orang (tanpa session) —");
{
  reset();
  await handler(mockM({ args: ["pakai"], quoted: quotedMock() }), { sock: sockMock });
  t("18a. mulai session dari foto reply", !!getSession(SENDER));
  t("18b. balasan minta foto item", replies[0]?.includes("foto orang disimpan") && replies[0]?.includes("kirim foto item"));
}

// ═══ 19. FIX hook: foto item dikirim sambil REPLY ke pesan teks (konfirmasi bot) ═══
out("\n— hook: foto item sambil reply ke pesan teks —");
{
  reset();
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock }); // mulai session
  replies = [];
  // reply ke pesan TEKS (konfirmasi bot) sambil kirim foto item
  const m1 = mockM({ isImage: true, isCommand: false, quoted: { isMedia: false, isImage: false, type: "conversation" } });
  const handled = await handleOutfitPhotoHook(m1);
  t("19a. ke-handle (return true)", handled === true);
  t("19b. item nyimpen ke session", getSession(SENDER)?.items.length === 1);
  t("19c. reply info item", replies[0]?.includes("item ke-1/4"));
  // reply ke pesan GAMBAR tetap gak dianggap item (jalur foto orang)
  const m2 = mockM({ isImage: true, isCommand: false, quoted: quotedMock() });
  const handled2 = await handleOutfitPhotoHook(m2);
  t("19d. reply ke pesan gambar gak dianggap item", handled2 === false && getSession(SENDER)?.items.length === 1);
}

// ═══ 20. FIX: "pakai" + lampir foto pakaian, TANPA session & TANPA reply → hint butuh foto orang ═══
out("\n— pakai + lampir foto, tanpa foto orang —");
{
  reset();
  await handler(mockM({ args: ["pakai"], isImage: true }), { sock: sockMock });
  t("20a. hint butuh foto orang", String(replies[0] || "").toLowerCase().includes("belum ada foto orang"));
  t("20b. gak ada session nyasar", !getSession(SENDER));
}

// ═══ 21z. FALLBACK: zelapi omnivton gagal (key invalid/down) → nano-banana chain ═══
out("\n— 1 item zelapi down → fallback nano-banana —");
{
  reset();
  let visionPrompt = "";
  let editPrompt = "";
  _setOmniOutfitDepsForTest({
    uguu: async (buf, name) => `https://uguu.se/${name}`,
    zelImage: async () => ({ ok: false, error: "API_KEY_INVALID (403)" }), // zelapi mati
    vision: async ({ question }) => {
      visionPrompt = question;
      return "black leather jacket, cotton lining";
    },
    live3d: async (buf, prompt) => {
      editPrompt = prompt;
      return { image: Buffer.from([3, 3, 3, 3]) };
    },
  });
  await handler(mockM({ args: [], quoted: quotedMock() }), { sock: sockMock }); // mulai session 1 item (one-shot di bawah)
  await handler(mockM({ args: ["pakai"], quoted: quotedMock(), isImage: true }), { sock: sockMock }); // one-shot reply orang + lampir item
  t("21z-a. hasil tetap dikirim walau zelapi down", sent.length === 1 && Buffer.isBuffer(sent[0].payload.image));
  t("21z-b. vision dipakai buat describe item", norm(visionPrompt || "").length > 0);
  t("21z-c. edit prompt nyebut item hasil describe", norm(editPrompt).includes("leather jacket"));
  t("21z-d. caption sebut fallback engine", norm(String(sent[0].payload.caption)).includes("fallback"));
  t("21z-e. session kehapus", !getSession(SENDER));
}

// ═══ 21. usage: ada cara cepet one-shot ═══
out("\n— usage: cara cepet —");
{
  reset();
  await handler(mockM({ args: [] }), { sock: sockMock });
  t("21a. usage nunjuk cara cepet one-shot", replies[0]?.includes("cara cepet"));
}

out(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail > 0 ? 1 : 0);
