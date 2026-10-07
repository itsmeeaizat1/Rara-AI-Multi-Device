# 🖥️ Panduan VPS + Pterodactyl Panel (Dari Nol sampai Bot Running)

Panduan lengkap: **login VPS → ganti password → ganti port SSH → SSH key → install panel + wings → security (UFW/Fail2Ban) → akses admin web → server bot**.

Gabungan pengalaman setup VPS Linode Debian 12 + poin penting hasil troubleshoot panel versi terbaru (reCAPTCHA, image docker, API key bot).

---

## Prasyarat

- VPS baru (Linode/Hetzner/DigitalOcean) — Debian 12 atau Ubuntu 22.04
- RAM minimal 4GB (rekomendasi 8GB+)
- HP dengan **Termux** (install dari **F-Droid**, JANGAN Play Store — versi lama)
- Akun Cloudflare (gratis, buat tunnel)
- Repo bot Rara sudah ada di GitHub

---

## Langkah 1 — Persiapan Termux

```bash
# 1. Update Termux
pkg update && pkg upgrade -y

# 2. Install SSH
pkg install openssh -y

# 3. Generate SSH key (buat login tanpa password nanti)
ssh-keygen -t ed25519 -C "vps" -f ~/.ssh/id_ed25519
# Tekan Enter untuk semua prompt, kosongkan passphrase

# 4. Lihat public key — COPY INI
cat ~/.ssh/id_ed25519.pub
```

---

## Langkah 2 — Login Pertama ke VPS

1. Login dashboard VPS provider (Linode/Hetzner/dll)
2. Catat: **IP Address** dan **Root Password** dari provider (SSH port default = 22)

```bash
ssh root@IP_VPS
# contoh: ssh root@172.234.95.22
```

3. Ketik `yes` saat ditanya fingerprint
4. Masukkan password root dari VPS provider

> 💡 Tips: kalau mau dibantu remote dari HP lain/laptop, jalankan `sshx` di VPS lalu share link-nya.

---

## Langkah 3 — Ganti Password Root (WAJIB PERTAMA!)

**Jangan lanjut install apa-apa sebelum keamanan dasar ini selesai.**

```bash
passwd
```

- Masukkan password baru (yang kuat: campuran huruf besar/kecil + angka + simbol)
- Ketik ulang
- **CATAT di tempat aman!**

---

## Langkah 4 — Ganti Port SSH ke 40000an

```bash
nano /etc/ssh/sshd_config
```

- Cari baris `#Port 22` (atau `Port 22`)
- Hapus tanda `#` dan ganti angkanya, contoh:

```
Port 47823
```

- Pilih angka bebas di rentang **40000-49999**
- Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
systemctl restart sshd
```

**⚠️ CATAT PORT BARU! Kalau lupa, ga bisa login lagi lewat SSH!**

**Test login dengan port baru:**

```bash
# di Termux: exit dulu, lalu login ulang
exit
ssh root@IP_VPS -p 47823
# contoh: ssh root@172.234.95.22 -p 47823
```

Kalau berhasil → lanjut Langkah 5.

**Kalau GAGAL (jaran kena batu):**

1. Login lewat console VPS di dashboard provider (Linode: **LishConsole**)
2. Cek port: `grep Port /etc/ssh/sshd_config`
3. Pastikan firewall gak block port baru: `ufw allow 47823/tcp`
4. `systemctl restart sshd`

---

## Langkah 5 — Pasang SSH Key (Login Tanpa Password)

Di VPS (sudah login):

```bash
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
```

- Paste public key dari Langkah 1 (`cat ~/.ssh/id_ed25519.pub` di Termux)
- Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
chmod 600 ~/.ssh/authorized_keys
```

**Test dari Termux (buka session baru):**

```bash
ssh -i ~/.ssh/id_ed25519 root@IP_VPS -p 47823
```

Masuk tanpa minta password → beres. Sekarang login cuma butuh 1 perintah itu, gak perlu nginget password lagi.

---

## Langkah 6 — Update Sistem & Dependencies

```bash
apt update && apt upgrade -y
apt install -y curl wget git nano python3 ca-certificates gnupg
```

> ⛔ **JANGAN install UFW/Fail2Ban duluan!** Install SETELAH Docker selesai (Langkah 8).
> Firewall duluan = iptables Docker gak kepasang = Wings bakal crash.

---

## Langkah 7 — Install Pterodactyl Panel

### 7a. PHP 8.2 + stack database

```bash
apt install -y nginx php8.2 php8.2-fpm php8.2-cli php8.2-mysql \
  php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl php8.2-xml \
  php8.2-bcmath mariadb-server redis-server

systemctl enable nginx php8.2-fpm mariadb redis-server
systemctl start nginx php8.2-fpm mariadb redis-server
```

### 7b. Download panel + composer

```bash
mkdir -p /var/www/pterodactyl
cd /var/www/pterodactyl
curl -sL https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz | tar -xzv
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
composer install --no-dev --optimize-autoloader
```

