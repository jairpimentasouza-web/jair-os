# Cérebro JOS — o Jarvis do Jair OS

Comando de voz em português que **entende, decide e executa**. Você fala "Jarvis, me lembra
amanhã às 3 da tarde de ligar para a coordenação" e ele cria o aviso local, registra a tarefa no
JOS e responde em voz alta. Tudo roda no iMac, sem nuvem obrigatória.

```
"Jarvis, abre o class rum"      → abre o Google Classroom
"fecha ele"                     → fecha o app que acabou de abrir (memória de conversa)
"o que eu tenho amanhã?" … "e na sexta?"   → agenda de amanhã, depois a de sexta
"posta um aviso na 2101 dizendo que a prova foi adiada" → pede confirmação, depois publica
"quando eu falar modo aula quero dizer abre o classroom" → aprende o seu jeito de falar
```

## O que existia antes (diagnóstico de 18/11/2026)

O JOS já tinha **peças** de um cérebro, mas desconectadas:

| Peça | Onde | Situação |
|---|---|---|
| Workflow `jair.personal` "Jarvis Front Door" e agente executivo `JOS Executive / Jarvis` | Supabase (orquestrador) | beta / *candidate*, sem entrada de voz |
| Jair Personal (`/api/desktop/command`, `/jair`) | iMac, `~/JairOS/apps/api` | regex + 36 correções + 12 categorias; voz só por botão |
| `JairOS-Voice-Upgrade` (corpus de 32 mil frases) | iMac, pasta solta | só Windows, nunca integrado; sidecar parado |
| Dispositivos "Jairo OS Voice" | JOS | revogados em 11/09/2026 |

Três entendedores diferentes (Python, TypeScript, regex) e nenhum ligado ao orquestrador,
às tarefas ou à memória do JOS. O Cérebro substitui os três por um só e conversa com o
mesmo executor tipado e com as mesmas ferramentas `jair_os_*` que o JOS já usa.

## Arquitetura

```mermaid
flowchart LR
    M[Microfone] --> D{Despertar<br/>"Jarvis"/"Jair"}
    D --> S[Whisper small<br/>+ viés do léxico]
    S --> N[Normalizador PT-BR<br/>correções, contrações,<br/>números, molduras]
    N --> G[1 · Gramática<br/>padrões × formas verbais]
    G -->|não casou| C[2 · Classificador<br/>TF-IDF n-gramas + vizinho fuzzy]
    C -->|incerto| L[3 · LLM local<br/>Ollama, JSON restrito]
    G & C & L --> DI[Diálogo<br/>contexto, anáfora,<br/>slots, desambiguação]
    DI --> P{Política R0–R4}
    P -->|executa / confirma| E[Executores]
    E --> X[Executor do iMac<br/>desktop_command_bridge.py]
    E --> J[JOS via MCP<br/>tarefas, memória, aulas,<br/>Classroom, orquestrador]
    E --> F[Funções locais<br/>hora, contas, lembretes]
    DI --> T[Voz: say Luciana / Piper]
```

**Princípio herdado do JOS:** a inteligência pode ser probabilística; a autorização é
determinística. O LLM só escolhe entre habilidades registradas e nunca executa nada sozinho.

## Os frameworks escolhidos (e por quê)

| Camada | Escolha | Por quê |
|---|---|---|
| Reconhecimento de voz | **faster-whisper** (CTranslate2, int8) | melhor exatidão offline em PT-BR em CPU antiga; aceita `hotwords` → o léxico enviesa a transcrição |
| Despertar | **transcrição em 2 estágios** (Whisper base procura "Jarvis/Jair", o small transcreve o comando); **openWakeWord** opcional | o modelo `hey_jarvis` é inglês e oscilou de 0,008 a 0,82 com pronúncia brasileira nos testes — por isso não é o padrão |
| Casamento difuso | **RapidFuzz** + **chave fonética PT-BR** própria | "gugou cromi" → Google Chrome, "class rum" → Classroom, em microssegundos |
| Entendimento | gramática compilada + classificador TF-IDF + **Ollama** (qwen3) como último recurso | explicável, rápido (mediana 0,7 ms), e robusto quando a frase sai torta |
| API | **FastAPI** + Uvicorn (127.0.0.1) | HTTP, WebSocket e console web com microfone |
| Fala | `say` (voz Luciana) no macOS; **Piper** neural offline como alternativa | sem custo, interrompível |
| Integração | executor tipado existente + **MCP** do JOS | não contorna as políticas nem a auditoria que já existem |

## A biblioteca de palavras

Medida com `python -m cerebro lexico`:

