#!/usr/bin/env bash
# 品牌沟通助手 · 服务器一键部署（可重复执行，再次运行即更新）
#
# 用法（在服务器上，项目解压目录内）：
#   sudo bash deploy/setup.sh
# 可选环境变量：
#   DOMAIN=soochowhackathon261101.noiamist.com   域名
#   PORT=3100                                    应用监听端口（仅本机，由 nginx 转发）
#
# 前提：项目目录下已有 .env.local，且其中 DEEPSEEK_API_KEY 已填写。
# 本脚本只新增本站点自己的 nginx 配置文件，不修改服务器上已有的其他站点。
set -euo pipefail

DOMAIN="${DOMAIN:-soochowhackathon261101.noiamist.com}"
PORT="${PORT:-3100}"
NAME="brand-assistant"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\n[错误] %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "请用 root 或 sudo 运行：sudo bash deploy/setup.sh"
[ -f "$APP_DIR/package.json" ] || die "没有在项目目录里找到 package.json：$APP_DIR"
[ -f "$APP_DIR/.env.local" ] || die "缺少 $APP_DIR/.env.local。请先执行：cp .env.example .env.local，并填写 DEEPSEEK_API_KEY"
grep -Eq '^DEEPSEEK_API_KEY=.+' "$APP_DIR/.env.local" || die ".env.local 里的 DEEPSEEK_API_KEY 还是空的"
chmod 600 "$APP_DIR/.env.local"

if command -v apt-get >/dev/null 2>&1; then PM=apt
elif command -v dnf >/dev/null 2>&1; then PM=dnf
elif command -v yum >/dev/null 2>&1; then PM=yum
else die "不支持的系统：找不到 apt-get / dnf / yum"; fi
. /etc/os-release 2>/dev/null || true
log "系统：${PRETTY_NAME:-未知}（包管理器 $PM），域名 $DOMAIN，应用端口 $PORT"

install_pkg() {
  if [ "$PM" = apt ]; then DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
  else "$PM" install -y "$@"; fi
}

# ---------- 端口检查：只允许被本应用自己占用 ----------
if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$PORT$"; then
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$NAME" >/dev/null 2>&1; then
    log "端口 $PORT 由本应用占用，将直接更新"
  else
    die "端口 $PORT 已被其他程序占用。请换一个端口重新运行，例如：sudo PORT=3200 bash deploy/setup.sh"
  fi
fi

# ---------- Node.js 22 ----------
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] && need_node=0
fi
if [ "$need_node" = 1 ]; then
  log "安装 Node.js 22"
  [ "$PM" = apt ] && apt-get update -y
  install_pkg curl ca-certificates
  if [ "$PM" = apt ]; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  else curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -; fi
  install_pkg nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ---------- nginx / certbot / pm2 ----------
if ! command -v nginx >/dev/null 2>&1; then
  log "安装 nginx"
  [ "$PM" = apt ] && apt-get update -y
  install_pkg nginx
fi
if ! command -v certbot >/dev/null 2>&1; then
  log "安装 certbot（HTTPS 证书）"
  if [ "$PM" = apt ]; then install_pkg certbot python3-certbot-nginx || true
  else install_pkg certbot python3-certbot-nginx || { install_pkg epel-release && install_pkg certbot python3-certbot-nginx; } || true; fi
fi
command -v pm2 >/dev/null 2>&1 || { log "安装 pm2"; npm install -g pm2; }

# ---------- 构建 ----------
log "安装依赖并构建（约 1–3 分钟）"
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build

# ---------- 启动 / 更新 ----------
log "用 pm2 启动应用"
pm2 delete "$NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$NAME" --cwd "$APP_DIR" -- start -- -p "$PORT" -H 127.0.0.1
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------- nginx 站点（只写本站点自己的文件） ----------
if [ -d /etc/nginx/sites-available ]; then
  CONF=/etc/nginx/sites-available/$NAME.conf
  LINK=/etc/nginx/sites-enabled/$NAME.conf
else
  CONF=/etc/nginx/conf.d/$NAME.conf
  LINK=""
fi
if [ ! -f "$CONF" ]; then
  log "写入 nginx 配置：$CONF"
  cat >"$CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
  [ -n "$LINK" ] && ln -sf "$CONF" "$LINK"
else
  log "nginx 配置已存在，保留不动：$CONF"
fi
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl is-active --quiet nginx && systemctl reload nginx || systemctl start nginx

# ---------- 服务器自带防火墙放行 80/443 ----------
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http >/dev/null; firewall-cmd --permanent --add-service=https >/dev/null; firewall-cmd --reload >/dev/null
fi

# ---------- 本机自检 ----------
log "本机自检"
for i in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
  [ "$code" = 200 ] && break
  sleep 1
done
[ "$code" = 200 ] || die "应用没有正常启动（HTTP $code）。查看日志：pm2 logs $NAME --lines 50"
echo "应用已在 127.0.0.1:$PORT 运行"

# ---------- DNS 与 HTTPS ----------
PUBLIC_IP="$(curl -s --max-time 5 https://api.ipify.org || true)"
DNS_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
echo "服务器公网 IP：${PUBLIC_IP:-未知}；$DOMAIN 当前解析到：${DNS_IP:-（未解析）}"
if [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" = "$PUBLIC_IP" ]; then
  if command -v certbot >/dev/null 2>&1; then
    log "申请 HTTPS 证书"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      && echo "HTTPS 已开启" \
      || echo "[提示] 证书申请失败：请确认腾讯云防火墙已放行 80 和 443 端口，然后重新运行本脚本"
  else
    echo "[提示] 未能安装 certbot，暂时只有 HTTP。"
  fi
else
  echo "[提示] 域名还没有解析到本服务器，先跳过 HTTPS。DNS 生效后重新运行本脚本即可自动申请证书。"
fi

log "完成"
echo "访问地址：http://$DOMAIN （证书申请成功后为 https://$DOMAIN）"
echo "常用命令：pm2 status | pm2 logs $NAME | 更新代码后重新运行 sudo bash deploy/setup.sh"
