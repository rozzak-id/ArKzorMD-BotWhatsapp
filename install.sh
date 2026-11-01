#!/usr/bin/env bash
# ==============================================================================
# ArKzorMD - Script Instalasi Otomatis VPS (Ubuntu/Debian)
# https://github.com/rozzak-id/ArKzorMD-BotWhatsapp
# ==============================================================================

set -euo pipefail

# Warna terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
    ___         __ __                 __  _______ 
   /   |  _____/ //_/___  ____  _____/  |/  / __ \
  / /| | / ___/ ,<  /_  / / __ \/ ___/ /|_/ / / / /
 / ___ |/ /  / /| |  / /_/ /_/ / /  / /  / / /_/ / 
/_/  |_/_/  /_/ |_| /___/\____/_/  /_/  /_/_____/  
                                                   
           Hybrid AI WhatsApp Bot Platform
EOF
echo -e "${NC}"

echo -e "${BLUE}[*] Memulai instalasi otomatis ArKzorMD di VPS...${NC}"

# 1. Cek hak akses root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] Harap jalankan script ini sebagai root atau dengan sudo:${NC}"
  echo -e "    sudo bash $0"
  exit 1
fi

# 2. Update paket sistem dasar
echo -e "${BLUE}[1/6] Memperbarui indeks paket sistem...${NC}"
apt-get update -y
apt-get install -y curl wget git build-essential ca-certificates gnupg

# 3. Cek / Pasang Node.js LTS (v22)
echo -e "${BLUE}[2/6] Memeriksa instalasi Node.js...${NC}"
NEED_NODE=false
if ! command -v node >/dev/null 2>&1; then
  NEED_NODE=true
else
  NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VER" -lt 20 ]; then
    echo -e "${YELLOW}[!] Versi Node.js ($NODE_VER) kurang dari v20. Memperbarui...${NC}"
    NEED_NODE=true
  fi
fi

if [ "$NEED_NODE" = true ]; then
  echo -e "${BLUE}[*] Memasang Node.js v22 LTS dari NodeSource...${NC}"
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi

echo -e "${GREEN}[✓] Node.js terpasang: $(node -v) / npm: $(npm -v)${NC}"

# 4. Tentukan direktori aplikasi
INSTALL_DIR="/opt/arkzormd"
if [ -f "./package.json" ] && grep -q "arkzormd" "./package.json"; then
  INSTALL_DIR="$(pwd)"
  echo -e "${BLUE}[3/6] Menggunakan direktori proyek saat ini: ${INSTALL_DIR}${NC}"
else
  echo -e "${BLUE}[3/6] Menyiapkan direktori instalasi di ${INSTALL_DIR}...${NC}"
  if [ ! -d "${INSTALL_DIR}" ]; then
    git clone https://github.com/rozzak-id/ArKzorMD-BotWhatsapp.git "${INSTALL_DIR}"
  else
    cd "${INSTALL_DIR}"
    git pull origin main || true
  fi
  cd "${INSTALL_DIR}"
fi

# 5. Pasang dependensi dan bangun build
echo -e "${BLUE}[4/6] Memasang dependensi npm & kompilasi...${NC}"
npm install
npm run build

# Buat direktori data
mkdir -p "${INSTALL_DIR}/data"

# Siapkan file .env jika belum ada
if [ ! -f "${INSTALL_DIR}/.env" ]; then
  if [ -f "${INSTALL_DIR}/.env.example" ]; then
    cp "${INSTALL_DIR}/.env.example" "${INSTALL_DIR}/.env"
    echo -e "${GREEN}[✓] File .env dibuat dari .env.example${NC}"
  fi
fi

# Pastikan HOST=0.0.0.0 agar bisa diakses dari luar
if [ -f "${INSTALL_DIR}/.env" ]; then
  if grep -q "^HOST=" "${INSTALL_DIR}/.env"; then
    sed -i 's/^HOST=.*/HOST=0.0.0.0/' "${INSTALL_DIR}/.env"
  else
    echo "HOST=0.0.0.0" >> "${INSTALL_DIR}/.env"
  fi
  if grep -q "^WHATSAPP_MODE=" "${INSTALL_DIR}/.env"; then
    sed -i 's/^WHATSAPP_MODE=.*/WHATSAPP_MODE=live/' "${INSTALL_DIR}/.env"
  else
    echo "WHATSAPP_MODE=live" >> "${INSTALL_DIR}/.env"
  fi
fi

# 6. Pasang Service systemd
echo -e "${BLUE}[5/6] Mendaftarkan systemd service (arkzormd.service)...${NC}"
SERVICE_USER="root"
if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
  SERVICE_USER="${SUDO_USER}"
  chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"
fi

cat << EOF > /etc/systemd/system/arkzormd.service
[Unit]
Description=ArKzorMD - Hybrid AI WhatsApp Bot
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) apps/server/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable arkzormd.service
systemctl restart arkzormd.service

# 7. Informasi Selesai
echo -e "${BLUE}[6/6] Menyiapkan informasi akses...${NC}"
SERVER_IP=$(curl -s -4 https://api.ipify.org || curl -s -4 https://ifconfig.me || hostname -I | awk '{print $1}')

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Instalasi ArKzorMD Berhasil! Service aktif di background.${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "Dashboard Web UI : ${CYAN}http://${SERVER_IP}:3000${NC}"
echo -e "Direktori Proyek : ${CYAN}${INSTALL_DIR}${NC}"
echo -e "Status Service   : ${CYAN}systemctl status arkzormd${NC}"
echo -e "Lihat Log Bot    : ${CYAN}journalctl -u arkzormd -f${NC}"
echo -e "Restart Service  : ${CYAN}systemctl restart arkzormd${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "${YELLOW}Langkah Selanjutnya:${NC}"
echo -e "1. Buka browser dan kunjungi: ${CYAN}http://${SERVER_IP}:3000${NC}"
echo -e "2. Ikuti Setup Wizard (buat password admin, masukkan API key, dan hubungkan WhatsApp via Pairing Code 8-digit)."
echo -e "================================================================\n"

