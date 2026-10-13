# IROS Cloud Browser + ActiveSoft Read Adapter
# Preparacao: adaptador desabilitado ate homologacao

FROM docker.io/tailscale/tailscale:stable AS tailscale
FROM node:22-bookworm-slim AS node_runtime

FROM lscr.io/linuxserver/chromium:latest

# Manter a rede privada existente
COPY --from=tailscale /usr/local/bin/tailscale /usr/local/bin/tailscale
COPY --from=tailscale /usr/local/bin/tailscaled /usr/local/bin/tailscaled

# Runtime para o adaptador
COPY --from=node_runtime /usr/local/bin/node /usr/local/bin/node
RUN /usr/local/bin/node --version

# Preservar inicializacao atual do Tailscale
COPY --chmod=0755 tailscale-cloud.sh /custom-services.d/tailscale-cloud

# Instalar adaptador no mesmo container
COPY read-adapter/active-read.mjs /opt/iros/active-read.mjs
COPY --chmod=0755 read-adapter/run /custom-services.d/iros-read-adapter

# Nenhuma porta publica adicional
# O adaptador permanece desativado sem IROS_READ_TOKEN
