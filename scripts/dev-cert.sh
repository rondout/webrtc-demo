#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 开发证书：与 Windows 脚本使用相同路径，不修改系统信任库。
cert_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.certs"
if [[ "${1:-}" != "--force" && -f "$cert_dir/dev-cert.pem" && -f "$cert_dir/dev-key.pem" ]]; then
  echo 'Development certificate already exists. Use --force to regenerate.'
  exit 0
fi
command -v openssl >/dev/null || { echo 'Install OpenSSL first: sudo apt install openssl' >&2; exit 1; }
mkdir -p "$cert_dir"

# 自动收集本机 IPv4；额外的域名/公网 IP 可通过 CERT_DNS / CERT_IP 指定。
san="DNS:localhost,IP:127.0.0.1,IP:::1"
for ip in $(hostname -I); do
  if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    san+=",IP:$ip"
  fi
done
[[ -z "${CERT_DNS:-}" ]] || san+=",DNS:$CERT_DNS"
[[ -z "${CERT_IP:-}" ]] || san+=",IP:$CERT_IP"

# 私钥只允许当前用户读取；生成失败时不覆盖已有证书。
umask 077
temp_dir="$(mktemp -d "$cert_dir/.generate-XXXXXX")"
trap 'rm -f "$temp_dir/key.pem" "$temp_dir/cert.pem"; rmdir "$temp_dir"' EXIT
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
  -keyout "$temp_dir/key.pem" -out "$temp_dir/cert.pem" \
  -subj '/CN=WebRTC Demo Development' \
  -addext "subjectAltName=$san" \
  -addext 'basicConstraints=critical,CA:FALSE' \
  -addext 'keyUsage=critical,digitalSignature,keyEncipherment' \
  -addext 'extendedKeyUsage=serverAuth'
mv "$temp_dir/key.pem" "$cert_dir/dev-key.pem"
mv "$temp_dir/cert.pem" "$cert_dir/dev-cert.pem"
echo "Development certificate created in $cert_dir"
echo 'Browser trust must be configured separately.'
