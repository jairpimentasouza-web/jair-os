# O que vai turbinar o Jair OS é verificação, não autonomia

A tecnologia de 2026 que mais serve ao Jair OS não é um modelo mais inteligente. É um padrão de engenharia que Anthropic, OpenAI, Google e os motores de execução durável passaram a adotar juntos. Ele tem quatro peças: um log de eventos durável fora do agente, um "cérebro" sem estado, "mãos" descartáveis e uma regra de que só existe sucesso depois que o efeito externo é verificado de forma independente ([Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents); [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)). Os modelos atuais já dão conta do trabalho de um professor. O Claude Haiku 5.5 custa **US$0,10/US$0,50 por milhão de tokens**, e o Opus 5.5 entrega nível de ponta por US$4/US$20 ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)). Mesmo assim, os melhores agentes concluem **menos da metade** das tarefas longas de uso de computador do OSWorld 2.x quando o critério é estrito ([Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)). As dores do sistema vivo vêm do harness e do protocolo de efeito, não de falta de inteligência: as 57 notas ditadas que não entraram, as execuções fechadas como "não verificadas", o job bloqueado por falta de recibo mesmo com o resultado externo confirmado, os dispositivos sem heartbeat e as execuções paradas. As peças que resolvem isso são baratas. A primeira é execução durável no próprio Postgres (DBOS Transact, gratuito). Depois vêm chaves de idempotência estáveis, leases com heartbeat, disjuntores por executor e scripts Playwright determinísticos, cuja escrita é relida por um canal independente. Por fim, aprovação humana imposta pelo servidor, não pelo modelo. O gasto extra com modelos fica em poucos dólares por mês se o Haiku rotear e checar, o Sonnet gerar com cache e o Batch API rodar o que não é urgente. A regulação mudou no mesmo ritmo, e três normas já se aplicam ao sistema. A primeira é a LGPD (Art. 14). A segunda é o ECA Digital, em vigor desde 17 de março de 2026, que a ANPD começa a fiscalizar em janeiro de 2027. A terceira é a **Resolução CNE/CP nº 1/2026, de 11 de novembro**: ela proíbe nota de redação dada só por IA e decisões totalmente automatizadas sobre alunos, e classifica a previsão de evasão e o perfilamento acadêmico como alto risco ([CRUB](https://www.crub.org.br/resolucao-cnecp-001-11nov26/)). O roteiro no fim do relatório tem três horizontes. Nas primeiras duas semanas, o foco é estancar as falhas, inclusive prazos de modelos que vencem em 30 de novembro e 1º de dezembro. De um a três meses, vêm a camada durável, a certificação empírica e a documentação de conformidade. Depois disso, o empacotamento em Skills, MCP Apps, banco de questões e produtos educacionais.

## Os modelos de novembro de 2026 sobram; o gargalo é o harness

A Anthropic oferece hoje quatro faixas de modelo, todas com contexto de 1 milhão de tokens. O **Fable 5.2** custa US$8/US$40; saiu em 9 de novembro com o primeiro corte de preço da linha. O **Opus 5.5** custa US$4/US$20 e é de 22 de setembro. O **Sonnet 5.5** custa US$2/US$10, com leitura de cache a US$0,10. O **Haiku 5.5** custa US$0,10/US$0,50 em prompts de até 100 mil tokens, ou US$0,05/US$0,25 em lote ([release notes da Claude](https://platform.claude.com/docs/en/release-notes/overview.md); [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)). Segundo a Anthropic, o Opus 5.5 "performs at the level of Claude Fable 5.1 on most work" e custa 40% menos que o Opus 5 ([Anthropic](https://www.anthropic.com/news/claude-opus-5-5)).

A OpenAI respondeu em 17 de novembro com o **GPT-6.2 Astra** (US$8/US$40) e o **GPT-6.2 Sol** (US$2/US$10) ([OpenAI](https://openai.com/index/introducing-gpt-6-2-astra-sol)). O Google lançou entre outubro e novembro a família **Gemini 4** (Argon, Carbon, Hydrogen e Neon) e tornou o Computer Use disponível para todos em 30 de outubro ([Gemini API changelog](https://aistudio.google.com/docs/changelog)).

No índice composto da Artificial Analysis v5, de 27 de outubro, o Opus 5.5 fez 58 pontos e o GPT-6 Astra, 57. O melhor modelo de pesos abertos já liberados ficou em 32 ([Artificial Analysis](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)). A liderança troca de mãos em semanas, e no topo as diferenças são de poucos pontos. O que separa os modelos é o **custo por tarefa concluída**. O próprio Opus 5.5 faz 35 pontos por US$0,98 por tarefa em esforço baixo e 58 pontos por US$10,04 em esforço máximo ([Artificial Analysis](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)). Para o Jair OS, escolher o modelo deixou de ser a decisão crítica. Os modelos de pesos abertos seguem 26 pontos atrás e só servem para tarefas locais em massa e de baixo risco.

A segunda lição de 2026 é a velocidade com que tudo muda.

- **Anthropic.** O Sonnet 4.5 será aposentado em **30 de novembro de 2026**. No Fable 5.1/5.2, no Opus 5.5 e no Sonnet 5.5, forçar `tool_choice` devolve HTTP 400. A partir da versão de API `2026-10-21`, enviar `temperature`, `top_p` ou `top_k` também devolve 400, em qualquer modelo ([release notes](https://platform.claude.com/docs/en/release-notes/overview.md); [guia de migração](https://platform.claude.com/docs/en/about-claude/models/migration-guide.md)).
- **Google.** Em **1º de dezembro**, as chamadas a `gemini-2.5-pro` e `gemini-2.5-flash` passam a ser desviadas para modelos mais novos. Na mesma data, o Gemini 4 Carbon e o Argon dobram de preço, de US$2/US$10 para US$4/US$20. O Gemini 3.8 Flash dobra em 1º de janeiro de 2027 ([Gemini pricing](https://aistudio.google.com/docs/pricing)).
- **OpenAI.** O Agent Builder visual do AgentKit sai do ar em 30 de novembro, cerca de 14 meses depois do lançamento. A OpenAI recomenda migrar para o Agents SDK, em código ([OpenAI](https://openai.com/index/introducing-agentkit/)).

Os 72 contratos de agente precisam de uma camada fina de adaptação por provedor e de IDs de modelo fixados. Também precisam ser auditados antes dessas datas. Construtores visuais hospedados prendem o usuário ao fornecedor, e isso vale também para os recursos proprietários de nuvem do n8n.

Os três fornecedores agora vendem ambientes hospedados para rodar agentes.

- **Claude Managed Agents** (beta desde abril). Reúne vários recursos:
  - agendamentos com cron e fuso horário (desde 9 de junho);
  - *outcomes*, em que um avaliador separado, com contexto próprio, pontua cada iteração contra uma rubrica até ela passar;
  - memory stores com versões auditáveis;
  - sandboxes hospedadas pelo próprio usuário, cujo worker busca trabalho por conexões de saída;
  - cofres que trocam a credencial só na saída da requisição;
  - orçamentos por sessão.

  O preço é **US$0,08 por hora de sessão ativa**, mais tokens. Uma sessão de uma hora no Opus 5.5, com 50 mil tokens de entrada e 15 mil de saída, custa US$0,58 ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)). Há duas restrições decisivas. O Managed Agents não é elegível a ZDR e guarda o histórico da sessão até alguém apagá-lo ([visão geral da plataforma](https://platform.claude.com/docs/en/build-with-claude/overview.md)). E a ferramenta de uso de computador "isn't available in Claude Managed Agents" ([docs de computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)).
- **Tarefas agendadas do Claude Code.** São cobradas da assinatura, não da API. Em compensação, rodam em modo automático e, por padrão, incluem todos os conectores do usuário ([Claude Code docs](https://code.claude.com/docs/en/routines.md)).
- **OpenAI.** O DevDay de 29 de setembro trouxe três novidades: o Agents API com uso de computador, a Decisions API para roteamento barato e as MCP Events, que disparam automações a partir de eventos em apps conectados ([OpenAI DevDay](https://openai.com/index/devday-2026-recap/)).

Para o Jair OS, esses ambientes hospedados podem substituir o host do n8n, que está offline. Isso vale só para fluxos de nuvem sem dados identificáveis de alunos, como relatórios, materiais com portão de qualidade e manutenção do repositório. A automação dos ERPs escolares tem de continuar rodando nas máquinas do próprio sistema.

As formas de baratear o uso se somam:

- o processamento em lote dá **50% de desconto** nos três grandes fornecedores;
- no Opus 5.5 e no Sonnet 5.5, ler do cache custa 0,05 vez o preço da entrada;
- os modelos pequenos (Haiku 5.5, GPT-6 Luna, Gemini Flash-Lite) custam entre US$0,10 e US$0,30 por milhão de tokens de entrada.

As fontes são as tabelas de preço da [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing.md), da [OpenAI](https://developers.openai.com/api/docs/pricing) e do [Google](https://aistudio.google.com/docs/pricing). A própria Anthropic recomenda testar o modelo mais capaz com esforço menor antes de montar cascatas de modelos, porque cada modelo tem seu próprio cache. Também recomenda medir o custo por tarefa concluída ([guia de custo](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md)).

A pilha recomendada para o Jair OS tem quatro camadas:

- Haiku 5.5 para roteamento, classificação e checagem de releitura;
- Sonnet 5.5 para geração, com prompts de sistema e padrões editoriais em cache;
- Batch API para ingestão do banco de questões e geração em massa;
- Opus ou Fable só como avaliadores de saídas críticas.

No Batch API, 2.000 questões com ~3 mil tokens de entrada e ~1 mil de saída cada custam cerca de US$16 a US$22 no Sonnet 5.5 (cálculo a partir da tabela de preços). O gasto com modelos quase nulo de hoje não é problema em si. O problema é não gastar centavos com verificação.

## Toda a indústria convergiu para log durável e mãos descartáveis

O texto de engenharia mais útil do ano para o Jair OS é "Decoupling the brain from the hands", da Anthropic, de 8 de abril. Ele divide o agente em três partes:

- uma **sessão**, que é um log de eventos ao qual só se acrescenta, guardado fora de tudo;
- um **harness** sem estado;
- **sandboxes** descartáveis — "cattle, not pets".

Todas são chamadas por uma única interface, `execute(name, input) → string`. Se um contêiner falha, isso vira um erro de ferramenta e outro contêiner é criado. Se o harness cai, `wake(sessionId)` o substitui: relê o log e retoma do último evento. As credenciais ficam num cofre e nunca entram no sandbox. No desenho anterior, acoplado, um bug de harness, um evento perdido e um contêiner morto "looked identical from outside". Separados, passaram a ser distinguíveis, e a latência p50 até o primeiro token caiu cerca de 60% ([Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)). A OpenAI chegou ao mesmo ponto com snapshot e reidratação no Agents SDK. O Google, com Sessions e Memory Bank disponíveis para todos no Agent Engine ([OpenAI](https://openai.com/index/the-next-evolution-of-the-agents-sdk/); [Google Developers Blog](https://developers.googleblog.com/agents-adk-agent-engine-a2a-enhancements-google-io/)).

O artigo de Kiran Prakash no site de Martin Fowler, de 10 de novembro, completa o quadro. O runtime registra cada passo que mexe no mundo externo; depois de uma queda, reexecuta o programa pulando os passos já concluídos. Mas "what the runtime can't do is make a retry safe". A chave de idempotência tem de ser a mesma em toda tentativa e toda reexecução, e um "não sabemos" pode significar que a ação aconteceu. O artigo também mostra agentes retomando uma espera de aprovação em menos de 3 segundos, sem consumir computação enquanto esperam ([Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)).

Para um desenvolvedor sozinho no Supabase, o **DBOS** é o que melhor se encaixa, por três motivos:

- guarda o estado do workflow como linhas no próprio Postgres, então uma única transação atualiza o checkpoint e as tabelas de negócio;
- deixa um workflow suspenso por até uma semana à espera de uma mensagem de aprovação, sem consumir recursos;
- permite listar passos via SQL e retomar um workflow a partir do passo que falhou ([DBOS docs](https://docs.dbos.dev/python/tutorials/workflow-communication); [DBOS](https://www.dbos.dev/blog/why-workflows-should-be-postgres-rows)).

A biblioteca Transact é **gratuita**. O plano Pro, que inclui o console Conductor e a recuperação distribuída, custa **US$99/mês** ([DBOS pricing](https://dbos.dev/pricing)). As alternativas também são baratas em baixo volume:

- Temporal Cloud, sem mensalidade mínima e a US$50 por milhão de ações ([Temporal pricing](https://temporal.io/pricing));
- Inngest, com 50 mil execuções grátis ([Inngest pricing](https://www.inngest.com/pricing));
- Trigger.dev Hobby, a US$10/mês, sem cobrar esperas acima de 5 segundos ([Trigger.dev pricing](https://trigger.dev/pricing));
- Hatchet, com 1 milhão de execuções grátis ([Hatchet pricing](https://hatchet.run/pricing)).

O custo real é a complexidade de operação, por isso o critério deve ser o encaixe no Postgres que já existe. As peças nativas do Supabase não formam um motor. As Edge Functions têm limite de tempo de 150 segundos no plano Free e 400 no pago, e `waitUntil` não estende esse limite ([Supabase limits](https://supabase.com/docs/guides/functions/limits)). O pgmq não tem fila de mensagens mortas, limite de tentativas nem alerta. Num teste, uma mensagem envenenada chegou a 14 leituras sem que nenhum erro aparecesse ([DEV](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)). As Edge Functions devem servir só de porta de entrada: webhooks, aprovações, heartbeats e enfileiramento. O motor fica num worker que roda continuamente. Ainda falta testar o DBOS com o pooler do Supabase e confirmar o que a recuperação faz sem o Conductor.

O n8n 2.x amadureceu em conectores e ganhou revisão humana nativa para chamadas de ferramenta de IA. Mas tem três problemas:

- o modo fila não é o padrão;
- alta disponibilidade com várias instâncias principais existe só no plano Enterprise auto-hospedado;
- a comunidade relatou regressões sérias de confiabilidade no modo fila depois da v2, além de um bug na v2.10.4 em que aprovações por Gmail nunca devolvem o resultado ao agente.

As fontes são a [documentação do modo fila](https://docs.n8n.io/hosting/scaling/queue-mode/) e os relatos no fórum, [sobre o modo fila](https://community.n8n.io/t/after-upgrading-n8n-self-hosted-to-v2-x-queue-mode-reliability-much-worse/247235?tl=es) e [sobre a aprovação humana](https://community.n8n.io/t/hitl-on-latest-2-10-4/274050).

A recomendação é rebaixar o n8n, não substituí-lo já. Ele passa a ser um executor sem estado atrás de `execute(capability, input, idempotency_key)`. Devolve um identificador da execução, grava a chave no artefato externo e nunca é o registro oficial de execuções ou aprovações. O mercado de aprovação humana hospedada também é instável: a HumanLayer abriu o código em 23 de outubro e foi comprada pela Factory em 4 de novembro ([The New Stack](https://thenewstack.io/?p=22842922)). Isso reforça manter a caixa de aprovações no próprio Supabase, com WhatsApp ou e-mail servindo só de transporte.

Esses padrões explicam cada sintoma do Jair OS:

| Sintoma no sistema vivo | Diagnóstico | Correção |
|---|---|---|
| "Resultado externo confirmado, mas recibo do executor ausente; job bloqueado" | O recibo virou critério de sucesso | Sucesso passa a ser a pós-condição verificada. O recibo é só uma evidência. Com releitura positiva, marcar `VERIFIED_BY_READBACK` e gerar o recibo a partir dela |
| "Não verificado, releitura externa exigida" | A releitura não é um passo obrigatório e durável | Passo `verify` com novas tentativas espaçadas e temporizador durável. Vencido o prazo, o estado vira `UNKNOWN_OUTCOME` e vai para a caixa humana com as evidências |
| Execuções paradas sem progresso | Falta um lease com prazo | `lease_expires_at` renovado a cada heartbeat; varredor que reclassifica o job em vez de devolvê-lo à fila às cegas |
| Dispositivos perdendo heartbeat | Energia do sistema operacional e worker sem supervisor | Política de energia, serviço supervisionado e dispositivo que busca jobs com lease (ver seção seguinte) |
| Host do n8n offline | Não há disjuntor | Disjuntor por executor; trabalho estacionado em `waiting_executor`; teste periódico de recuperação via pg_cron |
| ~20 alertas abertos, incluindo divergência de integridade | Um alerta por execução | SLOs com alerta por taxa de consumo do orçamento de erro (ver seção de AgentOps) |

O protocolo de efeito tem cinco passos duráveis:

1. **`plan_effect`.** Na mesma transação do checkpoint, grava a intenção com uma chave idempotente, a pós-condição esperada e o método de releitura. A chave vem de workflow + passo + entidade de negócio, nunca do ID da mensagem na fila, que muda quando a mensagem é reprocessada.
2. **`dispatch`.** Chama o executor passando a chave.
3. **`collect_evidence`.** Aceita o recibo se ele chegar, sem exigi-lo.
4. **`verify`.** Faz a releitura determinística.
5. **`commit`.** Só então fecha a execução e registra uma ação de compensação para efeitos de risco R2 e R3.

As novas tentativas passam a ser classificadas por tipo de erro:

- erros transitórios e de limite de requisições: repetir com espera crescente entre as tentativas;
- erros de autenticação: abrir o disjuntor e alertar;
- erros de validação: mandar para a fila de mensagens mortas e para um humano;
- dispositivo offline: estacionar o trabalho;
- **timeout depois do envio**, o caso crítico: nunca repetir; o caso vai para verificação e conciliação ([Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)).

A Temporal lembra por que os prazos são obrigatórios: o servidor "doesn't detect failures when a Worker loses communication" e depende do timeout para forçar outra tentativa ([Temporal docs](https://docs.temporal.io/encyclopedia/detecting-activity-failures)).

Sobre multiagentes, a Cognition revisou em abril sua posição de 2025. Agentes extras funcionam quando acrescentam inteligência — revisão, consulta, planejamento — "while writes stay single-threaded". O revisor de código deles encontra cerca de 2 bugs por PR quando não compartilha contexto com o autor. Enxames de agentes escrevendo em paralelo falham ([Cognition](https://cognition.com/blog/multi-agents-working)). Isso valida o desenho atual do Jair OS: um roteador e, por padrão, um único especialista. E define o papel dos avaliadores: só leitura, contexto limpo e nunca o único verificador de um efeito externo.

## As 57 notas falharam por aritmética, não por falta de inteligência

O OSWorld-Verified, a referência de uso de computador, está saturado. Humanos completam 72,36% das tarefas, e os melhores agentes do ranking oficial vão de 83% a 90% ([OSWorld](http://osworld-v1.xlang.ai/); [Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)). O OSWorld 2.0, de junho, mudou a escala. As tarefas têm em média mais de 250 passos e levam mais de uma hora a humanos experientes. Nelas, o Claude Opus 4.8 concluiu por inteiro **20,6%** e somou **54,8%** de crédito parcial ([OSWorld 2.0](https://osworld-v2.xlang.ai/)). Na versão 2.1, no mesmo teste, o Opus 5 ficou em 44,33% no critério binário e em 77,67% no parcial ([Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)). O Opus 5.5 foi anunciado com 81,8% no parcial ([Anthropic](https://www.anthropic.com/news/claude-opus-5-5)); no critério estrito, teria 48,7% ([LLM Stats](https://llm-stats.com/blog/research/claude-opus-5-5-launch)). Os fornecedores divulgam o número parcial, e esses rankings são compilações de segunda mão, mas a conclusão se sustenta.

Lançar 57 notas e relê-las exige algo entre 150 e 250 ações. Com 99% de acerto por ação, a chance de 171 ações darem todas certo é 0,99^171 ≈ **18%**; com 99,9% de acerto, é ≈ 84%. Dividir o trabalho em unidades por linha, verificando cada linha, rende mais do que trocar de modelo. A própria documentação da Anthropic admite que "Claude sometimes acts as if steps succeeded without checking". Ela recomenda:

- tirar screenshot depois de cada passo e descrever o resultado em uma frase;
- terminar cada lote com um screenshot;
- parar no primeiro erro de um lote;
- fazer uma verificação de ponta a ponta no início da sessão ([docs de computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)).

Quem automatiza sistemas web em produção chegou a uma escada de opções, da mais determinística para a menos:

1. API oficial;
2. endpoints XHR internos do próprio site, capturados e reexecutados por script;
3. automação roteirizada pelo DOM e pela árvore de acessibilidade;
4. ações no DOM assistidas por LLM;
5. visão por pixels, como último recurso.

Paul Klein IV, CEO da Browserbase, defendeu no AI Engineer World's Fair 2026 inspecionar as requisições de rede e pôr um agente de código para escrever scripts que as reproduzam ([AI Engineer](https://www.ai.engineer/talks/GqoNrUz8hEU-bringing-agents-onto-world-wide-web)). Até a Browser Use, que vende agentes de navegador, recomenda Playwright roteirizado ou Stagehand para fluxos fixos ([Browser Use](https://browser-use.com/best-web-agents)).

A ideia de "explorar uma vez com LLM e depois repetir de forma determinística" já vem pronta nas ferramentas. Com `cacheDir`, o Stagehand v3 leva 20–30 segundos e gasta cerca de 50 mil tokens na primeira execução; nas repetições, leva 2–3 segundos e não gasta tokens ([Stagehand](https://docs.stagehand.dev/v3/best-practices/deterministic-agent)). O cache de código do Skyvern reexecuta o código gerado e só volta ao agente se a página mudar ([Skyvern](https://skyvern.com/docs/developers/features/code-caching)).

Para lançamentos escolares que se repetem a cada bimestre, isso se traduz em "flow packs" por ERP: um script Playwright versionado que localiza os campos pelo papel e pelo rótulo. Ele escreve pela interface, para preservar as validações e o registro de auditoria do próprio ERP. A releitura é feita por um canal diferente do que escreveu: um GET/XHR interno com a mesma sessão, a página recarregada ou a exportação oficial do mapa de notas. Só a resposta do servidor ou a página recarregada podem dar o status "verificado". Um screenshot ampliado lido pelo modelo continua como "não verificado", porque juízes baseados em screenshot deixam passar alucinações ([Browser Use](https://browser-use.com/posts/online-mind2web-benchmark)).

O lançamento das notas ditadas deve ser refeito em fases.

1. **Pré-checagem, só leitura.** O agente abre a turma e puxa a lista oficial com número de chamada e os valores já lançados. Se turma, avaliação ou bimestre não baterem, ele para.
2. **Casamento de nomes.** Os nomes ditados são normalizados: tira acentos, passa para minúsculas, remove partículas como "de/da/do/das/dos" e corrige confusões comuns de transcrição, como "Luís/Luiz". Depois recebem uma nota de semelhança por Jaro-Winkler e por comparação de palavras, como faz o RapidFuzz ([RapidFuzz](https://ftp.fau.de/cran/web/packages/RapidFuzz/readme/README.html)). Um artigo do STIL 2026 mostra ganho ao combinar similaridade semântica com Jaro-Winkler ([ACL Anthology](https://aclanthology.org/2026.stil-1.45.pdf)). O casamento só é aceito automaticamente quando a melhor nota passa de um limiar e supera a segunda por uma margem. Esse limiar tem de ser calibrado em listas reais, porque as fontes não dão um número universal.
3. **Confirmação.** O professor confirma tudo numa **única tabela** — nome ditado → aluno, número de chamada, nota de semelhança, nota lançada — em vez de responder 57 perguntas. Ditar pelo número de chamada faz o nome servir só de conferência.
4. **Plano.** O sistema calcula o que muda. Sobrescrever uma nota já existente exige aprovação explícita.
5. **Escrita e releitura.** A escrita acontece em blocos de cerca de dez linhas, cada um confirmado pelo servidor. Depois, a releitura independente compara linha por linha.
6. **Registro.** Cada linha recebe um status: `verified`, `mismatch`, `not_written` ou `unverified`. A chave idempotente é aluno × avaliação × valor, então só as linhas que falharam são repetidas. O trace do Playwright e o arquivo exportado viram evidência.

Assim, "não verificado, releitura externa exigida" deixa de ser um estado final e vira um passo automático e auditável.

A perda de heartbeat em PCs de casa e de escola vem quase sempre do gerenciamento de energia do sistema operacional. O modo unattended do Tailscale, que só existe no Windows, mantém o dispositivo acessível sem usuário logado, desde que o serviço esteja em Automático ([Tailscale](https://tailscale.com/kb/1088/run-unattended)). Usuários relatam, porém, que por padrão o Windows entra em suspensão e o acesso só volta com alguém mexendo na máquina ([fórum Tailscale](https://forum.tailscale.com/t/tailscale-doesnt-connect-until-someone-logs-into-windows/2624)).

A correção tem três partes:

- **Política de energia.** No Windows: `powercfg /change standby-timeout-ac 0`, `powercfg /hibernate off` e conferir o Modern Standby com `powercfg /a` ([Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options)). No Mac: `pmset -a sleep 0 autorestart 1 womp 1` ([SS64](https://ss64.com/mac/pmset.html)).
- **Worker supervisionado.** O worker roda como serviço com reinício automático e sessão gráfica logada.
- **Leases na fila.** Jobs de um worker que morreu voltam à fila em vez de ficarem pela metade.

Cada ERP ganha um perfil de navegador próprio. O `storageState`, onde ficam os dados da sessão logada, é tratado como segredo e nunca vai para o controle de versão ([Playwright](https://playwright.dev/docs/auth)). 2FA e CAPTCHA viram pontos de checagem humana. E um job nunca é dividido entre dois dispositivos no meio de um lote.

Navegadores de consumo com agente embutido devem ficar longe das escritas em ERP. Um estudo da Universidade de Washington, de junho de 2026, encontrou formas de burlar a política de mesma origem em **quatro de sete** desses navegadores, entre eles Claude for Chrome, Chrome com Gemini, ChatGPT Atlas e Comet. O estudo também achou envenenamento de memória entre sites diferentes ([UW News](https://www.washington.edu/news/2026/06/30/some-agentic-ai-browsers-come-with-major-cybersecurity-risks-uw-study-finds/)). Nos testes de injeção de prompt contra agentes de computador, o VPI-Bench registrou taxas de sucesso de até 51%, e de 100% em alguns agentes de navegador ([arXiv 2506.02456](https://arxiv.org/html/2506.02456v2)). Já um preprint de Berkeley obteve 0 sucessos em 140 tentativas contra o Claude Sonnet 4.6 e o GPT-5.4 navegando ([alphaXiv](https://www.alphaxiv.org/abs/2606.05233.md)).

A defesa sólida está no desenho do sistema:

- um perfil que só visita os domínios do ERP;
- nenhuma navegação misturada no mesmo contexto;
- credenciais preenchidas pelo script e nunca mostradas ao modelo;
- confirmação humana, com a lista do que muda, para ações oficiais e irreversíveis, como fechar diário ou bimestre.

Quando for preciso recorrer à visão, o padrão é o Claude Sonnet ou Opus 5.5 com `computer_toolset_20260801`, zoom ligado e resolução de 1280×800. Cada screenshot custa de 1.000 a 1.800 tokens, e a definição do toolset, cerca de 4.500 ([docs de computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)). O protocolo `safety_decision`/`require_confirmation` do Gemini é um bom modelo de confirmação, mesmo sem usar o Gemini ([Gemini docs](https://aistudio.google.com/docs/computer-use)).

## O MCP ficou sem estado e a segurança virou arquitetura

A revisão **2026-07-28** do MCP, publicada em 28 de julho, quebra a compatibilidade com as anteriores ([changelog MCP](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). As mudanças centrais:

- acaba o handshake `initialize` e o cabeçalho `Mcp-Session-Id`;
- cada requisição passa a carregar versão e capacidades em `_meta`;
- `server/discover` passa a ser obrigatório;
- as requisições que partiam do servidor (elicitação, sampling, roots) viram requisições de várias idas e voltas, com `resultType: "input_required"`;
- Tasks sai do núcleo do protocolo e vira uma extensão oficial;
- Roots, Sampling, Logging e o registro dinâmico de clientes (DCR, substituído por Client ID Metadata Documents) foram descontinuados, com prazo mínimo de 12 meses para migrar;
- os servidores devem devolver `tools/list` sempre na mesma ordem, o que aumenta o aproveitamento do cache;
- o `traceparent` do OpenTelemetry passa a viajar em `_meta`.

O modelo sem estado combina com as Supabase Edge Functions, que já não guardam estado entre chamadas. E o padrão de identificadores que o servidor do Jair OS já usa (`desktop` → `desktop_resultado`) é exatamente o que a especificação manda. A migração exige:

- implementar `server/discover`;
- ler `_meta` em toda requisição;
- validar os cabeçalhos `Mcp-Method`/`Mcp-Name`;
- devolver `ttlMs` e `cacheScope` nas listas;
- trocar o código de erro -32002 por -32602;
- manter suporte à revisão 2025-11-25 durante o prazo de migração.

Nenhuma fonte confirmou quais dessas peças o cliente de conectores do Claude.ai já suporta. Isso precisa ser conferido na tabela de compatibilidade de clientes antes de fechar prazos.

As extensões oficiais mostram o que vem a seguir. Estão estáveis o **MCP Apps** (interfaces HTML isoladas dentro do chat) e o Enterprise-Managed Authorization. Estão em beta Tasks, **Skills over MCP**, Server Cards e **Events** ([extensões MCP](https://modelcontextprotocol.io/docs/extensions/overview)). O protocolo é governado pela Agentic AI Foundation, da Linux Foundation, que passou de 300 membros em 22 de outubro ([Linux Foundation](https://www.linuxfoundation.org/press/agentic-ai-foundation-surpasses-300-members-in-less-than-one-year)). No mesmo dia, a Anthropic doou à fundação o formato **Agent Skills**: uma pasta com `SKILL.md`, scripts e referências, carregada aos poucos, só quando necessária. O formato já é suportado por mais de 70 plataformas, com cerca de 1 milhão de skills publicadas e 280 milhões de instalações ([Anthropic](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation)). A extensão Skills over MCP distribui skills com um hash SHA-256 de cada arquivo. Qualquer mudança no hash revoga a aprovação dada pelo usuário, o que protege diretamente contra skills alteradas depois de aprovadas ([MCP Skills](https://modelcontextprotocol.io/extensions/skills/overview)).

Para os 81 workflows e os 72 contratos, o caminho é:

- manter cerca de 20 ferramentas-verbo estáveis (`executar`, `rotear`, `buscar_*`, `desktop`);
- expor o catálogo pelas ferramentas de descoberta que já existem;
- agrupar os workflows em 10 a 20 skills por família de capacidade (publicação no Classroom, correção, material de Física, rotinas de ERP), com os contratos em formato legível por máquina dentro de cada skill.

O **A2A**, protocolo de comunicação entre agentes, chegou à v1.0 em março, com Agent Cards assinados e apoio de mais de 150 organizações ([AAIF](https://aaif.io/blog/a2a-joins-aaif)). Ele serve para agentes independentes, de donos diferentes, conversarem entre si. Num sistema de dono único, vale copiar duas coisas dele: a máquina de estados de tarefa (submitted, working, input-required, auth-required, completed, failed, canceled, rejected) e o formato do Agent Card, para os contratos. Não vale adotá-lo como canal interno de comunicação.

O Jair OS reúne os três elementos da "tríade letal" de Simon Willison:

- dados privados: notas e dados de menores;
- conteúdo não confiável: Gmail, WhatsApp, comentários do Classroom, trabalhos de alunos;
- comunicação externa: WhatsApp, e-mail, publicações, automação de ERP.

A única defesa confiável é não juntar os três num mesmo contexto ([Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)). A "Rule of Two" da Meta formaliza isso: sem supervisão humana, cada sessão pode ter no máximo duas das três propriedades ([Meta AI](https://ai.meta.com/blog/practical-ai-agent-security/)). O OWASP Top 10 para Aplicações Agênticas 2026 lista, entre outros riscos, o sequestro do objetivo do agente, o mau uso de ferramentas, a cadeia de suprimentos, o envenenamento de memória e a exploração da confiança entre humano e agente — "confident, polished explanations lead human operators to approve harmful actions" ([OWASP GenAI](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/)).

Os incidentes de 2026 vieram sobretudo da cadeia de suprimentos e da execução local. Em abril, a OX Security mostrou que, nos SDKs oficiais, a configuração STDIO é uma linha de comando. Isso deixava mais de 7.000 servidores, com mais de 150 milhões de downloads, abertos a execução remota de código, e a Anthropic chamou o comportamento de "expected" ([The Hacker News](https://thehackernews.com/2026/04/anthropic-mcp-design-vulnerability.html)). Em agosto, a campanha Deadbugz abriu 23 pull requests em 74 minutos para inserir um servidor MCP malicioso. As instruções escondidas nos metadados dele só eram ativadas depois da revisão ([Pillar Security](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign)).

A falha mais concreta do Jair OS é o parâmetro `confirmar=true` na publicação do Classroom: um modelo manipulado por injeção de prompt consegue preenchê-lo. A correção é um fluxo em duas fases:

1. A chamada de alto risco devolve uma ação pendente com o hash do conteúdo exato a ser enviado.
2. A execução exige um token de uso único, emitido por um canal humano onde o LLM não escreve: um botão do MCP Apps ligado a um código de uso único, ou um link de aprovação no WhatsApp ou no portal. Antes de executar, o servidor compara os hashes.

Também entram na correção listas de turmas e destinatários permitidos, limites por hora e o bloqueio de URLs e anexos que o próprio sistema não gerou.

O restante da defesa:

- agentes que leem conteúdo não confiável não recebem ferramentas de envio;
- agentes de desktop só aceitam tipos de job nomeados, com esquema definido, e nunca comandos livres de terminal;
- esses agentes rodam numa conta sem privilégio de administrador e nunca escrevem configuração de cliente MCP;
- os trechos do pgvector recebem uma etiqueta de origem, e conteúdo de origem não confiável não entra em contexto que tenha capacidade de envio;
- no servidor, o padrão documentado pelo Supabase para MCP em Edge Functions substitui o uso da chave de serviço dentro das funções. Ele combina descoberta OAuth do recurso protegido, verificação do JWT a cada requisição e um cliente de banco limitado pelas regras de RLS do usuário ([Supabase](https://supabase.com/ui/docs/headless/mcp)).

## Memória e RAG: métricas perfeitas denunciam um teste fácil demais

O texto "The components of agent memory", da Anthropic, de 6 de novembro, descreve quatro camadas de memória:

- transcrições pesquisáveis;
- notas de memória com fatos verificados;
- representações no estilo wiki;
- um contexto pequeno, injetado em toda sessão.

Nos testes, wiki e busca juntos acertaram **61%**, contra 53% só com busca e 48% só com wiki ([Anthropic](https://anthropic.com/research/components-of-agent-memory)). O Jair OS já tem as quatro camadas: linhas de memória no Supabase, o cofre Obsidian e o `jair_os_contexto`. O que falta é consolidar.

O processo de "dreaming" é uma revisão offline que corrige notas erradas, liga páginas e promove fatos estáveis. Ele elevou a taxa de acerto usando só a wiki de 13% para 48% em 128 sessões. Quando vários agentes escreviam numa tabela compartilhada, **16 de 57** fatos de contrato se perderam. Com um agente por página citando o texto literal, nenhum se perdeu. E mandar o modelo "registrar só falhas" reduziu os ganhos de memória ([Anthropic](https://anthropic.com/research/components-of-agent-memory)).

Na prática, isso leva a três mudanças:

- um job noturno que elimina duplicatas, marca contradições como superadas e promove fatos para um perfil injetado de até ~200 linhas, o mesmo limite que o Claude Code usa no `MEMORY.md`;
- um único agente escritor por área da memória;
- colunas novas: tipo de memória, validade com duas datas no estilo Zep (`valid_from`, `valid_to`, `recorded_at`) ([arXiv 2501.13956](https://arxiv.org/abs/2501.13956)), `superseded_by`, `verified_how` e contagem de acessos.

O Mem0 de 2026 trocou o banco de grafo por ligação entre entidades e combina similaridade semântica, BM25 e correspondência de entidade. Os placares que divulga — 92,5 no LoCoMo e 94,4 no LongMemEval — são do próprio Mem0 e ninguém os reproduziu ([Mem0](https://mem0.ai/blog/state-of-ai-agent-memory-2026)). A ideia de uma tabela `entities` no Postgres vale mais que os números.

O achado de RAG que mais pede ação diz respeito à busca híbrida no Postgres. O `ts_rank` pontua por frequência e proximidade dos termos, sem o peso do IDF, que considera quão raro é cada termo no conjunto de documentos. Os testes publicados mostram o efeito:

- no SciFact, o `ts_rank` teve nDCG@10 de **0,07**, contra 0,69 do BM25 de verdade e 0,66 do pgvector ([hybrid-search](https://github.com/daen8584-spec/hybrid-search));
- em outro teste, combinar `ts_rank_cd` com busca vetorial deu 0,594, **abaixo** dos 0,703 da busca vetorial sozinha; com BM25 de verdade, a combinação subiu para 0,727–0,735 ([zeybek.dev](https://zeybek.dev/blog/hybrid-search-in-postgres-measured)).

Se a busca híbrida do Jair OS segue o full-text padrão do Postgres, ela está piorando o resultado em vez de melhorá-lo. O `pg_textsearch` v1.0 traz BM25 com licença PostgreSQL ([PostgreSQL news](https://www.postgresql.org/about/news/pg_textsearch-v10-3264)), mas não foi confirmado que ele esteja disponível no Supabase gerenciado. O ParadeDB só entra como instância separada, alimentada por replicação ([Supabase partners](https://supabase.com/partners/integrations/paradedb)). Sem eles, dá para calcular o BM25 em SQL com `ts_stat`, usando a configuração `portuguese` e o `unaccent`.

Para embeddings, a referência é o MTEB-BR, de julho de 2026, com 22 tarefas escritas originalmente em português do Brasil. O placar multilíngue explica só cerca de **57%** da variação no desempenho em português. Os seis primeiros colocados empatam estatisticamente; o gemini-embedding-001 lidera o geral com 0,682. O voyage-context-4 lidera em recuperação, com 0,714. O voyage-3.5-lite, a US$0,02 por milhão de tokens, é a opção mais barata com bom desempenho ([arXiv 2607.04581](https://arxiv.org/html/2607.04581v2)). O voyage-4 vem com 200 milhões de tokens grátis, mais que suficientes para o acervo de um professor ([Voyage pricing](https://docs.voyageai.com/pricing)).

Três outras conclusões sobre RAG:

- **GraphRAG não compensa.** Num benchmark, o LightRAG consumiu cerca de 100 mil tokens por pergunta e o GraphRAG global, 331 mil, contra 879 do RAG vetorial ([beri.net](https://www.beri.net/article/graphrag-vs-vector-rag-indexing-query-cost-lightrag-lazygraphrag-2026)).
- **Busca exata tem lugar.** Um estudo de maio mostrou que o grep supera a busca vetorial quando os resultados voltam direto no contexto, mas que o harness muda tudo ([arXiv 2605.15184](https://arxiv.org/abs/2605.15184)). Isso justifica uma ferramenta `search_exact`, ao lado da busca semântica, para fórmulas, códigos de prova e IDs.
- **O teste atual é fácil demais.** MRR de 0,956 e groundedness de 1,00 indicam um conjunto de teste fácil ou um juiz condescendente. O próximo conjunto deve trazer perguntas coloquiais reescritas de outro jeito, erros de digitação, consultas só com fórmula, fatos que mudaram e perguntas sem resposta. O juiz deve ser de outra família de modelos e calibrado com 50 a 100 rótulos feitos à mão.

No banco de questões, modelos pequenos e especializados lideram a extração de documentos. O PaddleOCR-VL-1.6, com 0,9 bilhão de parâmetros, marca **96,34** no OmniDocBench v1.6, à frente dos 89,78 do Qwen3-VL-235B ([Roboflow](https://roboflow.com/blog/best-open-source-ocr-models)). Duas outras opções:

- o **Mistral OCR 4**, de junho, devolve a posição de cada bloco na página e reconhece equações, por US$4 a cada mil páginas, ou US$2 em lote ([Mistral](https://mistral.ai/news/ocr-4)); a Mistral recomenda a versão 4.1 para integrações novas ([Mistral docs](https://docs.mistral.ai/models/model-cards/ocr-4-0));
- o **Chandra 2** declara 95,2% de acerto em português, num benchmark do próprio fornecedor, e tem licença livre para quem fatura menos de US$2 milhões ([Hugging Face](https://huggingface.co/datalab-to/chandra-ocr-2)).

A própria Mistral alerta que esses benchmarks contam LaTeX equivalente como erro, então diferenças de 1 ou 2 pontos não decidem nada. Nenhuma ferramenta sabe, sozinha, onde começa e termina cada questão. Isso continua exigindo regras para os enumeradores em português ("Questão 12", "(A)…(E)"), reconstrução das colunas e uma checagem por modelo de visão de que o recorte está completo, como fez o EuraGovExam ([arXiv 2603.27223](https://arxiv.org/pdf/2603.27223)).

O pipeline sugerido:

1. Triagem do PDF com PyMuPDF.
2. Análise de layout, com a posição de cada bloco.
3. Separação das questões.
4. Recorte fiel a partir do PDF original, em 200–300 dpi.
5. Transcrição em Markdown com LaTeX.
6. Nova renderização e comparação visual com o recorte.
7. Checagem simbólica das fórmulas com SymPy.

Cada questão guarda o hash do PDF, a página e a posição. No preço em lote, **5.000 páginas custam cerca de US$10**.

Na geração de questões, o consenso de 2026 é checar primeiro com um verificador simbólico e usar um juiz LLM só no que ele não consegue decidir, lembrando que o `simplify` pode rejeitar expressões equivalentes ([arXiv 2607.06820](https://arxiv.org/pdf/2607.06820)). Figuras de Física devem ser geradas por código (TikZ, Manim, matplotlib), com os mesmos parâmetros do enunciado. O Typst 0.15.1 é uma opção rápida para gerar páginas A4 ([Wikipedia](https://en.wikipedia.org/wiki/Typst)).

## Certificar agentes pelo limite inferior de confiança, não pela média

As convenções do OpenTelemetry para IA generativa, que incluem registros de agentes e de MCP, ganharam um repositório próprio e ainda não têm versão estável ([OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/gen-ai/); [GitHub](https://github.com/open-telemetry/semantic-conventions-genai)). O mercado de observabilidade se concentrou: a ClickHouse comprou o Langfuse em janeiro, mantendo o núcleo em licença MIT ([Langfuse](https://langfuse.com/blog/joining-clickhouse)), e a OpenAI comprou o Promptfoo em março ([OpenAI](https://openai.com/index/openai-to-acquire-promptfoo/)). Hospedado por conta própria, o Langfuse exige ClickHouse, Redis e armazenamento S3, além do Postgres ([Langfuse self-hosting](https://langfuse.com/docs/self-hosting)). O plano gratuito na nuvem dá 50 mil unidades por mês e 30 dias de acesso aos dados, e roda nos EUA, na Europa ou no Japão — não há região no Brasil ([Langfuse pricing](https://langfuse.com/pricing)). O Arize Phoenix é a opção leve, gratuita para hospedar por conta própria ([Phoenix](https://arize.com/docs/phoenix/self-hosting)).

Para quem opera sozinho com dados de menores, o registro oficial deve ficar no Supabase, numa tabela de spans (cada passo de execução) com os nomes de atributo do OpenTelemetry. Ela guarda:

- `gen_ai.operation.name` e o modelo usado;
- tokens com e sem cache e `cost_usd`;
- `mcp.method.name`;
- contrato e versão;
- `pii_redacted`.

Alimentam a tabela o servidor MCP, as Edge Functions, o n8n e os dispositivos, com o `traceparent` passado adiante em cada etapa. Uma interface externa para anotar e avaliar só recebe registros já pseudonimizados.

O guia "Demystifying evals for AI agents", da Anthropic, de 9 de janeiro, virou referência. Ele recomenda:

- começar com 20 a 50 tarefas tiradas de falhas reais;
- preferir avaliadores em código;
- usar juízes LLM só para nuances, calibrados contra avaliação humana;
- avaliar o resultado, não o caminho;
- isolar cada tentativa;
- separar evals de capacidade, que começam com acerto baixo e servem para melhorar, de evals de regressão, que ficam perto de 100% e servem para bloquear deploys ([Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

Hamel Husain revisou em 30 de setembro a ferramenta de evals automáticos da Anthropic e insistiu em dois pontos: analisar os erros antes de escrever qualquer eval, e ter um avaliador por tipo de erro ([Hamel Husain](https://hamel.dev/blog/posts/claude-auto-evals/)). Os juízes LLM têm vieses documentados: suas notas de verbosidade acompanharam o tamanho da resposta com correlação de 0,87, contra 0,44 entre avaliadores humanos ([arXiv 2606.09843](https://arxiv.org/pdf/2606.09843)). O monitor de confiabilidade de Princeton (HAL) concluiu que a confiabilidade melhora bem mais devagar que a acurácia. Também encontrou, em todos os modelos, uma distância "substancial" entre pass@k (acertar ao menos uma vez em k tentativas) e pass^k (acertar todas) ([HAL](https://hal.cs.princeton.edu/reliability)). O τ²-bench passou a contar erros de infraestrutura como falhas ([tau2-bench](https://raw.githubusercontent.com/sierra-research/tau2-bench/main/RELEASE_NOTES.md)). Vistos assim, os "72 de 72 contratos aprovados" são uma métrica de regressão saturada, não uma prova de capacidade.

A certificação empírica do P1 deve usar pass^k — a chance de todas as k tentativas darem certo — com intervalo de confiança, e promover um agente pelo **limite inferior** desse intervalo. A tabela mostra por que uma média alta engana:

| Acerto por tentativa (p) | pass^1 | pass^3 | pass^5 | pass^8 |
|---|---|---|---|---|
| 0,80 | 0,80 | 0,51 | 0,33 | 0,17 |
| 0,90 | 0,90 | 0,73 | 0,59 | 0,43 |
| 0,95 | 0,95 | 0,86 | 0,77 | 0,66 |
| 0,99 | 0,99 | 0,97 | 0,95 | 0,92 |

Sem nenhuma falha, o limite inferior de 95% de confiança só passa de 0,90 depois de **29** execuções limpas seguidas pelo método exato de Clopper-Pearson unilateral, ou 35 pelo de Wilson. Para passar de 0,95, são precisas **59** ou 73. Com 50 sucessos em 50, o intervalo de Wilson é [0,929; 1,000]. Esses números são cálculos deste relatório; a definição de pass^k segue a da Anthropic ([Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). A unidade certificada é a combinação de contrato, versão, modelo, hash do prompt e hash do conjunto de ferramentas; qualquer mudança zera a evidência acumulada.

| Nível | Requisito | Supervisão |
|---|---|---|
| L0 Rascunho | Contrato aprovado | Tudo revisado |
| L1 Supervisionado | ≥30 execuções verificadas, limite inferior ≥0,80, nenhuma violação crítica | Toda saída revisada |
| L2 Amostrado | ≥60 execuções, limite inferior ≥0,90, pass^5 ≥0,8 na suíte de regressão | 10–20% sorteados + todas as ações de alto risco |
| L3 Autônomo dentro do nível | ≥100 execuções, limite inferior ≥0,95, pass^5 ≥0,9, nenhuma violação | Só agentes de baixo risco. Nunca para efeito externo nem para julgamento avaliativo sobre aluno |

Como a maioria dos 72 contratos roda pouco, a evidência deve vir da suíte offline, com repetições. Em produção, ela deve se concentrar nos ~10 agentes mais usados. "Evidência insuficiente" deve ser um estado à parte, distinto de "aprovado".

O custo não é obstáculo. Uma rodada da suíte com 50 tarefas × 5 tentativas e um juiz de 5 mil tokens custa cerca de **US$0,19** no Haiku 5.5 e US$3,75 no Sonnet 5.5, ou US$1,88 em lote. Uma execução típica de agente, com 30 mil tokens de entrada e 3 mil de saída, custa ≈US$0,0045 no Haiku, ≈US$0,09 no Sonnet e ≈US$0,18 no Opus ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)).

Os ~20 alertas abertos devem virar poucos SLOs (objetivos de nível de serviço), com alerta disparado pela velocidade com que o orçamento de erro está sendo consumido. Essa é a prática que a Grafana e o pacote agent-sre do kit de governança da Microsoft adotaram em 2026 ([Grafana](https://grafana.com/blog/what-if-your-agent-s-hallucinations-had-a-budget-how-to-start-using-slos-for-agent-behavior); [Microsoft](https://microsoft.github.io/agent-governance-toolkit/packages/agent-sre/)). Os SLOs sugeridos:

- sucesso verificado por workflow, com 95% como ponto de partida;
- execuções verificadas em até N minutos;
- workflows sem atraso;
- integridade entre o hash do contrato e a versão em produção, em 100%;
- nenhuma violação crítica;
- custo dentro do orçamento.

Uma regressão do modelo pode derrubar o sucesso das tarefas enquanto a disponibilidade do servidor continua em 100%, por isso as duas medidas precisam ficar separadas ([DEV](https://dev.to/alexcloudstar/ai-agent-reliability-engineering-in-2026-slos-error-budgets-and-failure-modes-that-actually-527m)).

O watchdog que corrige falhas sozinho deve rodar roteiros de correção escritos em código. Cada um tem uma pré-condição, uma ação idempotente, uma consulta de verificação e um jeito de desfazer. As ações permitidas são só reversíveis:

- repetir com espera crescente;
- refazer a releitura;
- liberar uma trava presa;
- voltar à última versão certificada;
- desligar um workflow.

Qualquer efeito externo nunca é corrigido automaticamente além de "pausar e avisar". Autocorreções demais rebaixam a certificação do agente.

Nas proteções, o que mais vale é determinístico:

- **Pseudonimizar** nomes, CPF, telefone e turma antes de qualquer chamada a LLM ou a ferramenta de observabilidade. O Presidio não traz um reconhecedor de CPF confirmado; precisa de um próprio, com checagem do dígito verificador, ou da biblioteca `tarja` ([SBC](https://sol.sbc.org.br/index.php/sbseg_estendido/article/download/44537/44300/); [PyPI tarja](https://pypi.org/project/tarja/)).
- Esquemas estritos de ferramenta (`strict: true`).
- Lista de ferramentas permitidas por nível de risco em cada contrato.
- Os portões científicos e editoriais que já existem, que viram avaliadores em código na suíte de regressão.

## Voz, WhatsApp e modelos locais custam poucos dólares por mês

O "pós-aula por voz" e o ditado de notas não precisam de voz em tempo real. O `gpt-transcribe` custa **US$0,0045 por minuto** e aceita uma lista de palavras-chave de apoio — no caso, a lista da turma ([OpenAI](https://developers.openai.com/api/docs/models/gpt-transcribe.md)). O Gemini 3.5 Transcribe sai por cerca de US$0,003 por minuto ([Gemini pricing](https://aistudio.google.com/docs/pricing)). Um teste de novembro deu empate estatístico entre os cinco melhores serviços, mas usou áudio em inglês. O mesmo teste flagrou o `gpt-4o-transcribe` com 15% de erro por palavra e transcrições cortadas em 6 de 60 gravações ([Stork.AI](https://www.stork.ai/blog/pt/speech-to-text-phone-audio-test-2026.md)). Como não há benchmark independente em português do Brasil com números e nomes, o Jair OS precisa testar 20 áudios reais próprios. O Parakeet v3, opção local rápida no Mac, foi treinado em português europeu ([Hugging Face](https://huggingface.co/FluidInference/parakeet-tdt-0.6b-v3-coreml)).

O pipeline recomendado para o ditado:

1. transcrever com a lista da turma como apoio;
2. extrair os dados em JSON, aceitando só nomes da lista;
3. validar a faixa de notas (0–10; "sete e meio" vira 7,5);
4. ler de volta para o professor ("Entendi: aluno 12, 7,5. Confirma?");
5. só então gravar.

Ditar 110 minutos por mês custa cerca de US$0,50.

Se o professor quiser uma porta de entrada conversacional por voz, o Gemini 3.8 Live cobra cerca de US$0,005 por minuto de áudio de entrada e US$0,018 por minuto de saída ([Gemini pricing](https://aistudio.google.com/docs/pricing)) — uns **US$3 por mês** para 220 minutos. Os agentes da ElevenLabs cobram US$0,08 por minuto ([ElevenLabs](https://elevenlabs.io/fr/pricing/agents)). Pipecat (licença BSD-2) e LiveKit Agents (Apache-2.0) são as bases de código aberto para montar isso ([LiveKit](https://livekit.io/field-guides/guide/livekit-vs-pipecat)). Clonar voz só vale para a do próprio professor, com aviso de que é IA, e nunca para a de alunos. Gravadores que ficam ligados o tempo todo não cabem em sala com menores; a Limitless, que fazia um deles, foi comprada pela Meta ([BetaNews](https://betanews.com/2025/12/08/meta-has-acquired-limitless-a-startup-that-produces-ai-powered-wearables/)).

No WhatsApp, a regra da Meta de janeiro de 2026 contra "AI Providers" mira assistentes de propósito geral. No Brasil, uma medida preventiva do CADE obrigou a Meta a continuar permitindo esses assistentes, mas com cobrança desde 11 de março de 2026: US$0,0625 por mensagem fora de template, segundo o Canaltech ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers); [Canaltech](https://canaltech.com.br/mercado/whatsapp-libera-ia-de-terceiros-novamente-no-brasil-apos-nova-decisao-do-cade/)). Assistentes de um negócio específico, como o concierge de matrículas, nunca foram o alvo da regra. O concierge deve manter um escopo estreito e monitorar se alguma mensagem é classificada como `AI_BOT`.

As regras de preço mudaram ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)):

- desde 1º de outubro de 2026, só as primeiras **1.000 mensagens de serviço por número, por mês**, são gratuitas;
- mensagens utilitárias dentro da janela de atendimento voltaram a ser cobradas; para o Brasil, cada uma custa cerca de 0,68 centavo de dólar;
- órgãos de governo elegíveis ficam isentos até 31 de dezembro de 2027 (`PAID_EXEMPT`);
- contas brasileiras precisam migrar o faturamento para reais até **30 de junho de 2027**; quem não migrar deixa de enviar mensagens em 1º de julho.

Com 900 respostas do concierge e 200 lembretes utilitários por mês, o custo fica em torno de US$1,40.

A política de mensagens exige um caminho para falar com um humano e autorização prévia do contato. Também proíbe pedir números de documento de identidade no chat, então o concierge não deve pedir CPF nem RG ([WhatsApp Business Policy](https://whatsappbusiness.com/policy/)). O Meta Business Agent custa de 4 a 5 centavos de dólar por mensagem, cerca de 30 vezes uma resposta gerada pelo próprio sistema com o Gemini Flash-Lite. Gateways não oficiais, como Z-API e Baileys, admitem o risco de banimento e não servem para um número institucional ([Z-API](https://developer.z-api.io/en/tips/Z-APIvsAPI-OFICIAL.md); [Baileys](https://github.com/WhiskeySockets/Baileys)). A cobrança de aulas particulares pode usar o `order_details` com Pix dinâmico; a conciliação é feita pelo `reference_id` ([Meta Payments API](https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-br)).

O worker local de IA no Mac, hoje parado, ficou mais fácil de reativar:

- o **Gemma 4**, de abril, tem licença Apache 2.0, chamada de função nativa e entrada de áudio nos tamanhos menores; o modelo de 31B marca 88,4 no MMMLU ([Gemma 4](https://gemma.ai/models/gemma-4/model-card/));
- o **Qwen3.6-35B-A3B**, com 3 bilhões de parâmetros ativos por vez, é o agente local mais forte para máquinas com 32 GB ou mais ([InsiderLLM](https://insiderllm.com/guides/best-local-llms-mac-2026/));
- o **Ollama** passou a usar MLX no Apple Silicon, ficou compatível com a API Messages da Anthropic em janeiro e, desde agosto, serve modelos abertos ao Claude Desktop ([Ollama](https://ollama.com/blog));
- a **Apple** lançou um SDK em Python, a ferramenta de linha de comando `fm` no macOS 27 e acesso gratuito ao Private Cloud Compute para desenvolvedores pequenos ([WWDC26](https://developer.apple.com/videos/play/wwdc2026/241/)).

A divisão sensata é mandar para o modelo local tudo o que tem dado bruto de aluno: transcrição de áudio privado, detecção e ocultação de dados pessoais, classificação de mensagens do WhatsApp, extração de notas e casamento com a lista da turma, e embeddings de registros. A nuvem fica com a geração pesada, recebendo dados já pseudonimizados. Cada decisão de roteamento é registrada no Supabase, como prestação de contas exigida pela LGPD. O modelo exato depende da memória RAM do Mac, que as notas não informam.

## Na educação, andaime vence resposta pronta

As evidências de 2025–2026 sobre tutoria por IA mostram que o resultado depende do desenho. Num ensaio randomizado de Física introdutória em Harvard, o tutor usava GPT-4, se apoiava em soluções passo a passo escritas de antemão e tinha a instrução de revelar um passo por vez. Ele superou a aula de aprendizagem ativa com efeito de **0,63 desvio-padrão** por regressão linear e de 0,73 a 1,3 por regressão quantílica ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/)). Os resultados na direção contrária:

- **Turquia.** Alunos de ensino médio que usaram GPT sem restrições se saíram 17% pior que o grupo de controle na prova sem IA ([Wharton](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/)).
- **Universidade de Maryland.** Num ensaio com 2.379 universitários (working paper de outubro), as notas finais caíram 0,37 desvio-padrão e a participação no ambiente virtual caiu 0,90, porque o tutor tomou o lugar de atividades que já existiam ([EdWorkingPapers](https://edworkingpapers.com/ai26-1598)).
- **Eedi/Google.** O ensaio ampliado, com 1.179 alunos, não achou ganho no teste padronizado, apesar do ganho dentro das sessões. Um em cada cinco alunos nunca respondeu ao tutor, e sete afirmações matemáticas falsas chegaram aos alunos ([The 74](https://www.the74million.org/article/five-things-you-should-know-about-new-ai-tutor-study/)).

Um ensaio de julho mostrou ganhos duradouros para quem usou a IA como tutor, e não para quem a usou para escrever no seu lugar ([arXiv 2607.08849](https://arxiv.org/abs/2607.08849)).

Para um professor com cerca de 14 alunos particulares, o modelo com melhor evidência é o **Tutor CoPilot**, em que a IA orienta o tutor humano durante a aula. Ele elevou em 4 pontos percentuais a proporção de alunos que dominam os tópicos, chegando a 9 pontos com tutores menos experientes, a cerca de US$20 por tutor por ano ([arXiv 2410.03017](https://arxiv.org/pdf/2410.03017v2)). Daí saem as regras de desenho:

- apoiar o tutor nos gabaritos comentados do professor;
- dar um passo por vez e exigir uma tentativa do aluno antes de qualquer dica;
- oferecer ajuda quando o aluno pedir, em vez de interromper a cada erro;
- complementar as aulas, não substituí-las;
- medir o sucesso por exercícios de fim de aula e revisões feitas sem IA (por exemplo, sete dias depois), não pela taxa de acerto no chat.

Na correção, modelos de visão já avaliam bem resoluções manuscritas totalmente corretas, mas dar crédito parcial continua difícil. Num estudo do AIED 2026, **87% dos erros** do melhor modelo foram falhas de transcrição ([arXiv 2605.19043](https://arxiv.org/abs/2605.19043); [arXiv 2605.23660](https://arxiv.org/abs/2605.23660)). Os corretores de redação do ENEM vão razoavelmente bem nas competências formais (C1 e C4) e mal nas interpretativas (C2, C3 e C5) ([Texto Livre/UFMG](https://periodicos.ufmg.br/index.php/textolivre/article/view/58426)).

Daí o fluxo de "correção assistida":

1. foto da resolução;
2. transcrição confirmada pelo professor antes de qualquer outro passo;
3. sugestões para cada item da rubrica;
4. reconferência dos números por `jair_os_calcular` ou SymPy;
5. itens de crédito parcial sinalizados para o professor;
6. aprovação item por item, nunca em lote.

Cada erro confirmado vira uma etiqueta de concepção equivocada. A etiqueta gera variações da mesma questão, com resposta verificada, e revisões espaçadas no portal um, três, sete e 21 dias depois. Os endpoints de Student Groups do Classroom, disponíveis para todos desde 4 de fevereiro, permitem postar tarefas diferentes para cada grupo ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/02/student-group-endpoints-google-classroom-api.html)).

Entre os grandes fornecedores, só o Google tem uma oferta educacional gratuita relevante no Brasil:

- o Gemini no Classroom ficou gratuito para todos os educadores do Workspace for Education em abril ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/04/gemini-in-google-classroom-is-now-available-in-all-Classroom-supported-languages.html)), embora o app do Classroom dentro do Gemini não lance notas ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/06/classroom-app-in-gemini.html?hl=en_GB));
- um servidor MCP do Classroom foi anunciado na ISTE para "os próximos meses", sem lançamento confirmado ([Google](https://blog.google/products-and-platforms/products/education/iste-2026-educator-updates/)); quando sair, pode aposentar parte do código próprio de publicação e reduzir os problemas de OAuth;
- simulados do ENEM no Gemini foram anunciados no Google for Brasil, em 10 de junho ([Google Blog BR](https://blog.google/intl/pt-br/novidades/tecnologia/google-for-brasil-2026/));
- estudantes fora dos EUA têm **um ano grátis do Google AI Plus até o fim de 2026** ([Digital Trends](https://www.digitaltrends.com/computing/gemini-notebooks-latest-update-makes-it-a-better-study-companion/)).

O Claude for Teachers e o ChatGPT for Teachers são só para professores dos EUA ([OpenAI Help](https://help.openai.com/pt-br/articles/12844995-chatgpt-para-professores)). Ainda assim, o primeiro traz um padrão que vale copiar dentro do Jair OS: uma revisão diária, agendada, dos exercícios de fim de aula sem identificação dos alunos ([Anthropic](https://www.anthropic.com/news/claude-for-teachers)).

Na criação de conteúdo, o cenário de 2026:

- **Sora.** A OpenAI anunciou o fim do Sora em 24 de março ([Axios](https://www.axios.com/2026/03/24/openai-discontinue-sora-video-app)).
- **Gemini Omni.** Passou a gerar vídeo de graça no YouTube Shorts e no YouTube Create ([TechCrunch](https://techcrunch.com/2026/05/19/googles-gemini-omni-turns-images-audio-and-text-into-video-and-thats-just-the-start/)).
- **Dublagem automática.** Com fala expressiva em português e espanhol, abriu para todos os canais em fevereiro ([YouTube Blog](https://blog.youtube/news-and-events/youtube-auto-dubbing-expressive-speech/)).
- **Regra antitemplate.** Em 16 de julho, o YouTube esclareceu que conteúdo genérico, repetitivo ou feito a partir de template perde a monetização, com ou sem IA. Isso inclui tutoriais que repetem material comum ([TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)).

A regra antitemplate faz do rosto, da voz e dos problemas autorais do professor a principal vantagem competitiva. E exige uma "trava de variação" em qualquer pipeline automatizado.

Para vídeos explicativos, a pesquisa converge para gerar código. Agentes que escrevem animações em Manim — com um planejador, a documentação consultada e uma crítica visual feita sobre screenshots — erram menos que modelos de difusão ([arXiv 2601.13453](https://arxiv.org/abs/2601.13453)). Num piloto com o LLM2Manim, o pós-teste dos alunos subiu de 78% para 83% ([arXiv 2604.18364](https://arxiv.org/abs/2604.18364)). Um agente de animação de Física no Jair OS deve partir de um resolvedor determinístico, nunca de números inventados pelo LLM.

No mercado brasileiro, o Hotmart FIRE relatou alta de **143% no custo do tráfego pago** em 2026 e agentes de venda que recuperam 16% dos carrinhos abandonados ([Canaltech](https://canaltech.com.br/mercado/hotmart-fire-2026-com-launchpad-plataforma-aposta-em-ia-que-cria-aplicativos-e-vira-equipe-do-empreendedor)). Isso favorece o crescimento orgânico. Os resultados do ENEM 2026 saem em 18 de janeiro de 2027 ([Agência Gov](https://agenciagov.ebc.com.br/noticias/202611/resultados-do-enem-serao-divulgados-em-18-de-janeiro)), um gancho natural para o calendário de conteúdo.

## Três normas já se aplicam ao Jair OS: LGPD, ECA Digital e CNE/CP nº 1/2026

### Resolução CNE/CP nº 1/2026

A **Resolução CNE/CP nº 1, de 11 de novembro de 2026**, se apoia no Parecer CNE/CP nº 15/2026, homologado em 10 de novembro. Ela vale para instituições públicas e privadas de todos os níveis e modalidades, o que inclui a EJA, e não trata de aulas particulares ([CRUB](https://www.crub.org.br/resolucao-cnecp-001-11nov26/); [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)). Ela cria quatro níveis de risco:

- **baixo:** planejamento e resumo;
- **moderado:** tutor de estudos sem efeito automático em notas;
- **alto:** pré-correção de redação e previsão de evasão;
- **excessivo:** proibido.

O Art. 40 detalha o alto risco. O §1 lista nessa categoria:

- a correção automatizada de provas objetivas, só como apoio e com validação humana;
- o perfil acadêmico individual;
- sistemas de seleção, certificação, progressão ou disciplina;
- dados sensíveis;
- a inferência de comportamento e a previsão de evasão e desempenho.

O §2 exige avaliação de impacto algorítmico, supervisão humana, rastreabilidade, auditoria, possibilidade de recurso, monitoramento de viés e RIPD quando couber. O §3 proíbe decisões totalmente automatizadas com efeitos relevantes.

O Art. 41 tem efeito **imediato** e proíbe:

- pontuação social;
- reconhecimento de emoções;
- decisões totalmente automatizadas sobre promoção, retenção ou certificação;
- nota de redação dada só por IA;
- punição baseada só em detector de IA;
- treinar modelos de terceiros com dados educacionais de crianças e adolescentes.

Outros artigos completam o quadro ([CRUB](https://www.crub.org.br/resolucao-cnecp-001-11nov26/)). O Art. 15 proíbe treinar modelos de terceiros com conteúdo de professores e alunos sem autorização específica. O Art. 13 exige comunicar o uso de IA a alunos, professores e famílias. O Art. 46 dá 12 meses para adaptar políticas e contratos, ou seja, até cerca de novembro de 2027.

As fontes divergem sobre a IA dar uma nota prévia a redações. O Canaltech diz que a IA não pode nem sugerir nota. O Porvir admite a pré-correção, desde que o professor leia cada texto inteiro. As duas confirmam que é proibido apenas confirmar a nota sugerida ou aprovar correções em lote ([Canaltech](https://canaltech.com.br/inteligencia-artificial/o-que-muda-com-nova-regra-do-governo-que-proibe-ia-de-corrigir-redacoes-e-provas/); [Porvir](https://porvir.org/mec-homologa-diretrizes-ia-educacao/)). O Jair OS deve seguir a leitura mais rígida e não mostrar nenhuma nota antes de o professor ler o texto inteiro.

### ECA Digital

O **ECA Digital (Lei 15.211/2025)** está em vigor desde 17 de março de 2026. Ele vale para qualquer produto ou serviço de tecnologia feito para crianças e adolescentes ou que eles provavelmente usem, o que inclui o portal de alunos e pais. A lei exige ([Planalto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm)):

- a configuração de privacidade mais protetora como padrão, desde o projeto (Art. 7);
- nenhum perfil de usuário para fins de publicidade (Arts. 22 e 26);
- um relatório de impacto quando o tratamento de dados vai além do estritamente necessário (Art. 16);
- ferramentas de supervisão pelos pais, proporcionais ao porte do serviço (Arts. 17, 18 e 39).

A ANPD virou agência reguladora em fevereiro. A verificação de conformidade começa em janeiro de 2027, e as multas chegam a 10% do faturamento no Brasil, limitadas a R$50 milhões por infração ([Correio Braziliense](https://www.correiobraziliense.com.br/cbradar/lei-15-211-o-eca-digital-preve-multa-de-ate-10-do-faturamento-no-brasil-limitada-a-r-50-milhoes-por-infracao-e-a-anpd-marca-janeiro-de-2027-para-comecar-as-acoes-de-fiscalizacao-com-foco-na-veri/)). Do lado do criador de conteúdo, perfis monetizados que mostram a rotina de crianças passaram a depender de autorização judicial ([ConJur](https://www.conjur.com.br/2026-mai-14/uso-de-imagem-de-menores-o-que-muda-e-o-que-nao-muda-com-o-eca-digital//?print=1)). Por isso, alunos que possam ser identificados ficam fora do conteúdo.

### LGPD e o cenário regulatório

A **LGPD** continua sendo a base ([Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)):

- o Art. 14 exige tratar dados de crianças e adolescentes no melhor interesse deles, com consentimento específico e destacado de um responsável para dados de crianças (§1), e sem exigir mais dados que o necessário para participar de uma atividade (§4);
- o Art. 16 manda eliminar os dados quando o tratamento acaba;
- o Art. 20 garante o direito de pedir revisão de decisões tomadas só por meios automatizados;
- o Art. 37 exige registro das operações de tratamento;
- o Art. 38 permite à ANPD exigir um RIPD.

O mapa de prioridades da ANPD para 2026–2027 põe crianças e IA no topo, com 15 e 20 ações de fiscalização previstas, respectivamente ([Mobile Time](https://www.mobiletime.com.br/noticias/05/01/2026/anpd-ia-protecao-crianca/)). O PL 2338/2023, que cria o marco legal da IA, ainda não é lei: aguarda o parecer do relator na comissão especial da Câmara ([Câmara](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262)). O AI Act europeu serve só de referência; lá, as obrigações para IA de alto risco em educação foram adiadas para 2 de dezembro de 2027 ([Orrick](https://www.orrick.com/ja-JP/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes)).

### Como cada recurso do Jair OS se enquadra

| Capacidade do Jair OS | Classificação provável | O que muda |
|---|---|---|
| Planejamento, listas, materiais didáticos | Baixo risco (CNE) | Informar alunos e famílias sobre o uso de IA |
| Tutor socrático no portal | Moderado (CNE); o portal também está sujeito ao ECA Digital | Nenhum efeito automático em notas; privacidade máxima como padrão; nenhum perfil para fins comerciais |
| Correção assistida de provas e resoluções | Alto (CNE, Art. 40 §1) | Validação humana documentada, registro de auditoria, avaliação de impacto algorítmico |
| Pré-correção de redação | Alto; nota dada só por IA é proibida (Art. 41) | Leitura humana do texto inteiro, nada de aprovação em lote, botão para pedir revisão humana |
| Student 360 e alertas de evasão | Alto (inferência de desempenho e evasão) | Avaliação de impacto, RIPD, decisão humana registrada, nenhuma retenção automática, sinais que o professor consiga entender |
| Reconhecimento de emoções, punição por detector de IA, treinar modelos de terceiros com dados de menores | Proibido (Art. 41) | Não fazer |

### Obrigações práticas

Na prática, essas normas geram quatro frentes de trabalho.

1. **Definir os papéis.** Nas aulas particulares, o professor é o controlador dos dados. No trabalho para escolas, a escola tende a ser a controladora e o Jair OS, o operador. Isso pede uma instrução ou um acordo escrito, alinhado às obrigações da própria escola, inclusive a regra de que uma ferramenta de IA que não possa ser classificada por risco não pode ser contratada.
2. **Fazer um RIPD curto por fluxo de dados:** portal, agentes de correção, análise de progresso, provedores de LLM e ferramenta de observabilidade. Dados de crianças tratados com tecnologia nova se enquadram nos critérios de alto risco da ANPD.
3. **Minimizar dados e impedir treino:**
   - mandar para os LLMs só dados pseudonimizados;
   - usar as configurações de API que excluem treino;
   - não colocar dados de alunos em planos gratuitos que alimentam os produtos do fornecedor, como o do Gemini ([Gemini pricing](https://aistudio.google.com/docs/pricing));
   - prestar atenção ao `store=true` ligado por padrão em projetos pagos novos da API do Gemini ([Gemini changelog](https://aistudio.google.com/docs/changelog));
   - lembrar que o Managed Agents e os message threads da Anthropic não são elegíveis a ZDR.
4. **Manter um humano no circuito** em qualquer resultado que avalie um aluno. Isso vira uma regra no contrato (`evaluative_output → requires_human_approval`) e um teto para a certificação. Vêm junto:
   - um aviso em linguagem simples para alunos e pais;
   - prazos de retenção automáticos: 30 a 90 dias para prompts brutos com dados de alunos, 12 meses para registros pseudonimizados e exclusão ao fim da relação de aulas particulares;
   - a documentação das transferências internacionais de dados.

A certificação ISO 42001 não faz sentido para quem opera sozinho. As quatro funções do NIST AI RMF (governar, mapear, medir e gerenciar) servem para organizar a auditoria de AgentOps que já existe ([NIST](https://www.nist.gov/itl/ai-risk-management-framework)).

## Onde a pesquisa ficou curta

As lacunas que limitam as recomendações:

- **Plataformas de automação.** Zapier (Agents e MCP), Make (AI Agents), Pipedream, Gumloop, Lindy e Relay.app não foram pesquisados, porque o orçamento de buscas acabou. Activepieces e Windmill aparecem só em comparações feitas por fornecedores. A decisão sobre o n8n se apoia na documentação e nos fóruns do próprio n8n.
- **Vídeos do YouTube.** Poucos foram verificados. Os IDs das palestras do AI Engineer World's Fair 2026 vieram das páginas de tema do evento, sem abrir o YouTube nem confirmar datas ([AI Engineer](https://ai.engineer/topics/computer-use)). Entre eles estão "Why 80% Reliability Isn't Good Enough" (Emo5FGGY-wM), "Your LLM Judge Is a Confident Liar" (xLxhT2ZI7UM) e "Don't Let the LLM Drive" (m24UKZomm7k). A pergunta sobre canais brasileiros de IA para professores ficou sem resposta.
- **Testes práticos e confirmações que faltam:**
  - teste de uso de computador nos ERPs escolares brasileiros;
  - benchmark de transcrição em português do Brasil com números e nomes;
  - se `pg_textsearch` ou VectorChord podem ser instalados no Supabase gerenciado;
  - teste do DBOS com o pooler do Supabase;
  - quais extensões do MCP o cliente do Claude.ai suporta;
  - a data de lançamento do servidor MCP do Classroom;
  - análise jurídica dos termos de uso dos ERPs e da LGPD para automação feita pelo próprio professor;
  - o desfecho do caso CADE contra a Meta.
- **Benchmarks e evidência educacional.** Boa parte dos benchmarks (OSWorld compilado, Mem0, Chandra, Skyvern, Browser Use) é declarada pelo próprio fornecedor ou vem de segunda mão. Não existe ensaio randomizado brasileiro de tutoria por IA no ensino médio ou na EJA. Os desenhos pedagógicos propostos precisam de pilotos pequenos, com medição antes e depois sem IA, antes de ganhar escala.
- **Fora do escopo.** xAI, Mistral, Microsoft Agent Framework e ferramentas de vídeo como Runway, Kling e CapCut ficaram de fora.

## Conclusão

Em 2026, o que ficou escasso não é inteligência de modelo, e sim evidência de três tipos: de que um efeito aconteceu (a releitura), de que um agente é confiável (o limite inferior do pass^k) e de que uma decisão sobre um aluno passou por um humano (o que exigem a CNE e o Art. 20 da LGPD). As três cabem numa mesma estrutura de dados: o log de efeitos, evidências e aprovações no Supabase. Por isso, o P0 de confiabilidade, o P1 de certificação e a conformidade regulatória são um projeto só, não três. Construir esse log resolve as falhas atuais, gera os dados de certificação de brinde e produz a documentação que escolas e reguladores vão cobrar a partir de 2027.

A segunda conclusão é estratégica. A evidência educacional mais sólida (Tutor CoPilot, tutores com andaime) e a nova regulação apontam na mesma direção: IA que amplifica o professor, não que decide por ele. Essa é também a direção que diferencia o conteúdo do criador diante da regra antitemplate do YouTube. Com isso, a arquitetura de verificação do Jair OS vira produto. As escolas têm até cerca de novembro de 2027 para se adequar à Resolução CNE/CP nº 1/2026. Um sistema que já classifica cada agente por risco, registra a decisão humana e certifica versões é, ao mesmo tempo, a ferramenta do professor e a vitrine de um "Kit de Adequação CNE-IA" para a consultoria.

## Roteiro priorizado para o Jair OS

O esforço é uma estimativa deste relatório, não das fontes, para uma pessoa trabalhando sozinha:

- **Baixo:** até 1 dia.
- **Médio:** 2 a 5 dias.
- **Alto:** 1 a 4 semanas.

Os custos vêm das tabelas de preço citadas no texto. "US$0" quer dizer sem custo direto além da infraestrutura atual. No total, modelos, transcrição e WhatsApp somam poucos dólares por mês. O único custo fixo opcional relevante é o DBOS Pro (US$99/mês), que pode ficar para depois. O preço de uma máquina virtual pequena para rodar o worker sem parar não foi pesquisado.

### Próximas 2 semanas (até ~7 de dezembro de 2026): estancar as falhas

| # | Ação | Resolve | Esforço | Custo |
|---|---|---|---|---|
| 1 | Auditar os 72 contratos atrás de quatro problemas. Sonnet 4.5, aposentado em 30/11. `tool_choice` forçado e `temperature`/`top_p`, que dão erro 400 na API `2026-10-21`. `gemini-2.5-*`, desviado para outros modelos em 1/12. Gemini 4 Carbon/Argon, que dobra de preço em 1/12 | Quebras silenciosas e divergência de integridade | Baixo | US$0 |
| 2 | Trocar a regra de sucesso. Criar as tabelas `effect_intents` e `evidence`, com chave idempotente estável. A pós-condição verificada fecha a execução, e a falta de recibo nunca bloqueia. `UNKNOWN_OUTCOME` vai para a caixa humana | "Recibo ausente, job bloqueado"; "não verificado" | Médio | US$0 |
| 3 | Política de energia e supervisão nos dispositivos. `powercfg`/`pmset`. Tailscale unattended configurado pela interface, com o serviço em Automático. Worker como serviço com reinício automático. Um perfil de navegador para cada ERP | Perda de heartbeat | Baixo | US$0 |
| 4 | Leases renovados por heartbeat, varredor no pg_cron a cada 5 minutos, classificação de erros e um disjuntor por executor (n8n offline → `waiting_executor`) | Execuções paradas; tentativas repetidas às cegas | Médio | US$0 |
| 5 | Lançamento de notas em fases. Lista oficial da turma primeiro, ditado por número de chamada, uma única tabela de confirmação, blocos de ~10 linhas, status e releitura linha por linha | Falha das 57 notas | Médio | US$0 |
| 6 | Aprovação imposta pelo servidor: preparar → aprovar (código de uso único + hash do conteúdo, por canal humano) → executar. Listas de turmas e destinatários permitidos. Limites por hora | `confirmar=true` manipulável por injeção de prompt | Médio | US$0 |
| 7 | Converter os ~20 alertas em 4 a 6 SLOs com alerta por consumo do orçamento de erro. "Não verificadas" vira uma métrica de pendências | Excesso de alertas | Baixo | US$0 |
| 8 | Higiene de conformidade imediata. Nenhuma nota dada só por IA e nenhuma aprovação em lote (o Art. 41 já vale). Nenhum dado de aluno em plano gratuito que treina modelos ou em serviço sem ZDR. Tarefas agendadas sem conectores de escrita desnecessários | CNE/CP 1/2026, LGPD | Baixo | US$0 |
| 9 | Avisar os alunos particulares sobre o ano grátis do Google AI Plus (até 31/12/2026) e os simulados do ENEM no Gemini | Recurso pedagógico com prazo | Baixo | US$0 |

### De 1 a 3 meses (dezembro de 2026 a fevereiro de 2027): consolidar o P0 e começar o P1

| # | Ação | Resolve | Esforço | Custo |
|---|---|---|---|---|
| 1 | Camada durável com DBOS Transact num worker sempre ligado. Começar com um protótipo de um workflow (post no Classroom com aprovação e releitura) e testar o pooler do Supabase antes de migrar o resto. Temporal Cloud ou Trigger.dev como plano B | Retomada a partir de checkpoint (P0) | Alto | US$0 (Transact) + VM; US$99/mês se precisar do Conductor; Trigger.dev US$10/mês |
| 2 | Flow packs Playwright por ERP (notas, frequência, diário). Escrita pela interface, releitura por XHR ou exportação, trace como evidência. Visão só como último recurso | Notas e diários "não verificados" | Alto (por ERP) | Repetições com ~0 tokens |
| 3 | Rebaixar o n8n: modo fila, versão fixada, devolve um identificador e grava a chave no artefato. Avaliar o Managed Agents (US$0,08/hora de sessão) ou as tarefas agendadas do Claude Code para fluxos de nuvem sem dados identificáveis | Host offline; dependência do n8n | Médio | Baixo |
| 4 | Intermediário de credenciais do Google: renovação de tokens só no servidor, permissões mínimas e uma checagem de saúde separada, que devolve o estado `auth_required` | Erros de OAuth | Médio | US$0 |
| 5 | Tabela de spans no padrão do OpenTelemetry para IA generativa, custo por workflow com tabela de preços versionada, pseudonimização antes de LLMs e da observabilidade, `traceparent` em todas as etapas | Observabilidade; LGPD | Médio | US$0 (Langfuse Hobby grátis, opcional) |
| 6 | Certificação empírica dos ~10 agentes mais usados: 20 a 50 tarefas tiradas de falhas reais, 5 tentativas cada, limite inferior de Wilson, níveis L0 a L3, juízes calibrados com 50 a 100 rótulos | Certificação empírica (P1) | Alto | ≈US$0,19 (Haiku) a US$3,75 (Sonnet) por rodada da suíte |
| 7 | Migrar o servidor MCP para a revisão 2026-07-28, mantendo suporte à anterior. OAuth com validação de `iss`, cliente de banco limitado por RLS a cada requisição, ferramentas sempre na mesma ordem | Segurança; aderência à especificação | Médio | US$0 |
| 8 | RAG: verificar se a busca usa `ts_rank`, adotar BM25 de verdade, comparar embeddings pelo MTEB-BR, criar um conjunto de avaliação difícil e uma ferramenta `search_exact` | Métricas saturadas | Médio | ≈US$0 (200 milhões de tokens grátis no voyage-4) |
| 9 | Memória: colunas com duas datas de validade, um único escritor por área, consolidação noturna, perfil injetado de até 200 linhas | Fatos desatualizados | Médio | Centavos |
| 10 | Documentação de conformidade antes de janeiro de 2027: RIPD por fluxo, aviso para alunos e pais, prazos de retenção automáticos, definição de controlador e operador, avaliação de impacto algorítmico do Student 360 | LGPD, ECA Digital, CNE | Médio | US$0 |
| 11 | Correção assistida dentro das regras da CNE: transcrição confirmada, sugestão por item de rubrica, reconferência com SymPy, aprovação item por item | Pedagogia; conformidade | Médio | Centavos por correção |
| 12 | Reativar o worker local: Ollama com MLX, Gemma 4 ou Qwen3.6 conforme a RAM, `OLLAMA_NO_CLOUD=1`. Usar para ocultar dados pessoais, classificar mensagens e transcrever localmente, testando antes em 20 áudios | Privacidade; custo | Médio | US$0 |
| 13 | WhatsApp: escopo restrito ao negócio, monitorar `AI_BOT`, nada de CPF/RG no chat, verificar `PAID_EXEMPT` no número da escola, agendar a migração para reais (prazo: 30/6/2027) | Custo; política da Meta | Baixo | ≈US$1–2/mês |

### Depois (março a novembro de 2027): completar o P1 e avançar no P2

| # | Ação | Resolve | Esforço | Custo |
|---|---|---|---|---|
| 1 | Empacotar os 81 workflows em 10 a 20 Agent Skills por família de capacidade, com os contratos em YAML no formato do Agent Card. Criar um plugin privado. Adotar Skills over MCP quando o cliente suportar | Remoção de legado; escala (P1) | Alto | US$0 |
| 2 | MCP Apps: cartões de aprovação para Classroom e WhatsApp e um painel de operações, com versão em texto para clientes sem suporte | Aprovação por canal humano | Médio | US$0 |
| 3 | Migrar para o servidor MCP do Classroom quando ele sair. Usar Student Groups para tarefas diferentes por grupo | OAuth; código legado | Médio | US$0 |
| 4 | Banco de questões: PyMuPDF + Mistral OCR 4.1 em lote + recortes fiéis + verificação de ida e volta + índice visual | Conteúdo; P2 | Alto | ≈US$10 por 5.000 páginas; índice visual ≈US$23 por 10 mil páginas, dentro da franquia gratuita |
| 5 | Tutor socrático apoiado nos gabaritos (risco moderado) e copiloto ao vivo para as aulas particulares, testados em piloto com medição antes e depois sem IA | Aprendizagem | Alto | Baixo |
| 6 | Agente de animação de Física (Manim + resolvedor determinístico) e pipeline Aula → Conteúdo, com trava de variação e dublagem automática para espanhol e inglês | Criação de conteúdo; P2 | Alto | Baixo |
| 7 | Kit de Adequação CNE-IA como produto de consultoria (prazo das escolas: ≈ novembro de 2027) | Receita; portfólio (P2) | Médio | US$0 |
| 8 | Escala horizontal: segunda instância do worker com DBOS Conductor e aposentadoria gradual dos workflows do n8n, começando pelos de maior risco | Escala; legado (P1) | Médio | US$99/mês |
| 9 | Porta de entrada por voz em cascata (Pipecat), só se houver demanda real | Conveniência | Médio | ≈US$3/mês (Gemini Live, só em conversas sem dados sensíveis) |

O que fica de fora, por ora:

- A2A como canal interno entre agentes;
- publicar o servidor no registro público do MCP;
- um gateway corporativo de MCP;
- Sampling e Roots, que foram descontinuados;
- servidores MCP ou skills da comunidade nas máquinas de desktop sem versão e hash fixados;
- GraphRAG;
- navegadores de consumo com agente embutido para escrever nos ERPs;
- Baileys e Z-API;
- gravadores que ficam ligados o tempo todo em sala;
- avatares de IA em conteúdo monetizado;
- o Sora, que foi descontinuado.
