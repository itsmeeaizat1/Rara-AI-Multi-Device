# Setup 9Router (gateway lokal, opsional)

`9router` (paket npm `9router`, dari github.com/decolua/9router) sekarang jadi
**dependency biasa** di `package.json` — otomatis kepasang pas `npm install`,
gak perlu lagi `npm install -g 9router` manual di VPS.

Penting: ini beda sama fitur `.ai9` (Nova Router) yang udah ada di bot —
`.ai9` itu implementasi sendiri (key pooling + circuit breaker ditulis
manual di `src/lib/nova-ai-router.js`), **gak butuh** package `9router` ini
buat jalan. File ini cuma buat kalau kamu MAU juga jalanin gateway 9router
asli (dashboard + endpoint OpenAI-compatible ke 60+ provider) sebagai
service tambahan di VPS.

## Jalankan sebagai service (pm2)

```bash
# WAJIB: ganti default JWT secret — versi lama 9router (<0.4.77) punya CVE
# auth-bypass karena fallback JWT secret hardcoded ("9router-default-secret-change-me").
# Versi 0.5.69 yang kepasang di sini udah lewat versi fix, TAPI tetap harus
# set secret sendiri, jangan andalkan default.
export ROUTER_JWT_SECRET="$(openssl rand -hex 32)"

# Bind ke localhost aja — dashboard 9router JANGAN diexpose ke internet.
pm2 start node_modules/.bin/9router \
  --name 9router \
  -- start --port 20128 --host 127.0.0.1

pm2 save
```

## Dapetin API key (PENTING: alur BARU, gak lewat website lagi)

Website 9router.com **gak nerbitin API key lagi** — sekarang key
digenerate **lokal di mesin yang jalanin gateway** (binding ke
machineId, format `sk-{machineId}-{keyId}-{crc8}`, dari
`app/src/shared/utils/apiKey.js`). Alurnya:

1. Jalankan CLI: `node_modules/.bin/9router` (atau via pm2 di atas).
2. Dashboard lokal kebuka di `http://localhost:20128/dashboard`.
   Di VPS tanpa browser: SSH tunnel dari HP/PC ->
   `ssh -L 20128:127.0.0.1:20128 user@vps` lalu buka
   `http://localhost:20128/dashboard`.
3. Generate key dari halaman API Keys di dashboard lokal itu.
   Key-nya otomatis terikat ke machineId VPS — gak bisa dipindah-pindah.

Catatan: server lokal umumnya longgar ngecek key (dulu README-nya
sendiri bilang "The API key is not checked by most local servers"),
tapi tetap generate resmi dari dashboard biar konsisten.

## Pakai dari kode bot (opsional)

Kalau mau plugin AI manggil gateway ini, arahkan base URL ke:

```
http://127.0.0.1:20128/v1
```

dengan API key hasil generate dari dashboard lokal (langkah di atas).
JANGAN expose port 20128 ke publik.

## Checklist keamanan

- [ ] `ROUTER_JWT_SECRET` di-set custom, bukan default.
- [ ] Port 20128 cuma bind ke `127.0.0.1`, gak ke `0.0.0.0`.
- [ ] Firewall VPS blokir port 20128 dari luar.
- [ ] Update rutin: `npm outdated 9router` — cek CVE terbaru sebelum upgrade.
