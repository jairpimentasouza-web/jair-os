#!/usr/bin/with-contenv bash
set -Eeuo pipefail

# IROS CLOUD BROWSER - TAILSCALE
# Acesso privado pela rede Tailscale.
# Nunca imprimir credenciais ou cookies.

# ==========================================
# 1. DIRETORIOS E ESTADO PERSISTENTE
# ==========================================

STATE_DIR="/config/.iros-tailscale"
SOCKET="$STATE_DIR/tailscaled.sock"
STATE="$STATE_DIR/tailscaled.state"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

# ==========================================
# 2. INICIAR TAILSCALE
# ==========================================

echo "IROS_TAILSCALE: starting private userspace network"

/usr/local/bin/tailscaled \
  --tun=userspace-networking \
  --state="$STATE" \
  --statedir="$STATE_DIR" \
  --socket="$SOCKET" \
  >/dev/stdout 2>&1 &

DAEMON_PID=$!

# ==========================================
# 3. ENCERRAMENTO SEGURO
# ==========================================

shutdown() {
  kill "$DAEMON_PID" 2>/dev/null || true
  wait "$DAEMON_PID" 2>/dev/null || true
}

trap shutdown EXIT INT TERM

# ==========================================
# 4. AGUARDAR INICIALIZACAO
# ==========================================

ready=false

for i in $(seq 1 35); do
  if /usr/local/bin/tailscale \
    --socket="$SOCKET" status --json \
    >/dev/null 2>&1; then

    ready=true
    break
  fi

  sleep 1
done

if [ "$ready" != "true" ]; then
  echo "IROS_TAILSCALE: daemon_unavailable"
  exit 1
fi

# ==========================================
# 5. VALIDAR AUTENTICACAO
# ==========================================

if ! /usr/local/bin/tailscale \
  --socket="$SOCKET" status --json \
  | grep -Eq '"BackendState"[[:space:]]*:[[:space:]]*"Running"'; then

  echo "IROS_TAILSCALE: official_owner_approval_required"

  /usr/local/bin/tailscale \
    --socket="$SOCKET" up \
    --hostname=iros-activesoft-cloud \
    --accept-dns=false

fi

echo "IROS_TAILSCALE: tailnet_connected"

# ==========================================
# 6. CORRECAO EXPERIMENTAL DE TRANSPORTE
# ==========================================

# Desabilitar somente o encaminhamento HTTPS
# anterior do Tailscale Serve.
# Nao habilitar Tailscale Funnel.

/usr/local/bin/tailscale \
  --socket="$SOCKET" \
  serve --https=443 off || true

# Encaminhar HTTPS para o nginx local usando
# TLS-terminated TCP, sem o proxy HTTP do Serve.
# O endereco permanece privado na tailnet.

if /usr/local/bin/tailscale \
  --socket="$SOCKET" \
  serve --bg \
  --tls-terminated-tcp=443 \
  tcp://127.0.0.1:3000; then

  echo "IROS_TAILSCALE: private_tcp_https_configured"

else

  echo "IROS_TAILSCALE: private_tcp_https_failed"

fi

# ==========================================
# 7. MANTER O SERVICO ATIVO
# ==========================================

wait "$DAEMON_PID"
