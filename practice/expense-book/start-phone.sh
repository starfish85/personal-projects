#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT=8765
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo "在手机浏览器打开下面这个地址（手机和电脑要连同一个 Wi-Fi）："
if [[ -n "$IP" ]]; then
  echo "  http://${IP}:${PORT}/web/"
else
  echo "  没读到局域网 IP，请在电脑上执行 ipconfig getifaddr en0 后自行拼接。"
fi
echo
echo "iPhone：Safari 打开后，点分享 → 添加到主屏幕"
echo "Android：Chrome 打开后，点菜单 → 添加到主屏幕"
echo
echo "按 Ctrl+C 结束"
echo

python3 -m http.server "$PORT" --bind 0.0.0.0
