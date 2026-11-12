# Marco jurídico-regulatório: SaaS de IA para professores que gera provas e lança notas/frequência em sistemas escolares (Brasil, 12/11/2026)

> Nota de pesquisa, não parecer jurídico. Data de referência: 12/11/2026. **[PENDENTE]** = norma ou ato ainda não concluído. **[INCERTO]** = fonte única, secundária ou conflitante. **[ADVOGADO]** / **[CONTADOR]** = ponto que um profissional precisa confirmar. URLs do planalto.gov.br são citadas como fonte primária dos textos legais (o fetch automático delas foi bloqueado por redirecionamento; o texto citado vem do conhecimento da redação vigente e deve ser conferido).

## 1. LGPD: papéis, bases legais, Art. 14, transferência internacional, incidentes, encarregado, RIPD, minimização e fiscalização

### Takeaway
O ponto juridicamente mais frágil do modelo B2C é o **papel**: os dados de alunos pertencem ao tratamento da **escola/secretaria (controladora)**. O professor, como servidor/empregado, não é agente de tratamento, e a SaaS contratada só pelo professor fica numa zona cinzenta, como "operadora sem contrato com o controlador". Pela LGPD, ela pode ser **equiparada a controladora** se fugir das instruções ou da lei. Como envolve dados de crianças e adolescentes e IA generativa, o tratamento quase certamente é de **alto risco** pela Res. CD/ANPD 2/2022. Nesse caso a startup **perde** as flexibilizações de pequeno porte: precisa nomear encarregado e não ganha prazos em dobro. A transferência a LLMs dos EUA exige as cláusulas-padrão da ANPD (prazo de adaptação encerrado em 23/08/2025). O ideal é **pseudonimizar e não enviar nomes de alunos ao LLM**.

