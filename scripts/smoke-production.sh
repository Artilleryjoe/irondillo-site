#!/usr/bin/env bash
set -euo pipefail

readonly DOMAIN="${DOMAIN:-irondillo.com}"
readonly CHECK_HEADERS="${CHECK_HEADERS:-true}"
readonly CONTACT_PATH="/contact.html"
readonly HTTPS_URL="https://${DOMAIN}${CONTACT_PATH}"
readonly ALTERNATE_HOSTNAMES="${ALTERNATE_HOSTNAMES:-www.${DOMAIN}}"
readonly EXPECTED_CSP="default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; frame-src https://www.google.com; connect-src 'self' https://formsubmit.co; form-action 'self' https://formsubmit.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"

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

check_direct_redirect() {
  local source_url="$1"
  local redirect_status redirect_location

  : > "$redirect_headers"
  curl --silent --show-error --dump-header "$redirect_headers" --output /dev/null \
    --max-time 20 "$source_url"
  redirect_status="$(awk 'NR == 1 { sub(/\r$/, "", $2); print $2 }' "$redirect_headers")"
  [[ "$redirect_status" =~ ^30[1278]$ ]] || fail "${source_url} returned ${redirect_status:-no status}, not a redirect"
  redirect_location="$(awk 'BEGIN { IGNORECASE = 1 } /^location:/ { sub(/\r$/, ""); sub(/^[^:]*:[[:space:]]*/, ""); print; exit }' "$redirect_headers")"
  [[ "$redirect_location" == "$HTTPS_URL" ]] || fail "${source_url} does not redirect directly to ${HTTPS_URL}: ${redirect_location:-missing Location header}"
}

# The canonical HTTP URL and both schemes on every alternate hostname must make
# one direct hop to the HTTPS contact page. This prevents the form rendering on
# an insecure origin and catches redirect chains that lose the requested path.
check_direct_redirect "http://${DOMAIN}${CONTACT_PATH}"
for hostname in $ALTERNATE_HOSTNAMES; do
  check_direct_redirect "http://${hostname}${CONTACT_PATH}"
  check_direct_redirect "https://${hostname}${CONTACT_PATH}"
done

read -r https_status final_url tls_verify_result < <(
  curl --silent --show-error --fail --location --dump-header "$headers_file" \
    --output /dev/null --max-time 20 \
    --write-out '%{http_code} %{url_effective} %{ssl_verify_result}\n' "$HTTPS_URL"
)
[[ "$https_status" == "200" ]] || fail "${HTTPS_URL} returned HTTP ${https_status:-no status}"
[[ "$final_url" == "$HTTPS_URL" ]] || fail "Final HTTPS URL is ${final_url:-missing}, expected ${HTTPS_URL}"
[[ "$tls_verify_result" == "0" ]] || fail "TLS certificate verification failed for ${HTTPS_URL}: ${tls_verify_result:-unknown result}"

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
