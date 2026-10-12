FROM docker.io/tailscale/tailscale:stable AS tailscale
FROM lscr.io/linuxserver/chromium:latest

# Same container, same 400 MB /config volume: no sixth Railway service.
COPY --from=tailscale /usr/local/bin/tailscale /usr/local/bin/tailscale
COPY --from=tailscale /usr/local/bin/tailscaled /usr/local/bin/tailscaled
COPY --chmod=0755 tailscale-cloud.sh /custom-services.d/tailscale-cloud

# The original Selkies/Chromium entrypoint is deliberately preserved.
# The tailnet is the ONLY external access path; never add a public Railway domain.