### 7c. Buat database

```bash
mysql -u root -e "CREATE DATABASE panel;"
mysql -u root -e "CREATE USER 'pterodactyl'@'localhost' IDENTIFIED BY 'PASSWORD_DB_KAMU';"
mysql -u root -e "GRANT ALL PRIVILEGES ON panel.* TO 'pterodactyl'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
```

Catat: database=`panel`, user=`pterodactyl`, password=`PASSWORD_DB_KAMU`.

### 7d. Setup panel

```bash
cd /var/www/pterodactyl
cp .env.example .env          # kalau .env belum ada
php artisan key:generate --force
php artisan p:environment:setup       # jawab prompt APP_URL dll (boleh diisi IP dulu, diganti nanti)
php artisan p:environment:database     # isi kredensial DB dari 7c
php artisan migrate --seed --force
```

> 💡 `p:environment:database` nanya user/password DB — isi sesuai 7c. Kalau kamu bikin DB-nya duluan sebelum migrasi, gak masalah.

```bash
chown -R www-data:www-data /var/www/pterodactyl
```

### 7e. Config .env

```bash
nano /var/www/pterodactyl/.env
```

Edit baris penting:

```
APP_URL=http://IP_VPS              # atau URL tunnel kalau pakai Cloudflare (Langkah 9)
DB_DATABASE=panel
DB_USERNAME=pterodactyl
DB_PASSWORD=PASSWORD_DB_KAMU
```

> ⚠️ **GOTCHA login admin (pengalaman nyata):** kalau `RECAPTCHA_` masih enabled/default tapi kamu gak punya key Google reCAPTCHA, widget login **gak pernah ke-render** → login admin SELALU gagal di browser manapun. Fix: set `RECAPTCHA_ENABLED=false` (atau `RECAPTCHA_SITE_KEY=` kosong) di .env, lalu `php artisan config:cache`.

```bash
cd /var/www/pterodactyl
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 7f. Buat user admin panel

```bash
php artisan p:user:make
```

Ikuti prompt: username, email, password, pilih role **admin** (root). Ini yang dipakai buat login web nanti.

### 7g. Nginx

```bash
nano /etc/nginx/sites-available/pterodactyl.conf
```

Paste:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/pterodactyl/public;
    index index.php;
    client_max_body_size 100M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Sekarang buka `http://IP_VPS` di browser → halaman login panel harusnya muncul. Login pakai akun dari 7f → kamu masuk sebagai **admin (akses penuh)**.

> 💡 Kalau gak mau ribet domain, akses langsung via IP udah cukup. Tunnel Cloudflare (Langkah 9) opsional — buat domain + HTTPS.

---

## Langkah 8 — Install Docker + Wings (Daemon)

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Wings
mkdir -p /etc/pterodactyl
curl -sL https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_amd64 -o /usr/local/bin/wings
chmod +x /usr/local/bin/wings
```

Systemd service:

```bash
nano /etc/systemd/system/wings.service
```

```ini
[Unit]
Description=Pterodactyl Wings Daemon
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/etc/pterodactyl
ExecStart=/usr/local/bin/wings
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable wings
```

(Jangan start dulu — wings butuh config dari panel, lihat Langkah 11.)

---

## Langkah 9 — Setup Security: UFW + Fail2Ban (+ Anti DDoS Dasar)

**BARU SEKARANG**, setelah Docker jalan.

### 9a. UFW

```bash
apt install -y ufw fail2ban

ufw allow 47823/tcp          # PORT SSH BARU kamu! (sesuaikan)
ufw allow 80/tcp             # panel web
ufw allow 443/tcp            # https / tunnel
ufw allow 8080/tcp            # wings daemon
ufw allow 2022/tcp            # sftp
ufw allow 25567:25866/tcp     # port server/bot (alokasi panel)
ufw --force enable
```

```bash
# Restart Docker biar iptables chain ke-reset rapi
systemctl restart docker
sleep 3
```

> ⚠️ Jangan lupa allow port SSH baru SEBELUM `ufw enable`. Salah urutan = kunci sendiri keluar → balik lewat LishConsole.

### 9b. Fail2Ban (anti brute-force SSH)

```bash
nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
banaction = ufw

[sshd]
enabled  = true
port     = 47823          # PORT SSH BARU kamu (sesuaikan!)

