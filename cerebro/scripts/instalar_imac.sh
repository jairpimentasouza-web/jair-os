#!/bin/bash
# Instala o Cérebro JOS (Jarvis) no iMac, ao lado do Jair OS existente.
#
#   cd ~/jair-os/cerebro && ./scripts/instalar_imac.sh            # API + modelos
#   ./scripts/instalar_imac.sh --voz                             # + Jarvis ouvindo sempre (LaunchAgent)
#
# Não altera o Jair OS: usa o executor tipado existente (desktop_command_bridge.py)
# e só escreve em ~/.jos-cerebro, no venv e em ~/Library/LaunchAgents/com.jairos.cerebro.*.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")/.." && pwd)"
CASA="${CEREBRO_HOME:-$HOME/.jos-cerebro}"
VENV="$CASA/venv"
COM_VOZ=0
for a in "$@"; do [[ "$a" == "--voz" ]] && COM_VOZ=1; done

PY=""
for c in /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then PY="$c"; break; fi
done
[[ -n "$PY" ]] || { echo "Python 3.9+ não encontrado"; exit 1; }
echo "→ Python: $PY ($("$PY" --version))"

mkdir -p "$CASA" "$CASA/logs"
chmod 700 "$CASA"
if [[ ! -x "$VENV/bin/python" ]]; then "$PY" -m venv "$VENV"; fi
"$VENV/bin/python" -m pip install -q --upgrade pip
"$VENV/bin/python" -m pip install -q -e "$AQUI[voz,api]"
echo "→ Pacote instalado em $VENV"

if [[ ! -f "$CASA/config.yaml" ]]; then
  cat > "$CASA/config.yaml" <<'YAML'
# Configuração do Cérebro JOS (Jarvis). Variáveis CEREBRO_<CAMPO> sobrepõem estes valores.
nome_usuario: Jair
modo_desktop: auto        # auto = usa ~/JairOS/desktop-personal/desktop_command_bridge.py se existir
modo_jos: auto            # auto = usa o conector MCP do JOS se JOS_MCP_URL estiver definido
usar_llm: true            # Ollama local (qwen3) como último recurso de entendimento e para conversa
modelo_llm: qwen3:1.7b
modelo_stt: small         # small = melhor exatidão em PT-BR; base = mais rápido, menos exato
modo_despertar: transcricao   # funciona com qualquer pronúncia; "oww" após "python -m cerebro calibrar"
voz_tts: say
voz_say: Luciana
janela_conversa_s: 7
porta: 8767
YAML
  echo "→ Criado $CASA/config.yaml"
fi

echo "→ Baixando modelos de voz (uma vez só)…"
"$VENV/bin/python" - <<'PY'
from faster_whisper import WhisperModel
for m in ("base", "small"):
    WhisperModel(m, device="cpu", compute_type="int8")
    print("   Whisper", m, "ok")
try:
    import openwakeword.utils as u
    u.download_models(["hey_jarvis"])
    print("   openWakeWord hey_jarvis ok")
except Exception as e:
    print("   openWakeWord indisponível:", e)
PY

echo "→ Sincronizando léxico local (escolas, alunos, turmas)…"
"$VENV/bin/python" "$AQUI/scripts/sincronizar_local.py" || echo "   (sincronização parcial — veja acima)"

echo "→ Autotestes…"
"$VENV/bin/python" -m cerebro --simulado --sem-llm dizer "Jarvis, abre o Chrome" | grep '"fala"'
"$VENV/bin/python" -m cerebro avaliar | grep -E "===|Acurácia de intenção|Falsos"

CFG_EXEC="$HOME/JairOS/always_on/config.json"
if [[ -f "$CFG_EXEC" ]]; then
  "$VENV/bin/python" - "$CFG_EXEC" "$AQUI/cerebro/lexico/dados/apps.yaml" <<'PY'
import json, sys, yaml
cfg = json.load(open(sys.argv[1])); apps = yaml.safe_load(open(sys.argv[2]))
perm = cfg.get("allowed_apps", {})
faltam = {d["mac"]: d["mac_app"] for d in apps.values() if d.get("mac") and d["mac"] not in perm}
if faltam:
    print("→ O executor do iMac ainda não autoriza abrir %d apps do léxico." % len(faltam))
    print("  Para liberar, acrescente em allowed_apps de %s:" % sys.argv[1])
    print("  " + json.dumps(faltam, ensure_ascii=False))
PY
fi

LA="$HOME/Library/LaunchAgents"
mkdir -p "$LA"
plist() {  # $1 rótulo  $2 subcomando
  cat > "$LA/$1.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key><array><string>$VENV/bin/python</string><string>-m</string><string>cerebro</string><string>$2</string></array>
  <key>WorkingDirectory</key><string>$AQUI</string>
  <key>EnvironmentVariables</key><dict><key>PYTHONUNBUFFERED</key><string>1</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$CASA/logs/$2.out.log</string>
  <key>StandardErrorPath</key><string>$CASA/logs/$2.err.log</string>
</dict></plist>
PL
  launchctl bootout "gui/$(id -u)/$1" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$LA/$1.plist"
  echo "→ Serviço $1 ativo"
}
plist com.jairos.cerebro.api servir
if [[ $COM_VOZ -eq 1 ]]; then
  plist com.jairos.cerebro.voz ouvir
  echo "   Na primeira vez, o macOS pede permissão de Microfone para o Python ($VENV/bin/python)."
fi

cat <<FIM

Pronto. Console: http://127.0.0.1:8767   ·   Logs: $CASA/logs
Testar por texto:   $VENV/bin/python -m cerebro
Testar por voz:     $VENV/bin/python -m cerebro ouvir   (diga "Jarvis, abre o Chrome")
Conectar ao JOS:    defina JOS_MCP_URL e JOS_MCP_TOKEN (conector MCP do Jair OS) e rode de novo.
FIM
