#!/usr/bin/env bash
set -euo pipefail

readonly DOMAIN="${DOMAIN:-irondillo.com}"
readonly CHECK_HEADERS="${CHECK_HEADERS:-true}"
readonly EXPECTED_DEPLOYMENT_SHA="${EXPECTED_DEPLOYMENT_SHA:-}"
readonly CONTACT_PATH="/contact.html"
readonly HTTPS_URL="https://${DOMAIN}${CONTACT_PATH}"
readonly DEPLOYMENT_URL="https://${DOMAIN}/deployment.json"
readonly ALTERNATE_HOSTNAMES="${ALTERNATE_HOSTNAMES:-www.${DOMAIN}}"
readonly DEPLOYMENT_ATTEMPTS="${DEPLOYMENT_ATTEMPTS:-20}"
readonly DEPLOYMENT_RETRY_SECONDS="${DEPLOYMENT_RETRY_SECONDS:-15}"
readonly EXPECTED_HEADERS_FILE="${EXPECTED_HEADERS_FILE:-config/security-headers.json}"

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
deployment_file="$(mktemp)"
trap 'rm -f "$redirect_headers" "$headers_file" "$deployment_file"' EXIT

[[ "$EXPECTED_DEPLOYMENT_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || \
  fail "EXPECTED_DEPLOYMENT_SHA must be the 40-character Git SHA being deployed"
[[ -r "$EXPECTED_HEADERS_FILE" ]] || fail "Expected security policy is not readable: ${EXPECTED_HEADERS_FILE}"

active_deployment_sha=""
for ((attempt = 1; attempt <= DEPLOYMENT_ATTEMPTS; attempt++)); do
  : > "$deployment_file"
  if curl --silent --show-error --fail --location --max-time 20 \
    --header 'Cache-Control: no-cache' --output "$deployment_file" \
    "${DEPLOYMENT_URL}?release=${EXPECTED_DEPLOYMENT_SHA}&attempt=${attempt}"; then
    active_deployment_sha="$(sed -n 's/^[[:space:]]*{"sha":"\([0-9a-fA-F]\{40\}\)"}[[:space:]]*$/\1/p' "$deployment_file")"
  fi
  if [[ "${active_deployment_sha,,}" == "${EXPECTED_DEPLOYMENT_SHA,,}" ]]; then
    printf 'Confirmed production deployment %s (attempt %d/%d)\n' \
      "$EXPECTED_DEPLOYMENT_SHA" "$attempt" "$DEPLOYMENT_ATTEMPTS"
    break
  fi
  if (( attempt < DEPLOYMENT_ATTEMPTS )); then
    printf 'Production deployment is %s, waiting for %s (attempt %d/%d); retrying in %ss...\n' \
      "${active_deployment_sha:-unavailable}" "$EXPECTED_DEPLOYMENT_SHA" "$attempt" \
      "$DEPLOYMENT_ATTEMPTS" "$DEPLOYMENT_RETRY_SECONDS" >&2
    sleep "$DEPLOYMENT_RETRY_SECONDS"
  fi
done
[[ "${active_deployment_sha,,}" == "${EXPECTED_DEPLOYMENT_SHA,,}" ]] || \
  fail "Production deployment did not become ${EXPECTED_DEPLOYMENT_SHA} after ${DEPLOYMENT_ATTEMPTS} attempts (active: ${active_deployment_sha:-unavailable})"

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
# one direct hop to the HTTPS contact page and preserve the requested path.
check_direct_redirect "http://${DOMAIN}${CONTACT_PATH}"
for hostname in $ALTERNATE_HOSTNAMES; do
  check_direct_redirect "http://${hostname}${CONTACT_PATH}"
  check_direct_redirect "https://${hostname}${CONTACT_PATH}"
done

fetch_https() {
  local https_status final_url tls_verify_result

  : > "$headers_file"
  read -r https_status final_url tls_verify_result < <(
    curl --silent --show-error --fail --location --dump-header "$headers_file" \
      --output /dev/null --max-time 20 \
      --write-out '%{http_code} %{url_effective} %{ssl_verify_result}\n' "$HTTPS_URL"
  )
  [[ "$https_status" == "200" ]] || fail "${HTTPS_URL} returned HTTP ${https_status:-no status}"
  [[ "$final_url" == "$HTTPS_URL" ]] || fail "Final HTTPS URL is ${final_url:-missing}, expected ${HTTPS_URL}"
  [[ "$tls_verify_result" == "0" ]] || fail "TLS certificate verification failed for ${HTTPS_URL}: ${tls_verify_result:-unknown result}"
}

fetch_https

if [[ "$CHECK_HEADERS" == "false" ]]; then
  printf 'HTTPS preflight checks passed for %s\n' "$HTTPS_URL"
  exit 0
fi

# Compare every declared production security header byte-for-byte with the
# trusted policy from this revision. This catches both missing directives and
# unexpectedly loosened values rather than sampling a few CSP guarantees.
expected_header_count=0
while IFS=$'\t' read -r header_name expected_value; do
  ((expected_header_count += 1))
  actual_value="$(header_value "$header_name")"
  [[ "$actual_value" == "$expected_value" ]] || \
    fail "${header_name} does not match ${EXPECTED_HEADERS_FILE} (expected: ${expected_value}; actual: ${actual_value:-missing})"
done < <(node -e '
  const policy = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  for (const [name, value] of Object.entries(policy)) console.log(`${name}\t${value}`);
' "$EXPECTED_HEADERS_FILE")
((expected_header_count > 0)) || fail "No security headers found in ${EXPECTED_HEADERS_FILE}"

printf 'Production security checks passed for %s\n' "$HTTPS_URL"