[recidive]
enabled  = true
bantime  = 1w
findtime = 1d
maxretry = 3
```

```bash
systemctl restart fail2ban
systemctl enable fail2ban
fail2ban-client status sshd    # cek jail aktif
```

### 9c. Anti DDoS dasar (sysctl)

```bash
cat >> /etc/sysctl.d/99-antidos.conf <<'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
EOF
sysctl --system
```

> Realita: proteksi DDoS paling ampuh itu di level provider (Linode/Akamai firewall) + Cloudflare proxy di depan web. UFW+sysctl cuma lapis pertama. Kalau panel di belakang tunnel Cloudflare, CUKUP 3 port yang kebuka ke publik: port SSH, 80/443 (tunnel), sisanya bisa dibatasi.

---

## Langkah 10 — Cloudflare Tunnel (2 Opsi: Sementara vs PERMANEN)

### Opsi A — Quick Tunnel (cepat, TAPI URL berubah tiap restart)

Dua tunnel terpisah: PANEL (port 80) dan WINGS (port 8080).

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

**Tunnel 1 — PANEL:**

```bash
nano /etc/systemd/system/cloudflared-panel.service
```

```ini
[Unit]
Description=Cloudflare Tunnel - Panel
After=network.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:80
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable cloudflared-panel
systemctl start cloudflared-panel
sleep 5
journalctl -u cloudflared-panel --no-pager | grep "https://" | tail -1
```

**CATAT URL panel:** `xxx-xxx-xxx.trycloudflare.com`

**Tunnel 2 — WINGS:** sama persis, beda nama service + port 8080 (`cloudflared-wings.service`, `--url http://localhost:8080`). Catat URL wings: `yyy-yyy-yyy.trycloudflare.com`.

**Update .env panel:**

```bash
nano /var/www/pterodactyl/.env
# APP_URL=https://xxx-xxx-xxx.trycloudflare.com
cd /var/www/pterodactyl && php artisan config:cache
```

> ⚠️ **KELEMAHAN QUICK TUNNEL:** URL `trycloudflare.com` itu acak dan **MATI tiap service restart / VPS reboot** (error `getaddrinfo ENOTFOUND` di bot = URL udah basi). Tiap mati harus update `.setpanel` manual lagi. **MAKANYA pakai Opsi B di bawah.**

---

### Opsi B — Named Tunnel PERMANEN (disarankan: URL tetap SELAMANYA)

Dengan Named Tunnel, URL-nya domain sendiri (contoh: `panel.domainku.com`) yang **gak pernah berubah**, walau VPS reboot berulang kali. Setup **SEKALI**, setelah itu gak perlu sentuh apa-apa lagi.

**Prasyarat:**
- Akun Cloudflare gratis (daftar di cloudflare.com)
- 1 domain (murah ~Rp 20-30rb/tahun, atau pakai domain yang udah kamu punya). Nameserver domain harus diarahkan ke Cloudflare (di dashboard registrar domain, ganti NS ke yang Cloudflare kasih, tunggu propagate).

**Langkah B1 — Install cloudflared** (kalau belum, lihat Opsi A di atas)

**Langkah B2 — Login ke Cloudflare (dari VPS):**

```bash
cloudflared tunnel login
```

Muncul URL panjang → copy, buka di browser HP/PC → login akun Cloudflare → pilih domain kamu → Authorize. Nanti muncul `cert.pem` tersimpan otomatis di `/root/.cloudflared/`.

**Langkah B3 — Buat tunnel:**

```bash
cloudflared tunnel create rara
```

Output-nya ada **UUID tunnel** (contoh: `1a2b3c4d-...`). CATAT UUID itu.

**Langkah B4 — Route DNS (sekali per subdomain):**

```bash
# subdomain panel
cloudflared tunnel route dns rara panel.domainmu.com
# subdomain wings (untuk node/server daemon)
cloudflared tunnel route dns rara wings.domainmu.com
```

(Ganti `domainmu.com` sama domain kamu. DNS record dibuat otomatis.)

**Langkah B5 — Config tunnel:**

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

```yaml
tunnel: UUID-TUNNEL-KAMU
credentials-file: /root/.cloudflared/UUID-TUNNEL-KAMU.json

ingress:
  - hostname: panel.domainmu.com
    service: http://localhost:80
  - hostname: wings.domainmu.com
    service: http://localhost:8080
  - service: http_status:404
```

Satu tunnel nangkap 2 hostname sekaligus: panel + wings.

**Langkah B6 — Service systemd (auto-start saat boot + auto-restart saat crash):**

```bash
nano /etc/systemd/system/cloudflared-tunnel.service
```

```ini
[Unit]
Description=Cloudflare Named Tunnel (Permanen)
After=network.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run rara
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable cloudflared-tunnel      # auto-start tiap boot
systemctl start cloudflared-tunnel
systemctl status cloudflared-tunnel      # harus active (running)
```

**Langkah B7 — Matikan quick tunnel lama (kalau tadinya pakai Opsi A):**

```bash
systemctl disable --now cloudflared-panel cloudflared-wings 2>/dev/null
```

**Langkah B8 — Update .env panel & wings:**

```bash
nano /var/www/pterodactyl/.env
# APP_URL=https://panel.domainmu.com
cd /var/www/pterodactyl && php artisan config:cache
```

Untuk wings: edit file node config (`/etc/pterodactyl/config.yml`) bagian `remote:` → `https://wings.domainmu.com` (ini URL FQDN yang dipakai panel nyambung ke daemon).