### Cited Findings
**Papéis (controlador/operador)**
- LGPD art. 5º, VI/VII: controlador decide sobre o tratamento; operador trata em nome do controlador. Art. 39: o operador segue as instruções do controlador. Art. 42, §1º, I: o operador responde solidariamente e "equipara-se ao controlador" quando descumpre a lei ou as instruções lícitas do controlador. [Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- O Guia Orientativo da ANPD sobre agentes de tratamento (v1 de 28/05/2021, v2 de 27/04/2022) entende que **funcionários e servidores não são agentes de tratamento**; a responsabilidade é da organização, sem prejuízo de sanção disciplinar ao indivíduo. [Migalhas](https://www.migalhas.com.br/depeso/346394/anpd-define-que-funcionario-e-servidor); [Migalhas (v2)](https://www.migalhas.com.br/depeso/365151/atualizacao-no-guia-orientativo-dos-agentes-de-tratamento-pela-anpd); [Jus.com.br](https://jus.com.br/artigos/116701/o-empregado-como-operador-de-dados-sob-a-sistematica-da-lgpd-e-do-direito-do-trabalho)
- Ressalva do mesmo entendimento: o empregado que acessa dados sem autorização e para fins diversos dos do empregador passa a ser considerado **controlador**. [Serpro](https://serpro.gov.br/menu/noticias/noticias-2021/diretrizes-sobre-os-conceitos-de-agentes-de-tratamento-terceiros-e-destinatarios)

**Bases legais e crianças/adolescentes**
- LGPD art. 14, caput: o tratamento de dados de crianças e adolescentes "deverá ser realizado em seu melhor interesse"; §1º exige consentimento específico de um dos pais **para crianças quando a base for o consentimento**. [Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- Enunciado CD/ANPD nº 1/2023 (datado de 22/05/2023, publicado no DOU em 24–25/05/2023): o tratamento de dados de crianças e adolescentes pode se apoiar em **qualquer hipótese legal dos arts. 7º e 11** (não só consentimento), desde que o **melhor interesse** seja observado e prevaleça, avaliado no caso concreto. [Felsberg](https://www.felsberg.com.br/importante-anpd-publica-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/); [Cescon Barrieu](https://cesconbarrieu.com.br/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes-e-nota-tecnica-sobre-tratamento-de-dados-pessoais-no-setor-farmaceutico/); [Mobile Time](https://www.mobiletime.com.br/artigos/20/06/2023/anpd-publica-enunciado-sobre-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/)
- Base da escola para frequência: LDB art. 24, VI. "O controle de frequência fica a cargo da escola [...] exigida a frequência mínima de setenta e cinco por cento do total de horas letivas para aprovação". Isso é obrigação legal (LGPD art. 7º, II) e, na rede pública, execução de política pública (art. 7º, III; art. 23). [LDB, Lei 9.394/1996](https://www.planalto.gov.br/ccivil_03/leis/l9394.htm); [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- A frequência escolar alimenta a condicionalidade do Bolsa Família: mínimo de 75% para alunos de 6 a 18 anos incompletos e 60% para 4–5 anos. As escolas registram no Sistema Presença (MEC), e os dados seguem ao MDS. Desde dez/2025 o acompanhamento é bimestral, 5 vezes ao ano. [CEFET-RJ](https://www.cefet-rj.br/attachments/article/9120/2026-07%20BOLSA%20FAM%C3%8DLIA.pdf); [Brasil 61](https://brasil61.com/n/governo-atualiza-regras-de-acompanhamento-educacional-do-bolsa-familia-bras2515400); [Lei 14.601/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14601.htm) [INCERTO quanto ao percentual de 4–5 anos; conferir na lei]
- Qualidade dos dados como princípio (art. 6º, V: exatidão, clareza, relevância e atualização). Pseudonimização definida no art. 13, §4º (dado que só se associa ao indivíduo por informação adicional mantida separadamente). Dado pseudonimizado **continua sendo dado pessoal**; só o anonimizado sai do escopo (art. 12). [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Pequeno porte (Res. CD/ANPD 2/2022) — texto oficial lido**
- Art. 3º, I: não podem usar o regime diferenciado os agentes que "realizem tratamento de alto risco para os titulares". [Res. CD/ANPD 2/2022, DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019) (lido via [cópia PDF gov.br](https://www.gov.br/palmares/pt-br/midias/arquivos-menu-acesso-a-informacao/legislacao/resolucao-cd-anpd-n2-2022.pdf))
- Art. 4º: alto risco = pelo menos **um critério geral** (a. larga escala; b. tratamento que "possa afetar significativamente interesses e direitos fundamentais") **mais um específico** (a. "uso de tecnologias emergentes ou inovadoras"; c. decisões unicamente automatizadas; d. "utilização de dados pessoais sensíveis ou de dados pessoais de crianças, de adolescentes e de idosos"). §2º: afetar significativamente inclui situações em que o tratamento "puder impedir o exercício de direitos ou a utilização de um serviço" ou causar danos materiais/morais (discriminação etc.). [Res. 2/2022](https://www.gov.br/palmares/pt-br/midias/arquivos-menu-acesso-a-informacao/legislacao/resolucao-cd-anpd-n2-2022.pdf)
- Flexibilizações, quando aplicáveis: registro simplificado (art. 9º); dispensa de encarregado, mantendo canal com o titular (art. 11); política simplificada de segurança (art. 13); **prazo em dobro**, inclusive para comunicar incidente, **exceto** quando houver potencial comprometimento à integridade física ou moral dos titulares (art. 14, II). O art. 6º diz que as flexibilizações não isentam do restante da LGPD. [Res. 2/2022](https://www.gov.br/palmares/pt-br/midias/arquivos-menu-acesso-a-informacao/legislacao/resolucao-cd-anpd-n2-2022.pdf)

**Incidentes (Res. CD/ANPD 15/2024)**
- O controlador comunica à ANPD e aos titulares em **3 dias úteis** contados do conhecimento de que o incidente afetou dados pessoais. Pode complementar em 20 dias úteis. Tem mais 3 dias úteis para declarar à ANPD que avisou os titulares. Deve **registrar todos os incidentes (inclusive não comunicados) por 5 anos**. Prazos em dobro para pequeno porte. [Cescon Barrieu](https://cesconbarrieu.com.br/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca/); [Lefosse](https://lefosse.com/noticias/alerta/client-alert-anpd-aprova-regulamento-de-comunicacao-de-incidente-de-seguranca/); [Machado Meyer](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/anpd-publica-regulamento-de-comunicacao-de-incidente-de-seguranca) [uma fonte fala em "sem demora injustificada" para titulares; conferir texto oficial]

**Transferência internacional (Res. CD/ANPD 19/2024)**
- Publicada em 23/08/2024. Agentes que já faziam transferências tinham **12 meses para incorporar as cláusulas-padrão contratuais (CPCs) da ANPD**, prazo que **terminou em 23/08/2025**. As CPCs devem ser adotadas **integralmente, sem alteração**. Alternativas: cláusulas específicas aprovadas pela ANPD ou normas corporativas globais. A ANPD sinalizou fiscalização. [Lefosse](https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/); [Mattos Filho](https://www.mattosfilho.com.br/unico/regulamentacao-transferencia-internacional-dados/); [Migalhas](https://www.migalhas.com.br/depeso/421050/desafio-e-estrategia-para-a-adocao-das-clausulas-padrao-contratuais); [Migalhas Quentes](https://www.migalhas.com.br/quentes/449475/envio-de-dados-ao-exterior-esta-no-radar-fiscalizatorio-da-anpd)
- Menção a uma Res. CD/ANPD 32/2026 sobre adequação da UE não foi confirmada. [Confidata](https://confidata.com.br/blog/transferencia-internacional-dados-regras-anpd) [INCERTO]
- Provedores de LLM: segundo agregadores que citam a documentação da OpenAI, dados da API **não são usados para treino por padrão** (desde mar/2023) e ficam retidos **até 30 dias** para monitoramento de abuso. "Zero Data Retention" depende de aprovação prévia e não cobre todos os endpoints. [Developers Digest](https://www.developersdigest.tech/models/data-retention/openai); [OpenAI, compromisso ZDR](https://openai.com/index/our-commitment-to-zero-data-retention); [Spotdev](https://www.spotdev.co.uk/blog/openai-zero-data-retention) [conferir nos termos oficiais de cada provedor]

**Fiscalização da ANPD relevante para educação e IA**
- **SEED/PR**: a ANPD determinou a suspensão imediata do tratamento biométrico (reconhecimento facial) para frequência escolar, em processo iniciado em 2024. Criticou a omissão de documentos como o Registro de Operações de Tratamento e encaminhou o caso à Coordenação-Geral de Sanção e ao MP-PR. [Convergência Digital](https://convergenciadigital.com.br/governo/anpd-exige-suspensao-imediata-do-tratamento-de-dados-biometricos-na-frequencia-escolar-no-parana/); [Data Privacy Brasil](https://www.dataprivacybr.org/anpd-suspende-o-uso-de-reconhecimento-facial-em-escolas-publicas-do-parana/)
- **Plataformas educacionais**: procedimento nº 00261.001328/2023-77 (maio/2023) sobre plataformas de ensino que permitiam perfilamento comportamental para anúncios. Desfecho não localizado. [Data Privacy Brasil](https://www.dataprivacybr.org/data-privacy-brasil-atua-para-proteger-os-direitos-de-criancas-e-adolescentes-em-plataformas-educacionais/)
- **SEE-DF**: 4 advertências (jan/2024) por formulários online que coletavam dados de saúde de cerca de 3.000 crianças. [Confidata](https://confidata.com.br/educacao) [fonte secundária]
- **Rede social, 25/08/2026**: multa de **R$ 153.769.671,33** (5 infrações envolvendo dados de crianças/adolescentes, "feed sem cadastro"), com ordem de eliminar dados de adolescentes sem representação regularizada em 60 dias úteis e multa diária de R$ 137.081,49. [Daniel Law](https://www.daniel.com.br/pt/client-alert/anpd-aplica-multa-de-r-1537-milhoes-por-falhas-no-tratamento-de-dados-de-criancas-e-adolescentes/); [Lexology](https://www.lexology.com/library/detail.aspx?g=e4069922-5557-459d-9b81-a1b4f137768a)
- **Meta / treino de IA (2024)**: medida preventiva de 02/07/2024 suspendeu o uso de dados de brasileiros para treinar IA generativa, citando base legal inadequada, falta de transparência e risco a dados de crianças (multa diária de R$ 50 mil). Foi suspensa em 30/08/2024 após plano de conformidade, com compromisso de **não usar dados de menores de 18 anos**. [CNN Brasil](https://www.cnnbrasil.com.br/nacional/meta-e-proibida-de-usar-dados-de-usuarios-para-treinamento-de-inteligencia-artificial-no-instagram-e-facebook/); [Teletime](https://teletime.com.br/30/08/2024/anpd-aprova-plano-de-conformidade-da-meta-e-derruba-medida-preventiva/)
- A proteção de crianças no ambiente digital consta do Mapa de Temas Prioritários da ANPD 2026–2027. [Confidata](https://confidata.com.br/blog/eca-digital-escolas-protecao-dados-alunos) [fonte secundária]
- Sanções LGPD: multa de até 2% do faturamento, limitada a R$ 50 milhões por infração (art. 52, II). Multas **não** se aplicam a órgãos públicos (art. 52, §3º), o que concentra o risco pecuniário no **fornecedor privado**. [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- Marco Civil art. 15: provedor de aplicação constituído como PJ com fins econômicos deve guardar registros de acesso à aplicação por 6 meses, sob sigilo. [Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)

### Inferences
- **Papel da SaaS.** Nas features (2) e (3), o mais defensável é que a SaaS seja **operadora** do controlador real (escola/secretaria), e não do professor. No B2C não há contrato com esse controlador, o que fragiliza a posição. Se a SaaS definir finalidades próprias (melhorar modelo, analytics de alunos, benchmarking), tende a virar **controladora** de dados de menores sem base legal adequada. Mitigações:
  - **ToS**: o professor declara que usa a ferramenta conforme as normas da sua rede e da escola; a SaaS trata dados de alunos **exclusivamente** por instrução do usuário e para a finalidade escolar; uso próprio é proibido (sem treino, perfilamento ou publicidade).
  - **DPA-modelo pronto** (art. 39) para escolas privadas e redes, porque no B2B a escola assina e o papel fica limpo.
  - Política de privacidade separando **dados do professor** (SaaS controladora, base em contrato, art. 7º, V) de **dados de alunos** (SaaS operadora).
- **Alto risco.** O critério específico já está presente (crianças/adolescentes + IA generativa). O geral provavelmente também: erro de frequência pode afetar o Bolsa Família ou a aprovação (75% da LDB), ou seja, "impedir o exercício de direitos". Por isso a estratégia mais prudente é **não contar com as flexibilizações da Res. 2/2022**: nomear encarregado (pode ser o próprio fundador ou serviço externo) e seguir prazo de 3 dias úteis. [ADVOGADO]
- **Minimização e pseudonimização** são as mitigações de maior retorno:
  - **Feature (1), geração de provas**: não precisa de dado de aluno. Bloquear ou alertar sobre nomes no prompt.
  - **Feature (2), notas e frequência**: o parsing de "Ana 7,5; Bruno faltou" pode ser determinístico ou local. Se usar LLM, substituir nomes por tokens (ALUNO_17) **antes** do envio e reidentificar só no navegador ou servidor no Brasil.
  - **Voz**: o áudio contém nomes. Preferir STT on-device ou em região Brasil, ou instruir o professor a ditar número de chamada em vez de nome.
  - **Dados sensíveis**: filtrar automaticamente menções de saúde, deficiência ou laudos (ex.: "faltou porque está internado", "aluno com TEA"), que são dados sensíveis do art. 5º, II.
- **Transferência internacional.** Se dado pessoal de aluno chegar a provedor nos EUA, é preciso instrumento válido: CPCs ANPD integrais no contrato com o provedor, ou cláusulas específicas aprovadas. Verificar se OpenAI, Anthropic ou Google oferecem adendo com CPCs ANPD; não foi verificado (ver Gaps). A alternativa é usar endpoints hospedados em região Brasil e, mesmo assim, documentar acessos remotos. Pseudonimizar reduz muito o risco, mas não elimina a qualificação como dado pessoal.
- **RIPD.** A LGPD (art. 38) permite à ANPD exigi-lo, e redes e escolas vão pedi-lo (ver CNE, seção 3). Fazer um **RIPD enxuto antes do lançamento** e um **Registro de Operações** (a ausência do ROPA pesou no caso SEED/PR).
- **Segurança mínima**: criptografia em trânsito e repouso; retenção curta (apagar notas e frequência após confirmação do lançamento, ex.: 30 dias); logs de acesso por 6 meses (Marco Civil); MFA para professores; plano de resposta a incidentes com prazos da Res. 15/2024; cláusula contratual obrigando o operador a avisar o controlador em até 24–48h.

### Gaps
- Não verifiquei se OpenAI, Anthropic e Google oferecem adendo com as CPCs da ANPD (Res. 19/2024, Anexo II) nem a existência e o conteúdo de uma "Res. 32/2026" sobre adequação da UE. Não há notícia de decisão de adequação para os EUA.
- Não localizei texto oficial atualizado da Res. CD/ANPD 18/2024 (encarregado) nem o desfecho do procedimento sobre plataformas educacionais de 2023.
- Não há posição da ANPD especificamente sobre ferramenta B2C de professor que trata dados de alunos sem contrato com a escola. É questão nova. [ADVOGADO]

## 2. ECA Digital (Lei 15.211/2025): aplica-se a ferramenta usada por professores?

### Takeaway
O ECA Digital está **em vigor desde 17/03/2026**, regulamentado pelo **Decreto 12.880/2026**, com fiscalização da ANPD (Decreto 12.622/2025). Alcança produtos de TI **direcionados a** crianças e adolescentes ou **de acesso provável** por eles. Uma ferramenta **só para professores**, sem contas nem interface para alunos, provavelmente fica **fora do núcleo** do ECA Digital, e os dados de alunos continuam regidos pela LGPD art. 14. O enquadramento muda se o produto passar a ter interface para alunos (simulados online, correção devolvida ao aluno, link público de prova).

### Cited Findings
- Vigência em 17/03/2026 (vacatio de 6 meses após a sanção em 17/09/2025). [Machado Meyer](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026); [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)
- Decreto 12.880/2026 (18/03/2026) regulamenta a lei e cria a Política Nacional de Proteção dos Direitos da Criança e do Adolescente no Ambiente Digital; define verificação etária e sinais de idade. [BMA](https://www.bmalaw.com.br/conteudo/direito-digital-protecao-de-dados-e-cybersecurity/informativos-e-newsletters/eca-digital-e-sua-regulamentacao-entram-em-vigor); [Madrona](https://madronaadvogados.com.br/publicacoes/conhecimento-em-foco/eca-digital-o-que-muda-para-empresas-com-a-entrada-em-vigor-da-lei-no-15-211-2025/)
- Guia da ANPD de **28/10/2026**, "Fornecedores de produtos ou serviços de tecnologia da informação: escopo e obrigações gerais do ECA Digital" (consulta pública de abr–jun/2026). Pontos:
  - Fornecedor coberto = oferta remota, por meio eletrônico, a pedido do usuário.
  - "Acesso provável" avalia em conjunto atratividade/probabilidade de uso, facilidade de acesso e riscos significativos.
  - "Dizer nos termos de uso que o público-alvo é adulto não afasta a aplicação da lei".
  - Verificação de idade não afasta as demais obrigações.
  - Fonte: [Amadeu e Santos (resumo)](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/) [INCERTO: resumo de escritório; conferir no gov.br/anpd]
- Sanções (art. 35): advertência; multa de até 10% do faturamento no Brasil, teto de R$ 50 milhões por infração; alternativa de R$ 10 a R$ 1.000 por usuário cadastrado; suspensão; proibição. [Amadeu e Santos](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/)
- Em mar/2026 ainda faltavam normas complementares da ANPD (padrões de verificação etária, supervisão parental, procedimentos de fiscalização). [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)
- Enforcement em 2026: suspensão preventiva do "Go Live" do Discord (ago/2026) e monitoramento de lojas de apps e sistemas operacionais a partir de 10/06/2026. [Amadeu e Santos](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/)
- Para escolas, comentaristas apontam o ECA Digital como reforço do dever de cuidado com plataformas educacionais usadas por alunos. [Confidata](https://confidata.com.br/blog/eca-digital-escolas-protecao-dados-alunos) [fonte secundária]

### Inferences
- Produto professor-only não é "direcionado a" crianças, e o risco de "acesso provável" é baixo se: (a) o cadastro exigir identificação docente; (b) não houver espaço do aluno; (c) as provas forem exportadas em PDF/DOCX para impressão ou para o AVA da escola, e não respondidas dentro da plataforma.
- Não declarar apenas "público adulto" nos termos. **Documentar no RIPD** a análise dos três critérios de "acesso provável".
- Se houver roadmap de módulo para alunos (correção online, tutor), reavaliar com advogado o ECA Digital completo: padrões protetivos por padrão, verificação etária, supervisão, vedação a perfilamento publicitário. Considerar também o CNE (até o 5º ano, sem uso autônomo de IA generativa).

### Gaps
- Não li o texto integral do guia ANPD de 28/10/2026 nem do Decreto 12.880/2026. O resumo consultado não trata de ferramentas B2B/edtech usadas por adultos. Não confirmei as menções a um "Decreto 12.881/2026" e a uma "Lei 15.352/2026", que apareceram em uma única fonte.

## 3. Regulação de IA: PL 2338/2023, CNE/MEC e regras estaduais

### Takeaway
O **PL 2338/2023 não é lei**: aprovado no Senado em 10/12/2024, estava parado na Comissão Especial da Câmara "aguardando parecer do relator" (out/2026), com votação adiada para depois das eleições. Se a Câmara alterar o texto, ele volta ao Senado. O texto do Senado classifica como **alto risco** a IA usada como **fator determinante** na seleção de estudantes ou em **avaliações determinantes** para o progresso acadêmico. Mais concreto para o produto é o **Parecer CNE/CP 15/2026** (aprovado em 01/09/2026, **homologado pelo MEC em 10/11/2026** segundo a imprensa). Ele **proíbe** IA corrigir, atribuir ou até **sugerir nota** em redações e provas dissertativas, classifica a correção de provas objetivas como **alto risco** (validação humana prévia, qualificada e documentada) e veda uso de dados educacionais para publicidade ou exploração comercial. As instituições têm **12 meses para adaptar contratos**.

### Cited Findings
**PL 2338/2023**
- Tramitação:
  - Aprovado no Senado em 10/12/2024; na Câmara desde mar/2025.
  - Comissão Especial instalada em 20/05/2025 (presidente Luisa Canziani; relator Aguinaldo Ribeiro).
  - Em 10/10/2026: "aguardando parecer do relator", com 37 apensados.
  - Cinco datas de votação perdidas desde nov/2025.
  - Em 24/08/2026 o relator disse que a votação ficaria para depois das eleições.
  - Fontes: [Câmara, ficha](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262); [Grownt](https://grownt.tech/pl-da-ia-avanca-na-camara-mas-redata-e-impasse-com-o-senado-travam-o-calendario/); [LCF monitor](https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/); [Teletime, 04/05/2026](https://teletime.com.br/04/05/2026/parlamentares-tentam-retomar-cronograma-para-pl-de-ia/)
- Não encontrei notícia de parecer apresentado após as eleições, até 12/11/2026. **[PENDENTE]**
- Direito autoral é apontado como um dos principais gargalos na comissão. [Teletime](https://teletime.com.br/04/05/2026/parlamentares-tentam-retomar-cronograma-para-pl-de-ia/)
- Se a Câmara alterar o texto, ele volta ao Senado. [Merovian](https://merovian.app/blog/pl-2338-marco-legal-da-inteligencia-artificial)
- Art. 14, II (texto Senado): alto risco para IA usada como fator determinante na seleção de estudantes, em avaliações determinantes para o progresso acadêmico ou no monitoramento de estudantes (exceto monitoramento só de segurança). O ITS Rio nota que até um tutor pode virar alto risco se seus resultados entram em avaliações determinantes. A classificação final depende de regulamentação do SIA. [ITS Rio](https://itsrio.org/wp-content/uploads/2016/12/24.05.07-nota-tecnica-Substitutivo-Pl-2338-1.pdf); [Câmara, apresentação UNESCO/NEES](https://www2.camara.leg.br/atividade-legislativa/comissoes/comissoes-temporarias/especiais/57a-legislatura/comissao-especial-sobre-inteligencia-artificial-pl-2338-23/apresentacoes-em-eventos/2025.10.14IgIbertBittencourtUNESCOIA.EdueNEES.pdf)

**CNE/MEC: Parecer CNE/CP 15/2026, "Diretrizes para a Utilização da IA na Educação Brasileira"**
- Aprovado por unanimidade em 01/09/2026; súmula no DOU de 06/10/2026 (Ed. 189, Seção 1, p. 18). [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira); [ABMES, súmula](https://abmes.org.br/legislacoes/sumula-do-parecer-cne-cp-no-15-5667); [ABMES, parecer](https://abmes.org.br/legislacoes/parecer-cne-cp-no-15-5669)
- **Homologado pelo MEC em 10/11/2026** (ato de homologação no DOU não localizado). [Band](https://www.band.com.br/educacao/mec-estabelece-regras-para-uso-de-inteligencia-artificial-na-educacao); [A Crítica](https://acritica.net/tecnologia/mec-homologa-norma-proibe-ia-generativa-escola-criancas-ate-5-ano/) [conferir no DOU]
- O parecer traz um **projeto de resolução**; não localizei Resolução CNE publicada. **[PENDENTE]** [CNE, PDF do parecer](https://www.gov.br/mec/pt-br/cne/2026/setembro-2026/pcp015_26.pdf); [texto-referência da consulta pública](https://www.gov.br/mec/pt-br/cne/2026/maio-2026/texto-referencia-inteligencia-artificial-consulta-publica.pdf)
- Classificação de risco segundo a reportagem:
  - **Baixo**: organização de materiais, planejamento de aulas, acessibilidade, revisão de textos sem efeito avaliativo.
  - **Moderado**: tutores, apoio à escrita, recomendações.
  - **Alto**: sistemas que interferem em avaliações ou decisões acadêmicas, biometria, dados sensíveis.
  - **Excessivo (proibido)**: pontuação social, reconhecimento de emoções, vigilância biométrica contínua, perfilização punitiva, decisões automáticas sobre aprovação, expulsão ou trajetória.
  - Fonte: [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- Redações e provas dissertativas: "A tecnologia não poderá corrigir, avaliar, atribuir notas ou sequer apresentar uma sugestão de nota ao professor". [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/); [Tecnoblog](https://tecnoblog.net/noticias/cne-proibe-ia-para-corrigir-redacoes-nas-escolas-veja-o-que-muda/)
- Provas objetivas: IA pode auxiliar, mas é alto risco. "O resultado deverá passar por uma validação humana efetiva, prévia, qualificada e documentada"; o professor não pode apenas confirmar a nota da ferramenta; a instituição mantém registros, monitora erros e vieses e permite contestação. [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- Vedado o uso de dados educacionais para publicidade direcionada, exploração comercial ou manipulação comportamental. Também é vedada sanção acadêmica ou disciplinar fundada exclusivamente em IA. Gestão acadêmica com IA só "submetida à supervisão humana". [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira); [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- Até o 5º ano: sem acesso direto ou autônomo a IA generativa; uso só mediado. Instituições devem informar as famílias e evitar coleta desnecessária. [Mixvale](https://www.mixvale.com.br/2026/10/14/cne-aprova-regras-para-uso-de-inteligencia-artificial-no-pais/); [Jornal do Comércio](https://www.jornaldocomercio.com/geral/2026/09/1261901-conselho-nacional-de-educacao-proibe-uso-autonomo-de-ia-por-alunos-ate-o-5-ano.html)
- Prazo: após a publicação no DOU, as instituições têm **12 meses para adaptar políticas, práticas e contratos**; as proibições valem desde a publicação. [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- Formação docente deve incluir "letramento digital docente" e "avaliação assistida por tecnologias". [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira)

### Inferences
- **Feature 1 (gerar provas e listas)** = baixo risco no CNE. Não é "avaliação determinante" no PL 2338. Exigências: revisão humana pelo professor e rótulo "gerado com IA".
- **Feature 2/3 (transcrever notas que o professor já decidiu)** é função administrativa, não avaliação por IA. O risco jurídico real é **erro de transcrição**, não de IA avaliativa. Mesmo assim, o desenho deve ser *human-in-the-loop* documentado: o professor revisa a tabela final e confirma cada lote; guardar log (quem, quando, o que mudou).
- **Não oferecer correção ou sugestão de nota de redação ou dissertativa.** Isso é vedado pelo CNE em todas as etapas e mata a venda B2B. Correção de objetivas só com fluxo de validação humana "qualificada e documentada" e contestação. Postergar.
- Fazer da conformidade CNE um argumento de venda B2B: redes e escolas terão de **revisar contratos até ~nov/2027** e vão exigir de fornecedores DPA, RIPD, vedação de uso comercial e de treino com dados de alunos, e logs de supervisão humana.

### Gaps
- Texto integral do Parecer 15/2026 e do projeto de resolução (PDF do MEC protegido por captcha); número e data do ato de homologação no DOU.
- Normas estaduais ou municipais específicas sobre IA em escolas (SP, RJ, PR, MG) não foram localizadas nesta pesquisa. Também não localizei "referenciais" do MEC para IA além do parecer do CNE.

## 4. Credenciais e acesso automatizado aos sistemas oficiais (SED-SP, SEEDUC-RJ, RCO-PR, MG; TOTVS/Sponte etc.)

### Takeaway
**Guardar senhas de professores na nuvem e fazer o robô logar nos sistemas estaduais é o maior risco do projeto.**
- A SEDUC-SP declara a senha "pessoal e intransferível" e afasta a alegação de uso indevido após o compartilhamento. O PR diz o mesmo da senha da Central de Segurança, usada no RCO.
- O professor fica exposto a **processo disciplinar**.
- Um vazamento na SaaS exporia credenciais de acesso a dados de milhões de alunos.
- A tipificação criminal (art. 154-A CP) depende de "autorização do usuário" e é **incerta** quando quem autoriza não é o titular do sistema.

O desenho defensável é uma **extensão de navegador que só preenche campos na sessão já aberta pelo próprio professor**, sem guardar senha, com **revisão e clique final do professor**. Erros de lançamento em diário público têm repercussão real (aprovação por frequência, Bolsa Família). Crimes como falsidade ideológica (art. 299) e inserção de dados falsos (art. 313-A) exigem **dolo** e não se aplicam a erro honesto, mas geram responsabilidade administrativa e civil.

### Cited Findings
- Política de privacidade do app Diário de Classe (SEDUC-SP): "O login e senha só poderão ser utilizados pelo usuário cadastrado. Ele se compromete em manter o sigilo da senha, que é pessoal e intransferível, não sendo possível, em qualquer hipótese, a alegação de uso indevido, após o ato de compartilhamento." [SED-SP](https://sed.educacao.sp.gov.br/PoliticaPrivacidadeAPP/Index)
- O mesmo login da SED dá acesso ao Diário de Classe e ao Centro de Mídias SP. Servidores usam o mesmo usuário do portal GDAE. [Tutorial SEDUC-SP](https://midiasstoragesec.blob.core.windows.net/001/2020/04/tutorial-acesso-docente-sed-.pdf); [Portal de Atendimento SEDUC-SP](https://atendimento.educacao.sp.gov.br/artigos-de-base-de-conhecimento/)
- Paraná: o login e senha da Central de Segurança são os "mesmo[s] [...] dos sistemas PrConsig, Registro de Classe Online – RCO e outros", "de uso pessoal e intransferível", e o professor responde por prejuízos do uso. [Edital Seed-PR 59/2022](https://www.nre.seed.pr.gov.br/modules/qas/uploads/10457/edital_592022gsseed_concurso_de_remocao_qpm_e_qup_2022.pdf). RCO Municípios usa CPF e senha pessoal da Central de Segurança. [Psicopedagogia.com.br](https://psicopedagogia.com.br/conteudo/rco-municipios-guia-completo-e-atualizado) [fonte secundária]
- **Implicação lateral (inferência a confirmar)**: a credencial do professor no PR dá acesso também ao PrConsig (consignados). Uma credencial vazada vai muito além do diário. [Edital Seed-PR](https://www.nre.seed.pr.gov.br/modules/qas/uploads/10457/edital_592022gsseed_concurso_de_remocao_qpm_e_qup_2022.pdf)
- Disciplinar: normas federais preveem responsabilização administrativa por ceder ou emprestar senha ou usar senha restrita indevidamente. Há caso de **demissão mantida** de servidor que passou a senha a terceiro para registrar ponto. [Cartilha Fiocruz](https://fiocruz.br/sites/fiocruz.br/files/documentos_2/observar_as_normas_legais_e_regulamentares.pdf); [Wagner Advogados](https://wagner.adv.br/servidor-puacuteblico-demissatildeo-senha-de-computador/) (contexto federal, Lei 8.112; estatutos estaduais como a Lei SP 10.261/1968 não foram verificados)
- Registros funcionais como documento público: o TJSP manteve condenação por falsidade ideológica de servidor que fraudou ponto eletrônico, tratado como documento público. O TJMS reconheceu falsidade ao inserir declaração falsa em folha de frequência. O TJDF exige dolo específico. O STJ (RHC 81.451) afasta o crime quando o documento é "passível de averiguação". [Sedep/TJSP](https://www.sedep.com.br/?p=166690); [Legjur/TJMS](https://www.legjur.com/jurisprudencia/eme/168.0156.7837.2230); [Dizer o Direito/STJ](https://www.dizerodireito.com.br/2017/12/inserir-informacao-falsa-em-curriculo.html)
- Natureza do diário: o Parecer CNE/CEB 37/2004 o trata como instrumento de registro do processo de ensino-aprendizagem. [CNE](https://www.gov.br/mec/pt-br/cne/pdf/pareceres-do-cne/ceb/2004/pceb037_04.pdf)
- CP art. 299 (falsidade ideológica): inserir ou **fazer inserir** declaração falsa em documento público com o fim de prejudicar direito, criar obrigação ou alterar a verdade. Pena aumentada se funcionário público se prevalece do cargo. [Código Penal](https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm)
- CP art. 313-A (inserção de dados falsos em sistema da Administração): sujeito ativo é o "funcionário autorizado"; pena de 2 a 12 anos; exige dolo e fim de vantagem indevida ou dano. Inserção culposa ou acidental não tipifica. [Jus.com.br](https://jus.com.br/artigos/103791/insercao-de-dados-falsos-em-sistemas-de-informacoes-art-313-a); [Migalhas](https://www.migalhas.com.br/depeso/386015/o-crime-de-insercao-de-dados-falsos-em-sistema-de-informacoes); [Código Penal](https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm)
- CP art. 154-A (Lei 12.737/2012, alterado pela Lei 14.155/2021): invadir dispositivo informático de uso alheio para obter, adulterar ou destruir dados "sem autorização expressa ou tácita do usuário do dispositivo". [Código Penal](https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm)
- Improbidade (Lei 8.429/1992 com a Lei 14.230/2021) exige dolo, isto é, "vontade livre e consciente de alcançar o resultado ilícito"; mera voluntariedade não basta. [Lei 8.429/1992](https://www.planalto.gov.br/ccivil_03/leis/l8429.htm)

### Inferences
- **Modelo A, credenciais na nuvem e robô servidor-a-servidor: NÃO recomendado.** Motivos:
  - Viola a política expressa da SEDUC-SP e a regra do PR de senha "pessoal e intransferível".
  - O professor perde a defesa de "uso indevido" e fica exposto a PAD.
  - A SaaS concentra credenciais governamentais: um incidente seria gravíssimo, envolveria o Estado e cairia no art. 14, II da Res. 2/2022 (sem prazo em dobro).
  - Acessos de datacenter tendem a acionar bloqueios e captchas.
  - Sobre o art. 154-A: há discussão se a autorização do professor (usuário da conta) basta, já que o sistema é do Estado. Com a política proibindo o compartilhamento, o risco de interpretação desfavorável não é desprezível. [ADVOGADO]
- **Modelo B, extensão de navegador "copiloto" na sessão do professor: recomendado, com salvaguardas:**
  1. Nunca ler, armazenar ou transmitir senha. O professor loga manualmente, inclusive com 2FA.
  2. A extensão só preenche campos visíveis da página aberta. Nada de headless, raspagem em massa ou chamada direta a APIs internas.
  3. Tela de **conferência** (tabela aluno × nota/falta com diferenças destacadas) e **o professor clica "Salvar/Enviar" no próprio sistema**, ou confirma explicitamente lote a lote.
  4. Log local do que foi preenchido (prova de diligência).
  5. Ritmo humano (sem paralelismo) e botão de abortar.
  6. Dados de alunos processados localmente na extensão, sempre que possível.
- **ToS da SaaS**:
  - O professor declara que é o titular da conta e que usa a ferramenta conforme as regras da sua rede.
  - A SaaS é "ferramenta de digitação assistida": não acessa sistemas por conta própria e não armazena credenciais.
  - A responsabilidade pela conferência e pelo envio é do professor.
  - Limitação de responsabilidade por erros não revisados (dentro dos limites do CDC, ver seção 5).
  - Sem promessa de compatibilidade nem de "uso autorizado" pelo Estado.
  - Mais: canal para a rede solicitar bloqueio; recomendação ao professor de consultar a direção.
- **Rota de longo prazo**: integração oficial. Para redes públicas, convênio, termo de cooperação ou contratação via API. Para sistemas privados (TOTVS, Sponte, Unimestre, Activesoft), parceria ou API do fornecedor contratada pela escola. A automação por fora pode violar a licença da escola com o fornecedor.
- **Erros**: um lançamento errado de faltas pode reprovar por frequência (LDB 75%) ou cortar benefício (Bolsa Família). Isso cria responsabilidade civil e disciplinar do professor e risco de ação regressiva contra a SaaS. Mitigar com confirmação humana obrigatória, "dupla checagem" de outliers (aluno com 0 ou 10, faltas acima do número de aulas) e seguro de responsabilidade civil profissional/cyber (a cotar).

### Gaps
- Não localizei termos de uso específicos de SEEDUC-RJ (Conexão Educação), MG (SIMADE/DED) nem dos ERPs privados (TOTVS Educacional, Sponte, Unimestre, Activesoft) quanto a automação ou robôs.
- Não localizei jurisprudência específica sobre professor e diário de classe sob os arts. 299 e 313-A, nem caso de professor punido por usar ferramenta de terceiros no diário.
- Estatutos estaduais (SP Lei 10.261/1968; RJ Decreto-Lei 220/1975) não foram verificados quanto a deveres de sigilo de senha.
- As políticas da Chrome Web Store sobre extensões que automatizam sites governamentais não foram verificadas.

## 5. Direito do consumidor (CDC) para assinaturas

### Takeaway
Na venda B2C a professores, aplicam-se:
- **Direito de arrependimento de 7 dias** (art. 49 CDC), com reembolso integral.
- Informação clara e **cancelamento pelo mesmo canal** da contratação (Decreto 7.962/2013).
- Vedação a cláusulas abusivas.

O **Decreto do SAC (11.034/2022) em regra não se aplica**, porque só alcança fornecedores de serviços regulados pelo Poder Executivo federal. Não localizei norma federal específica sobre renovação automática. Boa prática é aviso prévio antes da renovação e cancelamento em um clique.

### Cited Findings
- CDC art. 49: desistência em 7 dias da contratação fora do estabelecimento (internet incluída), com devolução imediata dos valores pagos, corrigidos. [CDC, Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm); [Juridico.ai](https://juridico.ai/?p=25784)
- Decreto 7.962/2013 (e-commerce): informações claras sobre o fornecedor e a oferta; o arrependimento pode ser exercido "pela mesma ferramenta utilizada para a contratação". [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm); [Idec](https://idec.org.br/consultas/dicas-e-direitos/idec-destaca-direitos-do-consumidor-no-comercio-eletronico)
- Decreto 11.034/2022 (SAC) regulamenta o CDC "no âmbito dos fornecedores dos serviços regulados pelo Poder Executivo federal". Empresas fora desse âmbito não são obrigadas às regras do SAC, embora o direito à informação do CDC continue valendo. [Câmara Legin](https://www2.camara.leg.br/legin/fed/decret/2022/decreto-11034-5-abril-2022-792480-publicacaooriginal-164911-pe.html); [Mattos Filho](https://www.mattosfilho.com.br/unico/decreto-servico-consumidor/); [Migalhas](https://www.migalhas.com.br/depeso/363618/novo-decreto-que-regulamenta-o-sac-e-a-lgpd)
  - Uma fonte de mercado afirma o contrário (SAC exigível "em tempo integral"). [InfoMoney](https://www.infomoney.com.br/?p=3109974) [conflito; prevalece o texto do art. 1º do decreto]
- Renovação automática sem aviso adequado é contestável via chargeback. Não localizei orientação específica da Senacon. [InfoMoney](https://www.infomoney.com.br/?p=3109974)
- Validade do aceite click-wrap no Brasil: discussão de 2026. [Ribeiro Cavalcante](https://www.ribeirocavalcante.com.br/click-wrap-e-browse-wrap-2026/)

### Inferences
- **Checklist B2C**:
  - Página de preço com total, periodicidade e data de renovação.
  - Reembolso automático se o cancelamento ocorrer em até 7 dias da **primeira** contratação. Recomendável estender aos upgrades.
  - Botão "cancelar" na área logada, sem retenção forçada.
  - E-mail de aviso antes da renovação anual.
  - CNPJ, endereço e canal de contato visíveis.
  - ToS e Política de Privacidade versionados, com registro do aceite (data, hora, versão).
  - Cláusulas de limitação de responsabilidade escritas com cautela: o CDC (art. 51, I) considera nula a cláusula que exonere ou atenue a responsabilidade do fornecedor em relação de consumo.
  - Venda B2B a escolas não é, em regra, relação de consumo, e permite contrato com limitação de responsabilidade. [ADVOGADO]
- **Professor PJ ou escola** comprando: tratar como contrato empresarial com DPA anexo.

### Gaps
- Não verifiquei leis estaduais de cancelamento e renovação de assinaturas (há leis estaduais esparsas) nem eventual projeto federal avançado sobre renovação automática em 2026.

## 6. Direitos autorais: ENEM/INEP, vestibulares, livros didáticos (PNLD), uploads do professor e autoria de conteúdo gerado por IA

### Takeaway
Pela Lei 9.610/1998, autor é **pessoa física** (art. 11). Conteúdo gerado autonomamente por IA não tem autor humano, e a doutrina majoritária o vê como não protegido ou em domínio público, sem jurisprudência consolidada. Itens do ENEM e de vestibulares **não** são "atos oficiais" automaticamente livres. Muitos incorporam **textos, imagens e gráficos de terceiros protegidos**. Não localizei licença do INEP, Fuvest ou Unicamp para reuso comercial. Montar um **banco comercial de questões reproduzidas** é arriscado. Gerar **questões novas "no estilo"** é defensável, porque ideias, métodos e conceitos matemáticos não são protegidos (art. 8º, I).

### Cited Findings
- Lei 9.610/1998:
  - Art. 11: "Autor é a pessoa física criadora de obra literária, artística ou científica".
  - Art. 8º, I: não são protegidos ideias, procedimentos normativos, sistemas, métodos, projetos ou conceitos matemáticos como tais.
  - Art. 8º, IV: textos de leis, decisões judiciais e demais atos oficiais não são protegidos.
  - Art. 7º, XIII: protege compilações e bases de dados que, por seleção ou organização, constituam criação intelectual.
  - Art. 29: a reprodução depende de autorização prévia e expressa.
  - Art. 46, III e VIII: citação para estudo, crítica ou polêmica com indicação de autor e origem; pequenos trechos quando a reprodução não é o objetivo principal da obra nova nem prejudica a exploração normal.
  - Fonte: [Lei 9.610/1998](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)
- A IA não pode ser titular de direitos autorais (art. 11); parte da doutrina defende domínio público na ausência de autor humano. Não há súmula sobre o tema. O PL 2338 não resolve a autoria dos outputs. O INPI (Parecer 24/2022) negou IA como inventora. [ConJur, 03/04/2026](https://www.conjur.com.br/2026-abr-03/inteligencia-artificial-nao-pode-ser-titular-de-direitos-autorais//?print=1); [Migalhas](https://www.migalhas.com.br/depeso/444201/reflexoes-sobre-direito-autoral-e-o-uso-de-inteligencia-artificial); [INPI](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/Direitosautoraiseobrasgeradas.pdf)
- INEP trata itens do Banco Nacional de Itens como **sigilosos** antes da aplicação. Vazamento motivou anulação de 3 questões do ENEM 2025 e acionamento da PF. Pedidos LAI sobre itens são decididos caso a caso. [Agência Brasil](https://agenciabrasil.ebc.com.br/educacao/noticia/2025-11/enem-2025-inep-anula-tres-questoes-por-suspeita-de-vazamento); [CGU/CMRI decisão 006/2025](https://www.gov.br/casacivil/pt-br/assuntos/colegiados/comissao-mista-de-reavaliacao-de-informacoes-cmri/decisoes-de-recurso-de-4a-instancia/2025/decisao-006-2025-nup-23546-050406-2024-57.pdf)
- Reuso comercial de questões da Fuvest e da Unicamp é prática de mercado (coletâneas à venda, cursinhos), o que mostra que o mercado existe, **não** que seja lícito. Não localizei termos de licença das bancas. [Estratégia Vestibulares](https://vestibulares.estrategia.com/instituicao/jornada-fuvest-2026/); [Fuvest, guia de respostas](https://www.fuvest.br/wp-content/uploads/fuvest_2025_guia_respostas.pdf)
- Direito autoral é um dos gargalos do PL 2338 na Câmara. O texto do Senado prevê regras de remuneração e opt-out para treino com obras, aplicáveis sobretudo a desenvolvedores de modelos. [Teletime](https://teletime.com.br/04/05/2026/parlamentares-tentam-retomar-cronograma-para-pl-de-ia/)

### Inferences
- **Produto**:
  - (a) Gerar itens **originais** inspirados em habilidades ou descritores (BNCC, Matriz ENEM, que é documento oficial) e não clonar enunciados.
  - (b) Se exibir questão oficial, mostrar só **referência e link** para a prova do INEP ou da banca, ou trechos curtos com citação (art. 46, III).
  - (c) **Não** incorporar ao produto textos-base de terceiros (crônicas, charges, reportagens) sem licença.
  - (d) Bloquear upload de livros PNLD ou de editoras para reprocessamento coletivo. Uploads do professor ficam **isolados por conta**, usados só para gerar material para as turmas dele, nunca para treino nem compartilhamento entre usuários, com garantia no ToS de que ele tem direito de uso e com remoção mediante notificação.
- **Titularidade do output**: o ToS deve atribuir ao professor os direitos que existirem sobre o material, com aviso de que pode não haver proteção autoral. A edição criativa do professor tende a gerar autoria humana sobre a versão final.
- Não usar logotipos, marcas ou "estilo ENEM oficial" que sugira chancela do INEP.

### Gaps
- Termos de uso das provas publicadas pelo INEP, Fuvest, Comvest e Vunesp; regime de direitos dos livros PNLD (contratos FNDE × editoras). Não verificados. [ADVOGADO de PI]

## 7. Venda ao setor público (Lei 14.133/2021, dispensa 2026, ARP/carona, LC 182 e LGPD com secretarias)

### Takeaway
Para 2026 a **dispensa por valor** (compras e serviços) vai até **R$ 65.492,11** (Decreto 12.807/2025), o que já comporta pilotos municipais de licenças. A adesão a ata de registro de preços tem limites de 50% por órgão aderente e do dobro no total. A rota mais aderente a uma edtech nova é o **CPSI do Marco Legal das Startups** (LC 182/2021): até **R$ 1,6 milhão** por contrato de teste e fornecimento posterior de até 5×. Secretarias de educação municipais já usaram esse modelo. Toda venda pública exige CNPJ regular, certidões e um **contrato de operador LGPD**, já que o ente é controlador.

### Cited Findings
- Decreto 12.807, de 29/12/2025, em vigor desde 01/01/2026: dispensa até **R$ 65.492,11** (compras e demais serviços) e **R$ 130.984,20** (obras e serviços de engenharia), reajuste de 4,41%. Os valores de 2027 sairão em decreto no fim de 2026. [Effecti](https://effecti.com.br/decreto-12807-de-2025/); [cópia do decreto (Unipampa)](https://sites.unipampa.edu.br/propladi/files/2026/01/decreto-12-807-2025-limites-dispensa-2026.pdf); [Ronny Charles](https://ronnycharles.com.br/?p=17373)
- Lei 14.133/2021:
  - Art. 75, II: dispensa por valor. Art. 75, §1º: o limite considera o somatório no exercício para objetos da mesma natureza na mesma unidade gestora.
  - Art. 86, §§4º e 5º: adesão ("carona") limitada a 50% dos quantitativos por órgão aderente e ao dobro no total; §8º veda a órgãos federais aderir a ata estadual ou municipal.
  - Art. 74, I: inexigibilidade para fornecedor exclusivo.
  - Art. 4º: aplica às licitações os benefícios de ME/EPP da LC 123 (arts. 42–49). Pela LC 123, art. 48, I, há certame exclusivo para ME/EPP em itens de até R$ 80.000.
  - Fontes: [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm); [LC 123/2006](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm)
- LC 182/2021 (Marco Legal das Startups), CPSI: teto de R$ 1,6 milhão por contrato (o edital pode fixar menos); contrato de fornecimento posterior de até 5× (R$ 8 milhões). Fontes divergem sobre prazo (12+12 meses no modelo federal × 24 meses). Pessoas físicas ou jurídicas podem participar, não só startups. Secretarias municipais de educação usaram CPSI para contratar edtechs em 2022. [Effecti](https://effecti.com.br/contrato-publico-startup-cpsi/); [ConJur](https://www.conjur.com.br/2024-nov-06/os-contratos-publicos-com-startups-postos-a-prova//?print=1); [Demarest](https://www.demarest.com.br/wp-content/uploads/2021/10/Marco-legal-das-startups-e-novas-tecnologias-para-a-Administracao-Publica.pdf) [conferir atualização do valor]
- O Poder Público trata dados com base na execução de políticas públicas e deve seguir o Guia da ANPD para o Poder Público. O fornecedor é operador sob contrato (LGPD arts. 23, 26 e 39). [Guia ANPD Poder Público (cópia Unicamp)](https://privacidade.unicamp.br/arquivo/uploads/guia-poder-publico-anpd-versao-final/); [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- CNE: instituições devem rever contratos e avaliar ferramentas de IA contratadas em até 12 meses após a publicação. [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)

### Inferences
- **Sequência realista**: (1) piloto gratuito ou termo de cooperação com uma rede municipal pequena; (2) dispensa eletrônica até R$ 65 mil/ano (ex.: ~500 professores × R$ 10/mês × 12 = R$ 60 mil, conta ilustrativa); (3) CPSI ou pregão com ARP para escalar; (4) adesões de outros municípios à ata.
- **Habilitação**: CNPJ; certidões de regularidade federal (RFB/PGFN), FGTS, trabalhista (CNDT), estadual e municipal; balanço ou declaração de ME/EPP; cadastro no SICAF e no PNCP/Compras.gov e nos portais municipais.
- **Pacote LGPD do contrato público**: DPA de operador com finalidade restrita; localização dos dados (preferência Brasil); suboperadores listados (provedor de LLM, nuvem); CPCs ANPD se houver transferência; retenção e devolução; prazos de incidente (ex.: 24–48h ao controlador); auditoria; vedação de uso para treino ou comercial (exigência CNE); RIPD do produto; política de segurança.
- **No B2B público, a integração com o diário deve ser institucional** (API ou acordo com a secretaria), não via credencial do professor.

### Gaps
- Valores de dispensa de 2027 (decreto não publicado até a data da pesquisa); valor atualizado do CPSI; regras próprias de compras de estados e municípios.

## 8. Estrutura societária e tributação para fundador solo (MEI, Simples Anexo III/V, ISS, Reforma Tributária, Hotmart/Kiwify)

### Takeaway
- **MEI não comporta software**: CNAEs 6201, 6202, 6203, 6204 e 6209 ficam fora do rol do Anexo XI da Res. CGSN 140/2018. O PLP 25/2026, que incluiria a atividade, não foi aprovado.
- O caminho é **ME/SLU no Simples Nacional**. Licenciamento e assinatura de software, inclusive SaaS, cai no **Anexo III se Fator R ≥ 28%** (pró-labore e folha ≥ 28% da receita de 12 meses), senão no **Anexo V**.
- O STF fixou **ISS (e não ICMS)** sobre licenciamento e cessão de software, inclusive SaaS (subitem 1.05 da LC 116). No Simples, o ISS vai no DAS.
- **Reforma Tributária**: 2026 é ano-teste (CBS 0,9% / IBS 0,1%), sem efeito prático para o Simples. Em 2027 entram CBS cheia e o "Simples híbrido" opcional. ISS e ICMS caem de 2029 a 2032 e são extintos em 2033.
- Para B2C e setor público, que não aproveitam crédito, o Simples "por dentro" tende a bastar. Os prazos de opção ou cancelamento do híbrido para 2027 estão **em cima da data de hoje**. [CONTADOR, urgente]

### Cited Findings
- Desenvolvimento e licenciamento de software não está no rol de ocupações MEI (Anexo XI, Res. CGSN 140/2018); os CNAEs 6201, 6202, 6203, 6204 e 6209 são vedados. O PLP 25/2026 propõe incluir, sem aprovação. [Meu Contador Online](https://www.meucontadoronline.com.br/blog/desenvolvedor-de-software-pode-ser-mei/); [Wetax](https://wetax.com.br/programador-pode-ser-mei-em-2026); [Contabilidade.com](https://contabilidade.com/blog/desenvolvedor-pode-ser-mei-em-2026-veja-como-abrir-cnpj-escolher-o-cnae-ideal-e-pagar-menos-impostos/) [fontes conflitam sobre o nº de ocupações (426 × 463); conferir no Portal do Empreendedor]
- Licenciamento e **assinatura de software com acesso pela internet** no Simples: Anexo III se Fator R ≥ 0,28, senão Anexo V. Base: LC 123, art. 18, §5º-D, V e §§5º-I, 5º-J, 5º-M; Res. CGSN 140, art. 25, §1º, V, "e". Fonte: Solução de Consulta Cosit 222/2019. O tratamento independe de mídia física, download ou SaaS. [Tributo Devido](https://tributodevido.com.br/portal/tributacao-no-simples-nacional-para-licenciamento-e-assinatura-de-software/); [LC 123/2006](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm)
- O CNAE 6203-1/00 (licenciamento de software não customizável) é o mais aderente ao SaaS padronizado. [Contabilidade.com](https://contabilidade.com/blog/cnae-6202300-desenvolvimento-e-licenciamento-de-programas-de-computador-customizaveis-simples-nacional-fator-r-e-abertura-de-empresa/) [CONTADOR]
- STF (ADIs 1945 e 5659; RE 688223, 2021, unânime): incide **ISS** sobre licenciamento e cessão de direito de uso de software (subitem 1.05 da LC 116), inclusive download e nuvem. No SaaS, utilidades acessórias (help desk etc.) podem ser segregadas. [Mattos Filho](https://www.mattosfilho.com.br/unico/stf-iss-licenciamento-de-softwares/); [Damásio/Informativo 1007](https://juris.damasio.com.br/jurisprudencia/julgado/1007/incidencia-apenas-de-iss-sobre-o-licenciamento-ou-cessao-de-direito-de-uso-de-programas-de-computador)
- ISS: alíquota mínima de 2% (LC 116, art. 8º-A). [LC 116/2003](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm)
- Reforma Tributária: base na EC 132/2023, LC 214/2025 e LC 227/2026.
  - 2026: teste com CBS 0,9% e IBS 0,1%, compensáveis, sem efeito prático para Simples e MEI.
  - 2027: CBS plena, extinção de PIS/Cofins, início do Imposto Seletivo.
  - 2029–2032: redução gradual de ICMS e ISS; extinção em 2033.
  - Fontes: [Congresso em Foco](https://www.congressoemfoco.com.br/noticia/115548/confira-o-cronograma-de-implementacao-da-reforma-tributaria); [Jornal Contábil](https://jornalcontabil.com.br/noticia/reforma-tributaria-cronograma-e-acoes-a-se-tomar-ainda-em-2026/); [Meu Contador Online](https://www.meucontadoronline.com.br/blog/reforma-tributaria-2026/)
- Simples a partir de 2027: IBS e CBS **dentro do DAS** (crédito limitado ao cliente PJ, estimado em 0,62%–1,84%) ou opção **híbrida** (IBS e CBS fora do DAS, crédito pleno ao comprador contribuinte). O híbrido compensa sobretudo em vendas B2B a contribuintes. [Migalhas](https://www.migalhas.com.br/depeso/458864/simples-nacional-2027); [Meu Contador Online](https://www.meucontadoronline.com.br/blog/simples-nacional-hibrido-em-2027/); [Tax Group](https://www.taxgroup.com.br/intelligence/simples-nacional-reforma-tributaria-ibs-cbs/)
- Prazos de opção e cancelamento do regime para 2027: **fontes conflitam**. Uma aponta janela de 1º a 30/09/2026; outra, cancelamento entre 03/11 e 20/12/2026; outra, cancelamento até o fim de novembro. Referência citada: Res. CGSN 186/2026. [Folha Vitória](https://www.folhavitoria.com.br/economia/simples-nacional-prazo-muda-e-exige-decisao-de-micro-e-pequenas-empresas/); [Tactus](https://tactus.com.br/simples-nacional-2027/amp/); [O Povo](https://opovo.com.br/trends/simples-nacional-muda-em-2027-e-pequenos-negocios-terao-de-prestar-atencao-a-novas-regras-antes-da-virada/) [INCERTO; CONTADOR]
- Hotmart/Kiwify: há divergência entre contadores sobre emitir NFS-e ao comprador final ou à plataforma, conforme o modelo (produtor, coprodutor, afiliado). Cursos online são tratados como serviço (NFS-e/ISS). Produtor e afiliado não podem ser MEI. Não encontrei tratamento específico de SaaS vendido por essas plataformas. [Tactus](https://tactus.com.br/emitir-nota-fiscal-para-hotmart/); [Contabilidade Zen](https://www.contabilidadezen.com.br/blog/hotmart-impostos-produtor-2026/); [Unclik](https://unclik.com.br/blog/nota-fiscal-para-venda-de-infoproduto-como-emitir/)
- A Hotmart adquiriu a eNotas (emissão de NF). [ABC da Comunicação](https://www.abcdacomunicacao.com.br/hotmart-adquire-enotas-startup-de-emissao-de-notas-fiscais-eletronicas/)

### Inferences
- **Estrutura**: SLU (sociedade limitada unipessoal) ME no Simples, CNAE principal 6203-1/00. Possíveis secundários: 6311-9/00 (tratamento de dados, hospedagem), se houver; 8599-6/04 (treinamento) ou 8599-6/99, se vender cursos. [CONTADOR]
- **Fator R**: fixar pró-labore ≥ 28% do faturamento de 12 meses para ficar no Anexo III. A alíquota inicial do Anexo III é comumente citada como 6%, contra 15,5% no Anexo V [verificar na tabela vigente]. Em faturamento baixo, o custo do pró-labore (INSS 11%) precisa ser simulado pelo contador.
- **Servidor público sócio**: estatutos em geral vedam ao servidor a gerência ou administração de sociedade privada, mas permitem ser cotista ou acionista. No caso do fundador servidor estadual ou municipal, verificar o estatuto (ex.: RJ, SP) sobre administrar a SLU. Pode ser necessário nomear administrador não servidor. Verificar também **conflito de interesses** ao vender para a própria rede em que leciona. [ADVOGADO; não pesquisado nesta rodada]
- **Hotmart/Kiwify**: viável como **checkout** de assinatura B2C. Para ISS, enquadrar como licenciamento de software (1.05), não como curso (8.02), e emitir NFS-e conforme o município. Avaliar Stripe, Pagar.me ou Asaas para ter controle de cancelamento e reembolso (CDC) e menor taxa.
- **Custos com LLMs dos EUA** (pagamento em USD): IOF sobre cartão internacional e potenciais tributos de importação de serviço (IRRF, CIDE, PIS/Cofins-importação, ISS-importação; a partir de 2027, IBS/CBS-importação). Não foi pesquisado. [CONTADOR]

### Gaps
- Texto da Res. CGSN 186/2026 e prazo exato de opção ou cancelamento do regime para 2027.
- Tratamento de IBS/CBS sobre importação de serviços de IA (LC 214) para optantes do Simples. IOF vigente em 2026 para cartão internacional.
- Vedação estatutária específica ao professor servidor (SP, RJ) de administrar sociedade.

## 9. Síntese: matriz de riscos, mitigações de produto e orçamento de compliance

### Takeaway
O produto é viável juridicamente se: (i) **a IA nunca atribuir nem sugerir nota** (CNE); (ii) **não houver custódia de credenciais** nem robô servidor-a-servidor (o lançamento é feito por extensão na sessão do professor, com conferência e clique humano); (iii) **nomes de alunos não forem enviados ao LLM** (pseudonimização, processamento local ou no Brasil); (iv) a empresa operar como **operadora com DPA**, tratando o caso como **alto risco** (encarregado, RIPD, ROPA, plano de incidentes de 3 dias úteis); (v) houver **CPCs ANPD** com os provedores estrangeiros; (vi) o B2C seguir o CDC (7 dias, cancelamento fácil); (vii) a empresa for **ME no Simples (não MEI)**, com Fator R planejado.

### Cited Findings
- Alto risco pela combinação de dados de crianças e IA, com perda das flexibilizações de pequeno porte. [Res. CD/ANPD 2/2022](https://www.gov.br/palmares/pt-br/midias/arquivos-menu-acesso-a-informacao/legislacao/resolucao-cd-anpd-n2-2022.pdf)
- CNE: vedação de sugerir nota em dissertativas; validação humana documentada em objetivas; vedação de uso comercial de dados educacionais; 12 meses para adaptar contratos. [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- Senha pessoal e intransferível em SP e PR. [SED-SP](https://sed.educacao.sp.gov.br/PoliticaPrivacidadeAPP/Index); [Seed-PR](https://www.nre.seed.pr.gov.br/modules/qas/uploads/10457/edital_592022gsseed_concurso_de_remocao_qpm_e_qup_2022.pdf)
- CPCs da ANPD obrigatórias, sem alteração, desde 23/08/2025. [Lefosse](https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/)
- ANPD ativa em educação (SEED-PR, SEE-DF, procedimento edtech 2023) e em dados de crianças (multa de R$ 153,7 mi em 2026). [Convergência Digital](https://convergenciadigital.com.br/governo/anpd-exige-suspensao-imediata-do-tratamento-de-dados-biometricos-na-frequencia-escolar-no-parana/); [Daniel Law](https://www.daniel.com.br/pt/client-alert/anpd-aplica-multa-de-r-1537-milhoes-por-falhas-no-tratamento-de-dados-de-criancas-e-adolescentes/)

### Inferences
**Matriz de riscos (probabilidade × impacto, avaliação qualitativa do pesquisador)**

| Risco | Prob. | Impacto | Mitigação principal |
|---|---|---|---|
| Robô com senha na nuvem acessando SED/RCO | Alta (se adotado) | Crítico (PAD do professor, bloqueio, incidente com credenciais do Estado) | Não fazer. Extensão na sessão do professor, sem senha, com clique final humano |
| Erro de transcrição de nota ou falta (reprovação, Bolsa Família) | Média | Alto | Tela de conferência, validação de outliers, log, confirmação por lote, seguro RC/cyber |
| Dados de menores enviados a LLM nos EUA sem instrumento | Alta (default) | Alto | Pseudonimizar, CPCs ANPD, região Brasil, sem treino, retenção mínima/ZDR |
| SaaS vista como controladora (uso próprio de dados de alunos) | Média | Alto | Finalidade restrita no ToS, sem analytics, treino ou anúncios, DPA |
| Falta de encarregado, RIPD ou ROPA | Alta (startups) | Médio | Nomear encarregado, RIPD enxuto, ROPA |
| Feature de correção ou sugestão de nota | Média (pressão de mercado) | Alto (proibida pelo CNE em dissertativas) | Fora do escopo; objetivas só com fluxo documentado |
| Questões ENEM/vestibular reproduzidas | Média | Médio | Itens originais; referência e link às provas oficiais; sem textos-base de terceiros |
| ECA Digital (se houver interface de aluno) | Baixa hoje | Alto | Manter produto professor-only; reavaliar antes de módulo aluno |
| CDC (arrependimento, cancelamento) | Média | Baixo/médio | Reembolso 7 dias, cancelamento 1 clique, aviso de renovação |
| Tributário (MEI indevido, Anexo V) | Média | Médio | ME/SLU, CNAE 6203-1/00, Fator R, decisão sobre IBS/CBS 2027 com contador |

**Orçamento de compliance**: ordens de grandeza **não verificadas** nesta pesquisa, a cotar com fornecedores.
- Advogado digital/LGPD (ToS, Política de Privacidade, DPA-modelo, RIPD, revisão do fluxo de credenciais): pacote inicial na faixa de alguns milhares de reais.
- Encarregado (DPO) como serviço: mensalidade de centenas de reais, ou o próprio fundador com curso e assessoria pontual.
- Contador para ME no Simples: mensalidade de centenas de reais.
- Abertura de SLU e certificado digital e-CNPJ: custo baixo e único.
- Seguro cyber/RC profissional: a cotar.
- Infra (LLM com região Brasil ou ZDR, logs, criptografia): custo variável já no COGS.

O report-writer deve tratar esses valores como premissas e não como dados.

**Checklist mínimo antes do lançamento B2C**
1. CNPJ ME no Simples (não MEI).
2. ToS, Política de Privacidade e DPA (separando dados do professor e de alunos), aceite versionado.
3. Encarregado nomeado e canal publicado.
4. ROPA e RIPD.
5. CPCs ANPD ou região Brasil com o provedor de LLM, sem treino e com retenção mínima.
6. Pseudonimização de nomes antes do LLM.
7. Extensão sem custódia de senha, com tela de conferência e clique humano.
8. Plano de incidente (3 dias úteis; registro de 5 anos).
9. Logs de acesso por 6 meses (Marco Civil art. 15).
10. Reembolso em 7 dias e cancelamento online.
11. Rótulo "conteúdo gerado por IA, revise antes de usar".
12. Nenhuma feature de nota automática.

### Gaps
- Valores de mercado do orçamento não foram pesquisados (são estimativas a validar).
- Não há precedente específico da ANPD, da Justiça ou de corregedorias estaduais sobre ferramentas B2C que lançam dados no diário oficial em nome do professor. O risco jurídico do modelo de extensão é estimado por analogia e precisa de parecer de advogado. [ADVOGADO]
