# 🌐 Panduan WEBPANEL — Dashboard Bot via Browser

Panel web untuk ngelola/monitor bot dari browser (port HIROBOT,
engine `src/lib/hiweb/`). Owner-only.

## 1. Instalasi

Gak ada build terpisah — server HTTP stdlib jalan di dalam proses bot.
Di Nova SENGAJA manual (gak auto-boot):

```
.webpanel on
```

Port default **3000** — ganti lewat env `NOVA_WEB_PORT`.

## 2. Login

Buka `http://<ip-vps>:3000` → daftar pakai nomor WhatsApp → OTP
dikirim ke chat WA nomor itu → set password. (Login berikutnya cukup
nomor + password, hash scrypt.)

Pastikan port 3000 terbuka di firewall VPS kalau mau diakses dari luar.

## 3. Cara pakai

| Command | Fungsi |
|---|---|
| `.webpanel on` | Nyalain dashboard |
| `.webpanel off` | Matiin dashboard |
| `.webpanel status` | Kondisi server + port aktif |

Catatan: fitur di dalam dashboard cuma bisa beneran dites di VPS live
(e2e cuma nyangkin server boot + halaman kebuka).

## 4. Troubleshooting

- **"Address already in use"** → port 3000 kepakai proses lain:
  ganti `NOVA_WEB_PORT` atau matiin proses yang pegang port.
- **Halaman gak kebuka dari luar**** → cek firewall/security group VPS,
  buka port sesuai `NOVA_WEB_PORT`.
