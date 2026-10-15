#!/bin/bash
# Prepara a sessão cloud para o agente mater-provas: gerador de provas (python-docx, LibreOffice
# com o módulo de equações, poppler, pandoc) e robô do livro digital Poliedro (Node + Playwright).
# Só instala o que faltar; numa imagem já pronta termina em poucos segundos.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

pacotes_apt=()
command -v soffice >/dev/null 2>&1 || pacotes_apt+=(libreoffice-writer)
command -v pdftoppm >/dev/null 2>&1 || pacotes_apt+=(poppler-utils)
command -v pandoc >/dev/null 2>&1 || pacotes_apt+=(pandoc)
# Sem o módulo Math, o LibreOffice apaga as equações ao gerar o PDF.
if ! ls /usr/lib/libreoffice/program/libsmlo.* >/dev/null 2>&1; then
  pacotes_apt+=(libreoffice-math)
fi

if [ ${#pacotes_apt[@]} -gt 0 ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y --no-install-recommends "${pacotes_apt[@]}" >/dev/null 2>&1 \
    || { apt-get update >/dev/null 2>&1 && apt-get install -y --no-install-recommends "${pacotes_apt[@]}" >/dev/null; }
fi

pacotes_pip=()
python3 -c "import docx" 2>/dev/null || pacotes_pip+=(python-docx)
python3 -c "import yaml" 2>/dev/null || pacotes_pip+=(pyyaml)
python3 -c "import lxml" 2>/dev/null || pacotes_pip+=(lxml)
python3 -c "import PIL" 2>/dev/null || pacotes_pip+=(pillow)
if [ ${#pacotes_pip[@]} -gt 0 ]; then
  pip install --quiet "${pacotes_pip[@]}" 2>/dev/null || pip install --quiet --break-system-packages "${pacotes_pip[@]}"
fi

# O Chromium já vem em /opt/pw-browsers (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD evita baixar de novo).
if command -v node >/dev/null 2>&1 && ! node -e "require('playwright')" >/dev/null 2>&1; then
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -g --silent playwright >/dev/null
fi

echo "mater-provas: dependências prontas"