| Item | Quantidade |
|---|---:|
| Famílias de verbos (abrir, tocar, lembrar, lançar…) | 44 |
| Formas verbais geradas (abre, abra, abri, abrindo, abrisse…) | 6.175 |
| Entidades (apps, sites, ajustes, pastas, disciplinas, 200+ tópicos de Física/Matemática/Química, bancas) | 313 |
| Apelidos de entidades (como as pessoas falam e como o Whisper escreve) | 804 |
| Expressões de conversa (confirmação, negação, cortesia, hesitação, molduras de pedido) | 499 |
| Correções de transcrição ("draive" → drive, "a ve um" → AV1, "fashion" → fecha o) | 156 |
| **Total de termos** | **7.598** |
| Habilidades / padrões | 60 / 147 |
| Frases distintas aceitas pela gramática (estimativa combinatória) | ~3 × 10¹⁵ |

Três camadas, mescladas nesta ordem:

1. **núcleo** — `cerebro/lexico/dados/*.yaml` (público, neste repositório);
2. **local** — `~/.jos-cerebro/local.yaml`: alunos, escolas, turmas, contatos. **Privado**, gerado por
   `scripts/sincronizar_local.py` a partir do JOS e das preferências do Jair Personal. Nunca vai para o Git;
3. **aprendido** — `~/.jos-cerebro/aprendido.yaml`: o que você ensinou por voz ou com `python -m cerebro aprender`.

## Resultados medidos

Todos os números abaixo vêm deste repositório (`python -m cerebro avaliar` e
`scripts/teste_voz_ponta_a_ponta.py`). Use nomes fictícios do léxico de exemplo.

| Teste | Resultado |
|---|---|
| Conjunto de desenvolvimento (229 frases com erros de transcrição, gírias, hesitações) | 100% intenção · 100% slots · 0 falsos positivos — **ajustado sobre ele, não é medida independente** |
| **Conjunto cego** (80 frases escritas depois do ajuste), 1ª execução | **92,0% intenção · 92,2% slots · 0 de 5 falsos positivos** |
| Conjunto cego após corrigir as lacunas gerais que ele revelou | 98,7% intenção · 98,0% slots (já não é cego) |
| **Voz ponta a ponta** (fala sintética Piper PT-BR → Whisper small + viés → Cérebro, 40 comandos, 3 execuções finais) | **37, 40 e 39 de 40 → média 96,7%** (faixa 92,5–100%) |
| Comparação na mesma rodada (1 execução cada): small **com** viés · small **sem** viés · base com viés | 97,5% · 90,0% · 70,0% |
| Latência do entendimento | mediana 0,7 ms · p95 ≈ 10 ms |
| Testes automatizados | 76 passando em Python 3.9 e 3.13 |

A síntese do Piper varia a cada execução, por isso o resultado oscila. Fala sintética é mais limpa
que a sua voz numa sala real: trate esses números como teto. O próximo passo
de validação é gravar 30–50 comandos seus e rodar o mesmo teste no iMac.

## Instalação no iMac

```bash
git clone https://github.com/jairpimentasouza-web/jair-os.git ~/jair-os
```

```bash
cd ~/jair-os/cerebro && ./scripts/instalar_imac.sh
```

O instalador cria `~/.jos-cerebro/venv`, baixa os modelos (Whisper base/small, hey_jarvis), gera o
léxico local, roda os autotestes e ativa a API como serviço (`com.jairos.cerebro.api`). Com `--voz`
ativa também o Jarvis ouvindo o tempo todo (`com.jairos.cerebro.voz`). Na primeira vez o macOS pede
permissão de microfone.

Para ligar ao JOS (tarefas, memória, aulas, Classroom, orquestrador), defina o endereço e o token
do conector MCP do Jair OS e rode o instalador de novo:

```bash
export JOS_MCP_URL="https://…/mcp" JOS_MCP_TOKEN="…"
```

Sem isso, as habilidades do JOS rodam em modo simulado e dizem que o conector não está configurado.

## Uso

```bash
~/.jos-cerebro/venv/bin/python -m cerebro                 # conversa por texto
```

```bash
~/.jos-cerebro/venv/bin/python -m cerebro ouvir           # voz: "Jarvis, abre o Chrome"
```

```bash
~/.jos-cerebro/venv/bin/python -m cerebro entender "jarbas abre o class rum"
```

```bash
~/.jos-cerebro/venv/bin/python -m cerebro habilidades     # tudo que ele sabe fazer
```

```bash
~/.jos-cerebro/venv/bin/python -m cerebro calibrar        # testa o openWakeWord com a sua voz
```