**Langkah B9 — Update bot SEKALI:**

```
.setpanel v1 https://panel.domainmu.com
```

Selesai. URL ini **gak akan pernah berubah lagi** — VPS reboot, cloudflared crash, apapun, systemd otomatis nyalain ulang dan domainnya tetap sama. Gak perlu setting manual lagi selamanya.

> ✅ **Perbandingan:**
> | | Quick Tunnel (Opsi A) | Named Tunnel (Opsi B) |
> |---|---|---|
> | URL | acak `.trycloudflare.com` | domain sendiri, tetap selamanya |
> | Restart/reboot | URL mati, setup ulang manual | auto-up, URL sama |
> | Biaya | gratis | domain ~Rp 20rb/thn |
> | Update `.setpanel` | tiap restart | SEKALI aja |

## Langkah 11 — Konfigurasi Panel di Browser (Admin)

Login `http://IP_VPS` (atau URL tunnel) pakai akun admin dari Langkah 7f.

1. **Location:** Admin → Locations → Create New → Short Code: `id-jkt-1`
2. **Node:** Admin → Nodes → Create New
   - Name: `Rara-Node`
   - Location: `id-jkt-1`
   - **FQDN: URL WINGS tunnel** (yyy-yyy, BUKAN URL panel!). Kalau gak pakai tunnel: `IP_VPS`
   - SSL: Yes (kalau tunnel) / No (kalau IP langsung)
   - Daemon Port: `443` (tunnel) — indikator merahnya NORMAL, abaikan
   - Daemon SFTP Port: `2022`
   - Memory: RAM VPS − 2GB (misal 4GB VPS → 2000)
   - Disk: sesuai disk VPS (MB)
3. **Allocations:** Admin → Nodes → Rara-Node → Allocations
   - IP: IP internal VPS (cek `ip a` — biasanya `172.x.x.x` atau `10.x.x.x`)
   - Ports: `25567-25866` (range buat banyak server)

---

## Langkah 12 — Auto-Deploy Wings

1. Panel: Admin → Nodes → Rara-Node → tab **Configuration**
2. Klik **Auto-Deploy** → copy command yang muncul
3. Paste di VPS (Termux SSH) → dia generate `/etc/pterodactyl/config.yml`
4. Edit config:

```bash
nano /etc/pterodactyl/config.yml
```

Pastikan:

```yaml
api:
  host: 0.0.0.0
  port: 8080
  ssl:
    enabled: false
allowed_origins:
  - 'https://xxx-xxx-xxx.trycloudflare.com'   # URL PANEL! (atau http://IP_VPS kalau gak pakai tunnel)
```

> ⚠️ **allowed_origins WAJIB diisi URL PANEL!** Kalau kosong `[]`, console server bakal **loading forever**.

5. Start:

```bash
systemctl reset-failed wings
systemctl start wings
sleep 2
systemctl status wings     # harus active (running) hijau
```

> 💡 **Alternatif tanpa browser:** `cd /var/www/pterodactyl && php artisan p:node:configuration <ID_NODE> > /etc/pterodactyl/config.yml` menggantikan Auto-Deploy — hasilnya sama persis (token + port dibaca langsung dari database panel). Detail & kasus errornya di bagian Troubleshooting.

---

## Langkah 13 — Buat Server Bot di Panel

1. **Egg Node.js** (pakai egg `nodejs` bawaan dari nest `Cores`/`Default` kalau ada, atau import egg custom).
   Kalau bikin manual: Admin → Eggs → Create New
   - Name: `Node.js Bot`
   - Docker Image: **`ghcr.io/parkervcp/yolks:nodejs_20`**
   - Startup: `npm start`

   > ⚠️ **GOTCHA (pengalaman nyata):** JANGAN pakai image node official polos (mis. `node:20`) — gak punya entrypoint Pterodactyl. Dan pilih varian yang ada **git**-nya (yolks parkervcp udah include git + ffmpeg) — bot Rara butuh git pas install dependency di console.

2. **Server:** Panel → Servers → Create New
   - Name: `Rara-Bot`
   - Owner: email admin kamu
   - Node: `Rara-Node`, Egg: `Node.js Bot`
   - Memory: 1024 MB (bot multi-device lancar di 1GB; sesuaikan)
   - Disk: 5000 MB
3. Buka server → console harus **connect (hijau)**. Kalau loading terus → lihat Troubleshooting.

---

## Langkah 14 — Upload Bot Rara ke Server

**Cara 1 (CEPAT) — git clone lewat console panel:**

```bash
# di console server (tab Console)
git clone https://github.com/itsmeeaizat1/Rara-AI-Multi-Device.git .
npm install
npm start
```

Pairing nomor bot: di console bakal muncul QR code (kalau pakai QR) atau kode pairing — scan/ikuti seperti biasa.

**Cara 2 — lewat tab Files:** upload zip → console: `unzip file.zip -d ./ && rm file.zip`

