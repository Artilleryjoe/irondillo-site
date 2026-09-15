#!/usr/bin/env bash
set -euo pipefail

readonly DOMAIN="${DOMAIN:-irondillo.com}"
readonly CHECK_HEADERS="${CHECK_HEADERS:-true}"
readonly HTTPS_URL="https://${DOMAIN}/"
readonly EXPECTED_CSP="default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; form-action 'self' mailto:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

header_value() {
  local name="$1"
  awk -v wanted="${name,,}" '
    BEGIN { IGNORECASE = 1 }
    {
      sub(/\r$/, "")
      key = $0
      sub(/:.*/, "", key)
      if (tolower(key) == wanted) {
        sub(/^[^:]*:[[:space:]]*/, "")
        print
        exit
      }
    }
  ' "$headers_file"
}

redirect_headers="$(mktemp)"
headers_file="$(mktemp)"
trap 'rm -f "$redirect_headers" "$headers_file"' EXIT

curl --silent --show-error --dump-header "$redirect_headers" --output /dev/null \
  --max-time 20 "http://${DOMAIN}/"
redirect_status="$(awk 'NR == 1 { print $2 }' "$redirect_headers")"
[[ "$redirect_status" =~ ^30[1278]$ ]] || fail "HTTP returned ${redirect_status:-no status}, not a permanent/temporary redirect"
redirect_location="$(awk 'BEGIN { IGNORECASE = 1 } /^location:/ { sub(/\r$/, ""); sub(/^[^:]*:[[:space:]]*/, ""); print; exit }' "$redirect_headers")"
[[ "$redirect_location" == "$HTTPS_URL" ]] || fail "HTTP redirect does not target ${HTTPS_URL}: ${redirect_location:-missing Location header}"

curl --silent --show-error --fail --dump-header "$headers_file" --output /dev/null \
  --max-time 20 "$HTTPS_URL"

if [[ "$CHECK_HEADERS" == "false" ]]; then
  printf 'HTTPS preflight checks passed for %s\n' "$HTTPS_URL"
  exit 0
fi

[[ "$(header_value content-security-policy)" == "$EXPECTED_CSP" ]] || fail "Content-Security-Policy does not match _headers"
[[ "$(header_value x-content-type-options)" == "nosniff" ]] || fail "X-Content-Type-Options is missing or invalid"
[[ "$(header_value referrer-policy)" == "strict-origin-when-cross-origin" ]] || fail "Referrer-Policy is missing or invalid"
[[ "$(header_value permissions-policy)" == "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()" ]] || fail "Permissions-Policy is missing or invalid"
[[ "$(header_value x-frame-options)" == "DENY" ]] || fail "X-Frame-Options is missing or invalid"
[[ "$(header_value strict-transport-security)" == "max-age=31536000" ]] || fail "Strict-Transport-Security is missing or invalid"

printf 'Production security checks passed for %s\n' "$HTTPS_URL"
