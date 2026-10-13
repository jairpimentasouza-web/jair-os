
#!/usr/bin/with-contenv bash
set -Eeuo pipefail

# Dedicated tailnet state lives in the existing Railway /config volume.
# Never print credentials or browser cookies.
STATE_DIR="/config/.iros-tailscale"
SOCKET="$STATE_DIR/tailscaled.sock"
STATE="$STATE_DIR/tailscaled.state"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

echo "IROS_TAILSCALE: starting private userspace network"

/usr/local/bin/tailscaled \
  --tun=userspace-networking \
  --state="$STATE" \
  --statedir="$STATE_DIR" \
  --socket="$SOCKET" \
  >/dev/stdout 2>&1 &

DAEMON_PID=$!

shutdown() {
  kill "$DAEMON_PID" 2>/dev/null || true
  wait "$DAEMON_PID" 2>/dev/null || true
}

trap shutdown EXIT INT TERM

ready=false

for i in $(seq 1 35); do
  if /usr/local/bin/tailscale --socket="$SOCKET" status --json >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [ "$ready" != "true" ]; then
  echo "IROS_TAILSCALE: daemon_unavailable"
  exit 1
fi

# A first-time login prints an official Tailscale approval URL
# to Railway logs.
# The owner approves it in their own Tailscale account.
# No key is sent to chat.

if ! /usr/local/bin/tailscale --socket="$SOCKET" status --json \
  | grep -Eq '"BackendState"[[:space:]]*:[[:space:]]*"Running"'; then

  echo "IROS_TAILSCALE: official_owner_approval_required"

  /usr/local/bin/tailscale --socket="$SOCKET" up \
    --hostname=iros-activesoft-cloud \
    --accept-dns=false
fi

echo "IROS_TAILSCALE: tailnet_connected"

# Kasm/Selkies GUI and Tailscale are on localhost
# in the SAME container.
# HTTPS is ONLY available inside the tailnet.
# Do not enable Funnel.

if /usr/local/bin/tailscale --socket="$SOCKET" serve --bg \
  --https=443 http://127.0.0.1:3000; then

  echo "IROS_TAILSCALE: private_https_serve_configured"

else
  echo "IROS_TAILSCALE: serve_setup_requires_tailnet_https_approval_or_review"
fi

# Keep the WireGuard userspace endpoint
# and its session continuously available.

wait "$DAEMON_PID"
