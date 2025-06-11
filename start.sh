#!/bin/bash

clear_screen() {
    printf "\033c"
}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BOLD='\033[1m'
RESET='\033[0m'

clear_screen

echo -e "${CYAN}${BOLD}"
echo " __      __      ___.                         ___________.__.__               "
echo "/  \\    /  \\ ____\\_ |__   ___________  ____   \\__    ___/|__|  |   ___________ "
echo "\\   \\/\\/   // __ \\| __ \\ /  _ \\_  __ \\/    \\    |    |   |  |  | _/ __ \\_  __ \\"
echo " \\        /\\  ___/| \\_\\ (  <_> )  | \\/   |  \\   |    |   |  |  |__\\  ___/|  | \\/"
echo "  \\__/\\  /  \\___  >___  /\\____/|__|  |___|  /   |____|   |__|____/ \\___  >__|   "
echo "       \\/       \\/    \\/                  \\/                            \\/      "
echo -e "${RESET}"
echo -e "${MAGENTA}======================================================================${RESET}"
echo -e "${YELLOW}${BOLD}           Selamat Datang di WANZ OFC TECT Marketplace Server           ${RESET}"
echo -e "${MAGENTA}======================================================================${RESET}"
echo ""

echo -e "${WHITE}Mempersiapkan server...${RESET}"
sleep 1 
echo -e "${GREEN}Persiapan selesai.${RESET}"

echo -e "\n${BLUE}Menjalankan server Node.js aplikasi...${RESET}"
echo -e "${MAGENTA}----------------------------------------------------------------------${RESET}"

SERVER_PID=""

cleanup() {
    echo -e "\n\n${RED}Menghentikan server...${RESET}"
    if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID"
        wait "$SERVER_PID" 2>/dev/null
    fi
    echo -e "${GREEN}Server dihentikan.${RESET}"
    exit 0
}

trap cleanup SIGINT SIGTERM

node server.js &
SERVER_PID=$!

echo ""
echo -e "${GREEN}${BOLD}Server sedang berjalan (PID: $SERVER_PID). Tekan Ctrl+C untuk menghentikan.${RESET}"
echo -e "${MAGENTA}======================================================================${RESET}"

wait "$SERVER_PID"