---

## Langkah 15 — Bikin API Key Panel (buat `.cpanel` bot)

Panel punya 2 jenis API key — tempat bikinnya BEDA dan fungsinya BEDA:

| | `ptla_` (Application API) | `ptlc_` (Client API) |
|---|---|---|
| Untuk siapa | Bot Rara | Akun panel sendiri (kamu/user) |
| Fungsi | BIKIN user + server, power (start/stop/restart/kill), list server — semuanya atas nama admin | KONTROL akun panel sendiri: login bot, cek status, upload file ke server milik sendiri |
| Tempat bikin | Area **Admin** → sidebar **Application API** | Halaman **Account** → tab **API Credentials** |
| Bisa akses area admin? | Bisa (admin level) | TIDAK — cuma akun sendiri |
| Wajib buat bot? | ✅ WAJIB | ⚠️ Opsional (cuma buat `capikey`, lihat bawah) |

### A. Bikin `ptla_` (Application API — WAJIB buat bot)

1. Login panel sebagai admin → klik avatar kanan atas → **Admin** (ikon gear)
2. Di sidebar admin, buka **Application API** → klik **Create New**
3. Description bebas (misal `Rara Bot`) → Allowed IPs kosongin aja → **Create**
4. Copy key yang muncul (format `ptla_xxx...`) — **⚠️ cuma ditampilin SEKALI!** Kalau kehilang, delete dan bikin baru.
5. Daftarin ke bot (chat WA owner, di bot):

```
.setpanel v1 apikey ptla_xxx...
```

Dengan ptla doang, SEMUA fitur create udah jalan:
- `.cpanel client, 5gb 5gb, 200, user, 628xxx, 1` → user biasa + server (tanpa akses admin)
- `.cpanel admin, 5gb 5gb, 200, user, 628xxx, 1` → user + server SEKALIGUS akses admin (owner bot only)

### B. Bikin `ptlc_` (Client API — cuma kalau perlu `capikey`)

`ptlc_` gak ada di area Admin. Bikinnya di halaman akun SENDIRI:

1. Klik avatar kanan atas → **Account** (yang pertama, BUKAN Admin Control Panel)
2. Buka tab **API Credentials** → **Create New** → description bebas → **Create**
3. Copy key (format `ptlc_xxx...`) — cuma sekali ditampilin juga.

Kepakenya cuma 2:
- **User login bot (gak perlu bikin manual!)** — user cukup `.cpanel login <username>,<password>,1`, bot otomatis bikinin session ptlc pribadinya sendiri (berlaku 7 hari). Key dari halaman Account gak dipakai sama sekali di jalur ini.
- **`capikey` owner (opsional)** — kalau KAMU mau bot bisa `.cpanel status` / `.cpanel upload` ke server milik user lain atas nama akunmu:

```
.setpanel v1 capikey ptlc_xxx...
```

> 💡 Tanpa capikey pun bot tetap fungsi penuh: create (client/admin), power start/stop/restart/kill, listserver — semua via ptla. `ptlc_` murni kontrol akun, bukan buat bikin server.

### Set domain panel (kalau belum)

```
.setpanel v1 http://IP_VPS
```

> ⚠️ Gunakan URL panel yang aktif (IP langsung atau tunnel). Jangan pakai URL tunnel lama yang udah mati/ganti.
> Gotcha nyata: kalau build panel kamu dimodif auth-nya (pernah kejadian: API ditolak 401 terus padahal key bener), cek middleware `auth` di `app/Http/Kernel.php` — group `api` harus pakai `AuthenticateApiKey` (bawaan Ptero), bukan `auth:sanctum` polos. Fix-nya: middleware `AuthenticateApiKeyOrSanctum` yang terima `ptla_`/`ptlc_` dulu, fallback sanctum buat UI.

---

## Troubleshooting (Error yang Sering Terjadi)

**Tidak bisa login SSH setelah ganti port**
- Penyebab: port salah ketik / firewall block
- Fix: login lewat LishConsole → `grep Port /etc/ssh/sshd_config` → `ufw allow PORTBARU/tcp` → `systemctl restart sshd`

**Wings failed (exit-code) saat start**
- Penyebab: proses Wings basi masih jalan
- Fix: `pkill -9 -f "/usr/local/bin/wings"` → `systemctl reset-failed wings` → `systemctl start wings`

**Console server loading forever (ga connect)**
- Penyebab 1: `allowed_origins` kosong di config.yml → isi URL panel, `systemctl restart wings`
- Penyebab 2: Daemon Port salah di panel → set 443 (setup tunnel), abaikan indikator merah
- Penyebab 3: URL tunnel berubah setelah restart → cek `journalctl -u cloudflared-wings | grep "https://" | tail -1`, update FQDN node + config.yml, restart wings

