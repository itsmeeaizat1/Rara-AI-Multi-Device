// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 rara-tmpfiles.js — shim upload URL (dulu host Termai)
// 🔹 1 Okt 2026: Termai jadi free-tier limit kecil → dilepas. Zelapi gak
//    punya upload yang hidup. Engine baru: rara-uploader.js (Kappa → Pone
//    → Uguu, semua diuji live dari IP datacenter).
// 🔹 Signature + return shape dipertahankan ({ url, directUrl }) biar
//    importer lama (fakeml/fakeff) gak berubah.
// ═════════════════════════════════════════════
import { uploadFile } from './rara-uploader.js'

export async function uploadTo0x0(buffer, opts) {
  if (!Buffer.isBuffer(buffer)) throw new Error("buffer harus Buffer")
  const filename = opts?.filename || 'image.jpg'
  const url = await uploadFile(buffer, filename)
  return { url, directUrl: url }
}