Console web com microfone: <http://127.0.0.1:8767>. API: `POST /v1/comando {"texto": "..."}`,
`POST /v1/audio` (arquivo), `POST /v1/entender`, `GET /v1/habilidades`, `WS /v1/conversa`.

### Ensinar o seu jeito de falar

* Por voz: "Jarvis, quando eu falar *modo aula* quero dizer *abre o classroom*".
* Ver o que ele não entendeu: `python -m cerebro nao-entendidos` → ensine com `python -m cerebro aprender "frase" "significado"`.
* Nomes de alunos, escolas e turmas entram no `local.yaml` e passam a enviesar o Whisper automaticamente.

## O que ele faz (60 habilidades)

| Domínio | Exemplos |
|---|---|
| Computador | abrir/fechar apps, volume, mudo, ajustes (Wi-Fi, Bluetooth, som…), print, foto, disco/memória/CPU, diagnóstico, pastas, procurar e abrir arquivos, área de transferência, bloquear tela, pausar/continuar/pular mídia |
| Internet | abrir sites, pesquisar no Google ou dentro de um site (YouTube, Drive, Gmail, Maps, Wikipédia), tocar música no YouTube, responder perguntas ("o que é entropia?") |
| Google | ver agenda do dia/semana, criar evento (formulário preenchido), rascunho de e-mail, avisos do mural e publicação no Classroom |
| JOS | tarefas (criar, listar, concluir), lembretes com hora, memória (guardar e consultar), registrar aula de aluno, ficha do aluno, pedir material didático, encaminhar qualquer pedido ao orquestrador, briefing do dia, fechamento, financeiro, status |
| Cálculo | média, nota necessária para passar, contas faladas ("15 por cento de 80") com aritmética decimal exata |
| Escola | abrir o sistema da escola, consultar/lançar frequência e notas (ActiveSoft e portais), com confirmação |
| Conversa | saudação, hora, data, ajuda, aprender e esquecer apelidos, conversa livre via LLM local |

## Segurança

| Risco | Exemplos | Regra |
|---|---|---|
| R0 | abrir app, ver disco, pesquisar | executa |
| R1 | volume, fechar app, rascunho de e-mail | confirma se a confiança for < 0,7 ou vier do LLM |
| R2 | tarefa, memória, aula no JOS | confirma se a confiança for < 0,8 ou vier do LLM |
| R3 | publicar no Classroom, lançar nota ou frequência | **sempre** confirma por voz; o executor ainda pede o clique final |
| R4 | apagar, desligar | bloqueado (ou exige "confirmo", se habilitado) |

* As ações no computador passam pelo `desktop_command_bridge.py` do JOS: mesma lista de ações permitidas,
  mesma confirmação nativa, mesmo log `jair-personal-actions.jsonl`.
* Execuções que gastam créditos de IA no JOS (`jair_os_executar`) sempre perguntam antes.
* Cada pedido vai para `~/.jos-cerebro/auditoria.jsonl` (texto, intenção, decisão, resultado; sem áudio).
* A API escuta só em 127.0.0.1; `token_api` no config exige `Authorization: Bearer`.

## Limitações conhecidas

* **Agenda falada:** o conector do JOS não tem ferramenta de Calendar; o Jarvis abre a agenda do dia certo,
  mas ainda não lê os eventos em voz alta.
* **openWakeWord:** o `hey_jarvis` é treinado em inglês. O padrão é o despertar por transcrição; treinar um
  modelo próprio em PT-BR ("Ei Jarvis") é o caminho para despertar com menos CPU.
* **Desempenho no iMac (Intel de 4 núcleos, 8 GB):** o Whisper small transcreveu a 0,74× tempo real neste ambiente de
  testes; no iMac deve ficar perto de 1–1,5×, ou seja 2–3 s por comando curto. `modelo_stt: base` é ~3× mais
  rápido, mas acertou 70% no teste de voz.
* Apps fora da `allowed_apps` do executor do iMac precisam ser liberados lá (o instalador lista quais).

## Estrutura

```
cerebro/
  texto/        normalização, números, datas/horas, fonética PT-BR, conjugador
  lexico/       biblioteca de palavras (YAML) + carregador em 3 camadas
  nlu/          gramática, entidades, classificador, LLM, motor, habilidades/*.yaml
  dialogo/      política R0–R4, auditoria, respostas faladas
  execucao/     planos, executor do iMac, cliente MCP do JOS, lembretes, construtores
  voz/          microfone, despertar, Whisper, fala, laço do assistente
  nucleo.py     o Cérebro (diálogo completo)
  api.py        FastAPI + console web
tests/          76 testes + conjuntos de avaliação (ouro e cego)
scripts/        instalador do iMac, sincronizador do léxico local, teste de voz ponta a ponta
```