**Bot `.cpanel` error `getaddrinfo ENOTFOUND ...trycloudflare.com`**
- Penyebab: URL quick tunnel basi — cloudflared/VPS pernah restart, URL acak lama mati
- Fix cepat (sementara): `journalctl -u cloudflared-panel --no-pager | grep "https://" | tail -1` → update `.setpanel v1 <URL-baru>`
- Fix permanen: pindah ke Named Tunnel (Langkah 10 Opsi B) → URL gak akan pernah berubah lagi

**Bot `.cpanel` error `getaddrinfo ENOTFOUND ptla_...` (domain keisi API key)**
- Penyebab: pernah jalanin `.setpanel v1 <ptla_key>` **tanpa kata `apikey`** — kode lama menganggapnya domain (auto ditambah `https://`) → semua request create kirim ke host `ptla_...` yang gak ada → ENOTFOUND
- Fix cepat: `.setpanel v1 http://domain-panel-ente` (atau edit langsung `src/database/panel/ptero-panels.json` di container, tanpa restart — langsung aktif)
- Pencegahan (patched 8 Okt): guard di `setPanelField` + plugin `.setpanel` **menolak** value `ptla_`/`ptlc_` sebagai domain, dibales arahan `.setpanel v1 apikey <key>`
- Tes key dari VPS (byte-exact, tanpa salah baca huruf besar/kecil):
  ```bash
  K=$(docker exec $(docker ps -q) sh -c "grep '\"apikey\"' src/database/panel/ptero-panels.json | grep -o 'ptla_[a-zA-Z0-9]*'")
  curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' -H "Authorization: Bearer $K" http://127.0.0.1/api/application/nests
  ```
  → `200` = key + permission oke; `401` = key salah; `302` = header Accept ketinggalan (curl doang, bot gak kena)
- Create server butuh egg/nest/location BENAR per panel (bukan default template): cek ID asli via `php artisan tinker` → `Pterodactyl\Models\Server::first()->only('egg_id','nest_id')` dan `Pterodactyl\Models\Location::first()->id`, lalu set: `.setpanel v1 egg 16` / `.setpanel v1 nestid 5` / `.setpanel v1 location 1`


**Wings crash karena iptables Docker**
- Fix: `systemctl restart docker && sleep 3 && systemctl restart wings`

**500 Internal Server Error di panel**
- Fix: `chown -R www-data:www-data /var/www/pterodactyl/storage /var/www/pterodactyl/bootstrap/cache` → `php artisan config:cache`

**Login admin web gak bisa terus (tombol gak ke-render / verifikasi gagal)**
- Penyebab: reCAPTCHA enabled tanpa key Google
- Fix: `RECAPTCHA_ENABLED=false` di .env → `php artisan config:cache` → coba login lagi

**API key `ptla_` ditolak 401 terus**
- Penyebab: build panel diganti auth-nya ke sanctum polos
- Fix: lihat Langkah 15 catatan middleware

**"Connection closed... Broken pipe"**
- Koneksi SSH putus (sinyal HP). Reconnect aja — service di VPS tetap jalan.

**Lupa SSH port**
- Fix: LishConsole → `grep -i port /etc/ssh/sshd_config`

**Panel "insecure form" warning**
- Penyebab: `APP_URL` .env gak match URL yang dipakai akses
- Fix: samakan `APP_URL` + `php artisan config:cache`

---

**Node offline: "Cannot communicate with daemon" / panel gak bisa nyambung ke Wings**

Diagnosa cepat (jalankan di VPS):

```bash
systemctl is-active wings                          # harus: active
ss -tlnp | grep -E ':8080|:2022'                    # wings harus LISTEN di 8080 + 2022
curl -s -o /dev/null -w '%{http_code}\n' --max-time 5 http://IP_VPS:8080/   # 401/404 = bagus (reachable)
```

Kalau curl-nya timeout dari luar VPS → port ke-block UFW (`ufw allow 8080/tcp`) atau wings emang gak jalan. Kalau keluar 401/404 → jalur jaringan OK, masalahnya di auth/token (lihat kasus di bawah).

**Kasus 1 — "Reset Daemon Key" dicentang, TAPI token baru gak di-deploy ke Wings**

- Gejala: node tiba-tiba offline setelah klik "Reset Daemon Key" di panel; wings sendiri masih `active`; console/panel bilang gak bisa komunikasi dengan daemon.
- Penyebab: reset itu cuma bikin token BARU di database panel. `/etc/pterodactyl/config.yml` di VPS masih megang token LAMA → kunci panel dan wings gak cocok lagi.
- Cek mismatch:

```bash
grep token_id /etc/pterodactyl/config.yml
mysql -N -e "select daemon_token_id from panel.nodes where id=1"
```

Beda nilai = mismatch. Fix: deploy ulang token baru (lihat "Deploy token baru" di bawah), lalu `systemctl restart wings`.

