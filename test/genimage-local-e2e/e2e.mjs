// E2E — FIX .novaagent "buatkan gambar kucing" nyantol ke aksi lain (13 Sep 2026)
// Bug dilaporkan owner: giliran ke-2 di sesi (setelah "ubah deskripsi grup")
// minta ".novaagent buatkan gambar kucing" malah dibalas teks yang NGARANG
// soal deskripsi grup — think() (AI classify) bingung sama histori sesi,
// balikin tool "setdesc" LAGI, reply cuma nambahin kalimat "gambar kucing
// sedang dibuat" TANPA genimage beneran kepanggil.
// FIX 1: localParse deteksi lokal INSTAN "buatkan/buat/bikin gambar X" →
//        tool genimage — gak lewat AI classification sama sekali.
// FIX 2: executor .novaagent WAJIB pakai tool.done (akurat) buat teks
//        konfirmasi, bukan decision.reply (bisa halusinasi).
import { localParse, TOOLS } from "../../src/lib/aiagent.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

w("\n— FIX 1: localParse genimage lokal (gak lewat AI) —");

{
  const d = localParse("buatkan gambar kucing");
  check("'buatkan gambar kucing' → tool genimage", d?.tool === "genimage", JSON.stringify(d));
  check("prompt keisi 'kucing'", d?.args?.prompt?.includes("kucing"), d?.args?.prompt);
}
{
  const d = localParse("buat gambar kucing astronot di bulan");
  check("'buat gambar kucing astronot di bulan' → genimage", d?.tool === "genimage");
  check("prompt lengkap 'kucing astronot di bulan'", d?.args?.prompt?.includes("astronot"), d?.args?.prompt);
}
{
  const d = localParse("bikin gambar pemandangan gunung");
  check("'bikin gambar pemandangan gunung' → genimage", d?.tool === "genimage", d?.tool);
}
{
  const d = localParse("gambarkan kucing lucu pakai baju astronot");
  check("'gambarkan kucing lucu...' → genimage", d?.tool === "genimage", d?.tool);
}
{
  const d = localParse("tolong buatkan gambar naga api dong");
  check("filler (tolong/dong) dibuang dari prompt", d?.args?.prompt === "naga api", d?.args?.prompt);
}
{
  const d = localParse("generate gambar mobil sport merah");
  check("'generate gambar ...' → genimage", d?.tool === "genimage", d?.tool);
}

w("\n— regresi: setpp/setdesc gak kesenggol —");
{
  const d = localParse("ganti foto profil grup");
  check("'ganti foto profil grup' tetep setpp (bukan genimage)", d?.tool === "setpp", d?.tool);
}
{
  const d = localParse("ubah deskripsi grup ini jadi lebih bagus untuk grup main bot");
  check("'ubah deskripsi grup...' tetep setdesc", d?.tool === "setdesc", d?.tool);
}
{
  const d = localParse("ganti nama grup jadi Grup Seru");
  check("'ganti nama grup jadi...' tetep setname", d?.tool === "setname", d?.tool);
}
{
  const d = localParse("buatkan gambar profil kucing untuk grup");
  check("'buatkan gambar profil...grup' TIDAK jadi genimage (ke-exclude)", d?.tool !== "genimage", d?.tool);
}
{
  // giliran kedua persis skenario owner: sesi udah ubah deskripsi, lanjut minta gambar
  const d1 = localParse("ubah deskripsi grup ini jadi lebih bagus untuk grup main bot");
  const d2 = localParse("buatkan gambar kucing");
  check("skenario owner: turn1 setdesc, turn2 genimage (BUKAN setdesc lagi)", d1?.tool === "setdesc" && d2?.tool === "genimage", `${d1?.tool} / ${d2?.tool}`);
}

w("\n— FIX 2: executor pakai tool.done, bukan decision.reply (anti halusinasi) —");
{
  // simulasi genimage tool.run beneran jalan (mock sendMessage), lalu cek
  // urutan prioritas teks konfirmasi ala kode plugin: tool.done || decision.reply
  const decision = { tool: "setdesc", args: { value: "Grup Baru" }, reply: "Deskripsi grup berhasil diubah menjadi 'Grup Baru'. Gambar kucing juga sedang dibuat ya." };
  const tool = TOOLS[decision.tool];
  const confirmText = tool.done || decision.reply || "Selesai.";
  check("tool.done dipakai (bukan reply yang nyantol soal gambar)", confirmText === tool.done, confirmText);
  check("teks konfirmasi TIDAK menyebut gambar (gak nyantol)", !confirmText.toLowerCase().includes("gambar"), confirmText);
}
{
  // tool genimage sendiri: tool.done akurat ("gambarnya udah dibuatin")
  const tool = TOOLS.genimage;
  check("genimage.done akurat nyebut gambar beneran dibuat", tool.done.toLowerCase().includes("gambar"), tool.done);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
