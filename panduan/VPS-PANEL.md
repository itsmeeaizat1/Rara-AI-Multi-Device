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

## Langkah 10 — Cloudflare Tunnel (Opsional tapi disarankan)

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

> ⚠️ URL Quick Tunnel **BERUBAH tiap restart service**. Solusi permanen: Cloudflare **Named Tunnel** (`cloudflared tunnel login` → `tunnel create` → route DNS domain sendiri).

---

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

Bot Rara (.cpanel / .setpanel) butuh Application API key:

1. Panel (sebagai admin): klik avatar → **API Credentials** → Create New
2. Copy key (format `ptla_xxx...`) — **hanya sekali ditampilin!**
3. Di bot owner:

```
.setpanel http://IP_VPS, ptla_xxx...
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

## Checklist Final

- [ ] Password root sudah diganti
- [ ] SSH port sudah diganti ke 40000an
- [ ] SSH key jalan (login tanpa password)
- [ ] UFW + Fail2Ban sudah di-setup (**setelah Docker!**)
- [ ] Login admin web panel OK (reCAPTCHA udah dicek)
- [ ] Panel accessible (IP / tunnel)
- [ ] Wings `active (running)`
- [ ] FQDN node = URL Wings; `allowed_origins` = URL panel
- [ ] Daemon Port di panel = 443 (tunnel)
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
5. **Image docker server bot:** wajib varian yolks Pterodactyl (ada entrypoint), plus butuh `git` di dalam image buat install dependency.