- ⚠️ PENTING: kolom `daemon_token` di database itu hasil ENKRIPSI Laravel (awalan `eyJ...`). JANGAN copy-paste mentah dari MySQL ke config.yml — gak akan pernah cocok. Pakai Auto-Deploy atau `p:node:configuration` (mereka yang menterjemahin token asli).

**Kasus 2 — Auto-Deploy / Generate Token dijalankan, TAPI daemon key gak direset**

- Ini sendiri TIDAK bikin rusak: selama token masih sama, deploy ulang config = cuma restart wings biasa. Node tetap online.
- Yang bahaya: deploy dijalankan pas setelan node masih SALAH / setengah diedit, karena config wings ditimpa pake nilai salah dari panel:
  - `api.port: 80` → wings nabrak nginx (port 80 dipake panel web) → wings crash loop / gagal start.
  - `ssl.enabled: true` + sertifikat letsencrypt buat IP → IP gak bisa punya sertifikat → wings gak bisa start.
  - Daemon Port node beda dengan `api.port` config → panel nyambung ke port yang kosong.
- Fix: rapikan dulu setelan node di admin (FQDN = IP/domain, scheme `http` kalau akses langsung, Daemon Port `8080`, SSL off), BARU deploy ulang config.
- Urutan aman kapan pun: **edit setelan node → (opsional) reset daemon key → deploy config → restart wings.** Dua-duanya (reset tanpa deploy, deploy dengan setelan salah) bikin node offline — cuma sebabnya beda.

**Deploy token baru (cara cepet, tanpa browser)**

Cara GUI: admin → Nodes → node kamu → tab Configuration → **Auto-Deploy** → jalankan command-nya di VPS.
Cara CLI (hasil sama persis, dia baca langsung dari database panel):

```bash
cp /etc/pterodactyl/config.yml /etc/pterodactyl/config.yml.bak   # backup dulu!
cd /var/www/pterodactyl
php artisan p:node:configuration 1 > /etc/pterodactyl/config.yml
systemctl restart wings
sleep 5 && systemctl is-active wings     # harus: active
```

Angka `1` = ID node. Cek ID: `mysql -N -e "select id,name from panel.nodes"`.

**Kasus 3 — Wings mati total / crash loop (status failed/activating terus)**

```bash
systemctl status wings --no-pager | head -10
journalctl -u wings --no-pager -n 30
```

Penyebab umum dan tanda di log:

1. Port bentrok → log: `address already in use` / `error listening` → cek `api.port` config (harus 8080, bukan 80/443)
2. `config.yml` rusak (indentasi YAML salah hasil edit manual) → log: `unmarshal` / `yaml` error
3. Docker mati → `systemctl restart docker && sleep 3 && systemctl restart wings`
4. Proses wings basi → `pkill -9 -f "/usr/local/bin/wings" && systemctl reset-failed wings && systemctl start wings`

Fix paling gampang buat semua: deploy ulang config via Auto-Deploy / `p:node:configuration` — sekalian benerin port, token, dan format YAML.

**Kasus 4 — Web panel / IP gak kebuka**

- Cek nginx: `systemctl status nginx` (harus active) + `ss -tlnp | grep ':80 '`
- Firewall: `ufw status` → kalau active, `ufw allow 80/tcp` dan `ufw allow 8080/tcp`
- `APP_URL` di `/var/www/pterodactyl/.env` HARUS sama persis dengan URL yang dipakai browser (contoh `http://IP_VPS`), habis itu `php artisan config:cache`
- Akses `https://IP` gak akan pernah jalan — IP gak bisa punya sertifikat SSL. Panel via IP = `http://` polos.

**Kasus 5 — Node online, tapi console server gak konek**

- `allowed_origins` di config wings WAJIB diisi URL panel yang dipakai browser (contoh `- 'http://IP_VPS'`). Kosong `[]` = console loading forever.
- Daemon Port node HARUS sama dengan `api.port` wings:

```bash
mysql -N -e "select daemonListen from panel.nodes where id=1"    # harus 8080
grep -A3 'api:' /etc/pterodactyl/config.yml | grep port          # harus 8080
```

Beda = console gak akan pernah nyambung. Benerin: set Daemon Port 8080 di admin → deploy ulang config → restart wings.

- Pakai proxy/tunnel → `behind_proxy` = 1; akses langsung IP → `behind_proxy` = 0: `mysql -e "update panel.nodes set behind_proxy=0 where id=1"`

**Kasus 6 — Port diblok FIREWALL CLOUD provider (ufw udah allow tapi tetap timeout)**

- Gejala: `ufw allow` udah dijalankan tapi port tetap gak bisa diakses dari luar; `curl` dari DALAM VPS lancar (jebakan — itu gak bukti port kebuka).
- UFW/iptables host BUKAN satu-satunya firewall: provider cloud (DigitalOcean/Linode/dll) punya firewall sendiri di dashboard yang gak kelihatan dari dalam VPS. Provider umumnya cuma buka 22/80/443.
- Cara cek dari luar: buka `check-host.net` → Check TCP → `IP_VPS:PORT` (lihat hasil dari beberapa negara). Jangan percaya tes dari dalam VPS.
- Solusi A: buka port yang dibutuhkan di firewall dashboard provider.
- Solusi B (tanpa minta provider): pindahkan wings ke port yang udah kebuka — 443:

