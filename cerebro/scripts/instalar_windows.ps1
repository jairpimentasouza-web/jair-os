# Instala o Jarvis (Cérebro JOS) no Windows e cria o atalho "Jarvis" na área de trabalho.
#
#   powershell -ExecutionPolicy Bypass -File instalar_windows.ps1
#   powershell -ExecutionPolicy Bypass -File instalar_windows.ps1 -IniciarComWindows
#
# Escreve só em %USERPROFILE%\JarvisJOS (código), %USERPROFILE%\.jos-cerebro (venv, config,
# modelos, logs) e nos atalhos. Não pede administrador.
param(
    [switch]$IniciarComWindows,
    [string]$Ramo = "claude/friendly-cannon-y678ly",
    [string]$Repo = "jairpimentasouza-web/jair-os"
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
$env:PIP_DISABLE_PIP_VERSION_CHECK = "1"

$Casa   = Join-Path $env:USERPROFILE ".jos-cerebro"
$Codigo = Join-Path $env:USERPROFILE "JarvisJOS"
$Venv   = Join-Path $Casa "venv"
$VPy    = Join-Path $Venv "Scripts\python.exe"
$VPyW   = Join-Path $Venv "Scripts\pythonw.exe"
function Passo([string]$t) { Write-Host "-> $t" }
function Rodar([string]$exe, [string[]]$argumentos, [string]$erro) {
    # Programas externos (pip, python) escrevem avisos no stderr; só o código de saída decide.
    $antes = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    & $exe @argumentos
    $codigo = $LASTEXITCODE; $ErrorActionPreference = $antes
    if ($codigo -ne 0) { throw "$erro (código $codigo)" }
}
New-Item -ItemType Directory -Force -Path $Casa, (Join-Path $Casa "logs") | Out-Null

# 1. Código ---------------------------------------------------------------
$Local = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { "" }
if ($Local -and (Test-Path (Join-Path $Local "pyproject.toml")) -and ($Local -ne $Codigo)) {
    $Fonte = $Local
    Passo "Usando o código de $Fonte"
} elseif ((Test-Path (Join-Path $Codigo "pyproject.toml")) -and $env:JARVIS_SEM_DOWNLOAD) {
    $Fonte = $Codigo
} else {
    Passo "Baixando o Jarvis do GitHub ($Ramo)..."
    $tmp = Join-Path $env:TEMP ("jarvis-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $zip = Join-Path $tmp "jarvis.zip"
    Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/$Repo/zip/refs/heads/$Ramo" -OutFile $zip
    Expand-Archive -Force $zip (Join-Path $tmp "src")
    $raiz = Get-ChildItem (Join-Path $tmp "src") -Directory | Select-Object -First 1
    $Fonte = Join-Path $raiz.FullName "cerebro"
}
if ($Fonte -ne $Codigo) {
    if (Test-Path (Join-Path $Codigo "pyproject.toml")) { Remove-Item -Recurse -Force $Codigo }
    Copy-Item -Recurse -Force $Fonte $Codigo
}
Passo "Código em $Codigo"

# 2. Python + ambiente virtual ----------------------------------------------
$Py = $null
$candidatos = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python310\python.exe")
)
foreach ($c in $candidatos) { if (Test-Path $c) { $Py = $c; break } }
if (-not $Py) {
    $Py = (Get-Command python -All -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike "*WindowsApps*" } | Select-Object -First 1).Source
}
if (-not $Py) { throw "Python 3.10+ não encontrado. Instale em https://www.python.org/downloads/ e rode de novo." }
Passo "Python: $Py"
if (-not (Test-Path $VPy)) { Rodar $Py @("-m", "venv", $Venv) "não consegui criar o ambiente virtual" }
Rodar $VPy @("-m", "pip", "install", "-q", "--upgrade", "pip") "falha ao atualizar o pip"
Passo "Instalando dependências (pode levar alguns minutos)..."
Rodar $VPy @("-m", "pip", "install", "-q", "-e", ($Codigo + "[voz,api,windows]")) "falha no pip install"

# 3. Configuração -------------------------------------------------------------
$Cfg = Join-Path $Casa "config.yaml"
if (-not (Test-Path $Cfg)) {
@"
# Configuração do Jarvis (Cérebro JOS) neste computador.
nome_usuario: Jair
modo_desktop: auto          # no Windows usa o executor nativo do Jarvis
modo_jos: auto              # liga ao JOS quando JOS_MCP_URL e JOS_MCP_TOKEN estiverem definidos
usar_llm: true              # usa o Ollama local se estiver rodando
modelo_stt: small           # small = mais exato; base = mais rápido
modelo_stt_despertar: base
modo_despertar: transcricao # funciona com qualquer pronúncia de "Jarvis"/"Jair"
voz_tts: windows
voz_say: Microsoft Maria Desktop
janela_conversa_s: 7
porta: 8767
"@ | Set-Content -Encoding UTF8 $Cfg
    Passo "Configuração criada em $Cfg"
}

# 4. Modelos de voz -----------------------------------------------------------
Passo "Baixando os modelos de reconhecimento de voz (uma vez só)..."
Rodar $VPy @("-c", "from faster_whisper import WhisperModel; [WhisperModel(m, device='cpu', compute_type='int8') for m in ('base','small')]; print('   modelos ok')") "falha ao baixar os modelos de voz"

# 5. Ícone e atalhos ------------------------------------------------------------
$Ico = Join-Path $Casa "jarvis.ico"
Rodar $VPy @((Join-Path $Codigo "scripts\criar_icone.py"), $Ico) "falha ao criar o ícone"
$ws = New-Object -ComObject WScript.Shell
function Atalho([string]$caminho) {
    $l = $ws.CreateShortcut($caminho)
    $l.TargetPath = $VPyW
    $l.Arguments = "-m cerebro janela"
    $l.WorkingDirectory = $Codigo
    $l.IconLocation = $Ico
    $l.Description = "Jarvis - cérebro do Jair OS"
    $l.Save()
}
$Desk = [Environment]::GetFolderPath("Desktop")
Atalho (Join-Path $Desk "Jarvis.lnk")
Passo "Atalho criado: $(Join-Path $Desk 'Jarvis.lnk')"
$Menu = Join-Path ([Environment]::GetFolderPath("Programs")) "Jarvis.lnk"
Atalho $Menu
if ($IniciarComWindows) {
    Atalho (Join-Path ([Environment]::GetFolderPath("Startup")) "Jarvis.lnk")
    Passo "O Jarvis vai abrir junto com o Windows"
}

# 6. Microfone ---------------------------------------------------------------
$chave = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone"
$geral = (Get-ItemProperty -Path $chave -Name Value -ErrorAction SilentlyContinue).Value
$desk  = (Get-ItemProperty -Path "$chave\NonPackaged" -Name Value -ErrorAction SilentlyContinue).Value
if ($geral -eq "Deny" -or $desk -eq "Deny") {
    Write-Warning "O Windows está bloqueando o microfone para apps da área de trabalho. Abra Configurações > Privacidade > Microfone e ative 'Permitir que aplicativos da área de trabalho acessem o microfone'."
}

# 7. Autoteste ---------------------------------------------------------------
Passo "Autoteste:"
$ErrorActionPreference = "Continue"
& $VPy -m cerebro --sem-llm entender "jarvis abre o google chrome" | Select-String '"intencao"' | Select-Object -First 1
& $VPy -m cerebro avaliar | Select-String "===|Acur"
Write-Host ""
Write-Host "Pronto! Dê dois cliques em 'Jarvis' na área de trabalho e diga: Jarvis, abre o Chrome."