```bash
sed -i '8s/8080/443/' /etc/pterodactyl/config.yml     # api port → 443 (sftp 2022 tetap)
mysql -e "update panel.nodes set daemonListen=443 where id=1"
systemctl restart wings
```

- Setelah pindah: `curl http://IP_VPS:443/api/system` dari luar harus jawab JSON wings (error auth = NORMAL, itu tanda tembus).
- Catatan: wings di 443 tetap HTTP polos (`use_ssl=false`), bukan TLS — jangan enable `ssl.enabled` tanpa sertifikat beneran, wings bakal gagal start.

**Kasus 7 — Ganti FQDN/domain node → HATI MERAH padahal wings sehat**

- Kunci yang sering kelupaan: **tiap ganti FQDN/scheme node, WAJIB deploy ulang token daemon** (tombol **Auto Deploy** di samping kolom token di admin → Nodes) atau `php artisan p:node:configuration`, baru `systemctl restart wings`. Ganti FQDN di form doang GAK cukup — token/config lama masih nyangkut.
- Urutan lengkap ganti domain/FQDN:
  1. Update FQDN node + scheme (`http`) di admin → **klik Auto Deploy di samping token** → `systemctl restart wings`
  2. Update `APP_URL` di `.env` panel → `php artisan config:cache` → `systemctl restart pterodactyl` (queue worker baca config lama sampai direstart)
  3. Update domain di bot: `.setpanel v1 http://domain-baru` (atau edit `src/database/panel/ptero-panels.json`)
- Cek cepat biar gak salah tuduh: dari luar VPS buka `http://FQDN:443/api/system` — kalau jawab JSON/error auth berarti wings + DNS tembus, masalahnya bukan di server.
- **Mixed content = hati merah PALSU:** kalau panel dibuka via `https://` tapi scheme node `http://`, browser ngeblok ping ke wings dari halaman https → hati merah padahal semua sehat. Akses panel via `http://` yang sama persis dengan `APP_URL`, atau setup sertifikat SSL beneran dulu baru ganti scheme node jadi https.
- DNS subdomain baru butuh waktu propagate — kalau device kamu belum resolve, IP tetap bisa dipakai sementara.

**Verifikasi akhir (semua harus lolos)**

```bash
systemctl is-active wings                                         # active
ss -tlnp | grep -E ':8080|:2022'                                  # dua-duanya LISTEN
journalctl -u wings --no-pager -n 5                               # ada "updating server states on Panel"
curl -s -o /dev/null -w '%{http_code}\n' http://IP_VPS:8080/      # 401/404
```

Kalau semua hijau, cek panel admin → node harus ONLINE (bukan merah), lalu di WhatsApp bot: `.setpanel v1 http://IP_VPS` → tes `.cpanel status`.

---

## Checklist Final

- [ ] Password root sudah diganti
- [ ] SSH port sudah diganti ke 40000an
- [ ] SSH key jalan (login tanpa password)
- [ ] UFW + Fail2Ban sudah di-setup (**setelah Docker!**)
- [ ] Login admin web panel OK (reCAPTCHA udah dicek)
- [ ] Panel accessible (IP / tunnel)
- [ ] Wings `active (running)`
- [ ] FQDN node = URL Wings; `allowed_origins` = URL panel
- [ ] Daemon Port di panel = 443 (tunnel) / 8080 (akses langsung IP) — HARUS sama dengan `api.port` config wings
- [ ] Console server connect (hijau)
- [ ] Egg pakai `ghcr.io/parkervcp/yolks:nodejs_20`
- [ ] Bot Rara ter-upload + running
- [ ] API key `ptla_` untuk bot dibuat + `.setpanel` sukses

---

## Catatan Penting

1. **Urutan keamanan DULUAN:** ganti password + ganti port + SSH key itu langkah PERTAMA setelah login. Jangan install apa-apa sebelum itu selesai.
2. **JANGAN install UFW/Fail2Ban sebelum Docker** — Docker butuh iptables chains sendiri.
3. **Quick Tunnel URL berubah tiap restart.** Untuk URL permanen: Named Tunnel Cloudflare + domain sendiri.
4. **Dua URL beda:** FQDN node = URL WINGS tunnel (port 8080); `allowed_origins` + `APP_URL` = URL PANEL (port 80).
5. **Ganti FQDN/domain node = WAJIB deploy ulang token daemon** (Auto Deploy di admin → Nodes) + restart wings. FQDN baru tanpa redeploy token = node merah.
6. **Image docker server bot:** wajib varian yolks Pterodactyl (ada entrypoint), plus butuh `git` di dalam image buat install dependency.
