# Sistemas de diário de classe eletrônico no Brasil e viabilidade de automação de lançamentos (estado em 12/nov/2026)

> Legenda: **[V]** = verificado lendo a fonte primária/oficial nesta pesquisa; **[S]** = fonte secundária (imprensa, sindicato, loja de apps, trabalho acadêmico) ou trecho de resultado de busca sem leitura integral; **[I]** = inferência minha. Datas antigas indicadas com o ano. Sites gov.br bloqueiam leitura automatizada com CAPTCHA ("This question is for testing whether you are a human visitor"), então documentos do MEC foram lidos só via trechos de busca.

## 1. Redes ESTADUAIS: qual sistema o professor usa (por UF), login, app/offline, barreiras

### Takeaway
Cada UF tem sistema próprio (desenvolvido pela secretaria ou pela empresa estadual de TI: Prodesp, Celepar, PROCERGS, CIASC, PRODAM etc.), sem API aberta ao professor. A tendência 2024-2026 é: app móvel com modo offline (BA, ES, AL, SP, PR, RS, AM, MS), prazos curtos de lançamento e, no maior mercado (SP), login gov.br com verificação em duas etapas obrigatória + geolocalização no módulo de frequência. Redes estaduais são, portanto, o segmento de maior custo/risco para automação de terceiros; SP é o caso mais difícil.

### Cited Findings

**São Paulo (SEDUC-SP) – Sala do Futuro Professor / SED**
- [V] Desde 03/02/2025 o Diário de Classe (Frequência, Registro de Aulas, Avaliação, Fechamento, Relatório, "Mapão", acesso do professor eventual) fica na **Sala do Futuro Professor** (https://saladofuturoprofessor.educacao.sp.gov.br). Login: "Entrar com o gov.br", CPF + senha gov.br; a SEDUC exige "a versão mais recente do aplicativo Gov.br, com a Verificação em Duas Etapas ativada. Esse requisito será obrigatório para o acesso à Sala do Futuro Professor." — [SEDUC-SP, Projeto Professor Presente + Sala do Futuro Professor (2025)](https://midiasstoragesec.blob.core.windows.net/001/2025/06/orientao-professor-presente-pagamento-2025.pdf)
- [V] Geolocalização: "Ao acessar o módulo de frequência, o navegador irá pedir permissão para acessar a localização do usuário. É de extrema importância que o usuário permita esse acesso ao navegador" — mesma fonte. A tela de frequência vem com todos os alunos marcados "C" (comparecimento) e o professor só clica nos que faltaram — mesma fonte.
- [V] Prazo: "Registro de frequência e conteúdo em 24h a partir de Março de 2025" — mesma fonte. Pré-requisitos para o diário funcionar: homologação da matriz, atribuição do professor, homologação do calendário e grade horária — mesma fonte.
- [V] (2024) Antes, o módulo frequência ficava aberto ao docente por 8 dias corridos, depois ao trio gestor e depois à supervisão; o diário existia na SED web e em apps iOS/Android com modo offline, mas "No modo offline do aplicativo Diário de Classe, permanece a visualização ... recomenda-se que o registro de aula seja feito na versão web ou no modo online do aplicativo"; o registro de aula passou a exigir escolher o "material digital" da aula, o que libera automaticamente a tarefa no Centro de Mídias (Tarefa SP) — [Comunicado 17/2024, DE Barretos, 28/03/2024](https://midiasstoragesec.blob.core.windows.net/001/2024/03/comunicado-17-24.pdf)
- [S] A frequência do diário alimenta o painel "Aluno Presente" da Secretaria até o nível da turma (2026) — [ABCdoABC](https://abcdoabc.com.br/frequencia-escolar-aumenta-em-sp/)

**Minas Gerais (SEE-MG) – DED+**
- [V] **DED+** (sucessor do Diário Escolar Digital – DED): conteúdo, avaliações e frequência; botão "Chamada do Dia" registra a chamada do dia com um clique (cliques para frequência caíram de 9 para 3); lista de turmas com pendências para fechar bimestre; migração gradual com DED antigo acessível; dados alimentam o app Minha Escola MG — [Agência Minas, novo diário](https://www.agenciaminas.mg.gov.br/noticia/educacao-apresenta-novo-diario-escolar-digital-a-rede-estadual-de-ensino/); [Agência Minas, novos perfis](https://www.agenciaminas.mg.gov.br/noticia/educacao-lanca-novos-perfis-de-acesso-para-o-diario-escolar-digital); [Agência Minas, Minha Escola MG](https://www.agenciaminas.mg.gov.br/noticia/aplicativo-minha-escola-mg-amplia-acesso-a-vida-escolar-dos-estudantes-da-rede-estadual-128922)

**Paraná (SEED-PR) – RCO / LRCO**
- [S] **RCO / Livro Registro de Classe Online** (web, SEED + Celepar) é o registro oficial de frequência, planos, conteúdos e avaliações (Resolução SEED 3550/2022); login com CPF + senha pessoal criada/recuperada na Central de Segurança do Governo do PR — [psicopedagogia.com.br, guia RCO](https://psicopedagogia.com.br/conteudo/rco-municipios-guia-completo-e-atualizado) (secundária)
- [S] Apps: **Escola Paraná – Professores** (oficial; sem acesso ao RCO o professor não tem algumas funções) — [Paraná.gov, serviço](https://www.parana.pr.gov.br/servicos/Educacao/Aplicativos/Instalar-o-aplicativo-Escola-Parana-Professores-lqNJmZox); **LRCO Paraná** na App Store, "mesmas funcionalidades do RCO/RCDIG web" — [App Store](https://apps.apple.com/br/app/id6498710410). **RCO+Aulas** = ferramenta de planejamento — [Paraná.gov](https://www.parana.pr.gov.br/Noticia/Professores-da-rede-estadual-aprovam-nova-ferramenta-de-planejamento)
- [S] PR usou reconhecimento facial para chamada (1.667 escolas; professor ajustava a lista); a **ANPD determinou a suspensão** desse uso para estudantes da rede estadual (data 04/08/2026 vem de uma única fonte) — [Tribuna PR](https://www.tribunapr.com.br/noticias/parana/anpd-suspende-reconhecimento-facial-estudantes-parana/); [Agência Pública, mar/2026](https://apublica.org/2026/03/reconhecimento-facial-sistema-monitora-alunos-no-brasil/)

**Rio de Janeiro (SEEDUC-RJ)**
- [S] Boletins do SEPE-RJ (mar/2026): "Diário Eletrônico: a Seeduc emitiu resolução revogando o Diário Eletrônico." — [SEPE, boletim rede estadual mar/2026](https://seperj.org.br/wp-content/uploads/2026/03/boletim_REDEESTADUALmar26b_rascunho.pdf); [SEPE, boletim nº 74](https://seperj.org.br/wp-content/uploads/2026/03/boletim_REDEESTADUAL74_redes2.pdf). Não achei número/data da resolução nem o que vale hoje.
- [S] A SEEDUC tem a plataforma **e-Rio** com a IA **ProfessorIA** (lançada abr/2024; 10 mil professores cadastrados em ago/2024) — apoio pedagógico, não diário — [Correio da Manhã, ago/2024](https://www.correiodamanha.com.br/rio-de-janeiro/2024/08/149198-governo-do-rio-investe-em-tecnologia-na-educacao.html). Sinal de concorrência estatal em "IA para professor".
- [I] ADEWEB/Edutec (usado pelo usuário num CEJA do RJ): não encontrei nenhuma documentação pública.

**Bahia (SEC-BA) – Diário de Classe Digital (SIGEduc)**
- [V/S] Módulo Portal do Professor/Diário Digital do **SIGEduc** (sigeduc.educacao.ba.gov.br), Portaria 187/2024; login e senha enviados ao e-mail cadastrado no RH Bahia; só o professor da turma lança no período de docência; menu Frequência ("Informar Frequência") e Notas ("Lançar Resultados") — [Manual Diário de Classe Digital 2024](https://enova.educacao.ba.gov.br/wp-content/uploads/2024/04/manual_de_diario_de_classe_digital.pdf); [FAQ 2024](https://enova.educacao.ba.gov.br/wp-content/uploads/2024/04/faq_diario.pdf); [Correio](https://www.correio24horas.com.br/minha-bahia/rede-estadual-de-ensino-na-bahia-tera-diario-de-classe-digital-0124). App com modo offline e mesmo login da web — [Manual do app, jul/2025](https://enova.educacao.ba.gov.br/wp-content/uploads/2025/07/manual_app_diario_classe_digital.pdf). Governo investiu ~R$ 20 mi em tablets e chips (out/2025) para uso do diário — [ba.gov.br](https://www.ba.gov.br/educacao/noticias/2025-10/2533/governo-da-bahia-investe-r-20-milhoes-na-entrega-de-novos-tablets-e-chips-nas)

**Ceará (SEDUC-CE) – SIGE Escola / Professor Online / Diário Online**
- [V] O **Diário Online** integra o **Professor Online** (módulo do SIGE Escola) desde mar/2016: plano, aulas, frequência, avaliações e notas; turmas aparecem após enturmação; lotação via SIGE Lotação — [SEDUC-CE, O que é o Diário Online](https://apistorage.seduc.ce.gov.br/paicidadecerta/wp-content/uploads/2025/11/03135600/Sige-lotacao-professor-online-O-que-e-o-diario-online-11.pdf); [Caderno Diário Online](https://apistorage.seduc.ce.gov.br/paicidadecerta/wp-content/uploads/2025/11/03135545/Sige-lotacao-professor-online-CADERNO-Diario-Online-3.pdf)

**Espírito Santo (SEDU-ES) – SEGES**
- [V] App **SEGES Professor**: lança notas e faltas, consulta diário, "online e offline", sincroniza ao reconectar; apps SEGES Responsáveis e SEGES Gestor — [ES.gov](https://www.es.gov.br/Noticia/sedu-lanca-novos-aplicativos-do-sistema-seges-para-responsaveis-professores-e-gestores); [ES.gov, procedimentos do Diário de Classe Digital](https://www.es.gov.br/Noticia/sedu-atualiza-procedimentos-para-uso-do-diario-de-classe-digital)

**Rio Grande do Sul (SEDUC-RS) – Escola RS Professor**
- [S] App **Escola RS – Professor** (PROCERGS, pacote br.com.procergs.tuaescola) para frequência e aproveitamento; também web em professor.escola.rs.gov.br; integrado ao ISE; login com usuário e senha — [AppGoblin](https://appgoblin.info/apps/br.com.procergs.tuaescola); [RS.gov](https://estado.rs.gov.br/ferramenta-permite-atualizar-cadastro-de-estudantes-pelo-aplicativo-escola-rs)

**Santa Catarina (SED-SC) – SISGESC / Professor Online**
- [S] **SISGESC** (CIASC) + **Professor Online** (fev/2015) + app **Professor SC** (nova versão jul/2019) — [ENLICSUL 2026](https://ns1.editorarealize.com.br/editora/anais/enlicsul/2026/6a187aab1766d_28052026142603.pdf); [UFFS 2019](https://rd.uffs.edu.br/bitstream/prefix/4598/1/MUELLER.pdf). Status 2026 não confirmado.

**Goiás (SEDUC-GO) – SIAP + SIGE**
- [V] Diário eletrônico no **SIAP – Sistema Administrativo e Pedagógico** (perfil professor: planejamento, diário, planos); **SIGE** para matrícula/modulação — [Portal Educa GO](https://portaleduca.educacao.go.gov.br/suporte_ti/siap-sistema-administrativo-e-pedagogico-2); [Diretrizes Operacionais 2025](https://goias.gov.br/educacao/wp-content/uploads/sites/40/2025/06/Diretrizes_Operacionais_UEs_SeducGO___2025___03_06.pdf)

**Pernambuco (SEE-PE) – SIEPE**
- [S] **SIEPE**; Portaria SEE 2790/2020 manda a gestão validar frequência no SIEPE e acompanhar "diários impressos ou eletrônicos" (2020) — [Portaria 2790/2020](https://www.normasbrasil.com.br/norma/portaria-2790-2020-pe_400900.html)

**Alagoas (SEDUC-AL) – SAGEAL**
- [S] App Android do **SAGEAL** liberado em 07/07/2026, mesmo login/senha da web, registra notas e frequência offline com sincronização; iOS em desenvolvimento — [Tribuna do Sertão, 03/07/2026](https://tribunadosertao.com.br/alagoas/2026/07/03/933599-aplicativo-para-android-facilita-notas-e-frequencia-de-professores-da-rede-estadual); [mai/2026](https://www.tribunadosertao.com.br/alagoas/2026/05/04/896423-seduc-moderniza-registro-digital-para-garantir-permanencia-estudantil-e-repasse-de-incentivos)

**Paraíba (SEE-PB) – SIAGE (e SIGEduc, 2017)**
- [S] Nota técnica (Portaria 648, nov/2024): "Garantir que todos os docentes tenham acesso ao SIAGE" para registro acadêmico — [SEE-PB](https://paraiba.pb.gov.br/diretas/secretaria-da-educacao/todos-editais/todos-editais-e-licitacoes/NOTATCNICAPortarian648de05denovembrode2024.pdf); diário online implantado em 2017 ligado ao SIGEduc — [UFPB](https://repositorio.ufpb.br/jspui/bitstream/123456789/36659/1/JanierysLouren%c3%a7oLinsAlbuquerque_Dissert.pdf)

**Rio Grande do Norte (SEEC-RN) – SIGEduc**
- [S] **SIGEduc** (www.sigeduc.rn.gov.br) com diário de classe, matrículas e indicadores — [UFPB, produção científica sobre SIGEduc](https://periodicos.ufpb.br/index.php/mpgoa/article/view/72578); [Tribuna do Norte](https://tribunadonorte.com.br/?p=51073)

**Amapá (SEED-AP) – SIGEduc**
- [S] "Portal do Professor – Lançamento de Frequência" no SIGEduc — [NTE/SEED-AP](https://nte.seed.ap.gov.br/faqsigeduc/portal_do_professor/PORTAL_DO_PROFESSOR_3_LANCAMENTO_DE_FREQUENCIA.pdf)

**Amazonas (SEDUC-AM) – SIGEAM / Diário Digital AM**
- [S] App **Diário Digital AM** "para uso dos docentes no lançamento de aulas" — [App Store](https://apps.apple.com/br/app/id1523901475); SIGEAM 2.0 (PRODAM) web + app — [PRODAM TR 2022](https://prodam.am.gov.br/wp-content/uploads/2022/01/10-Termo-de-Referencia-02.05.2022_ultimaversao.pdf)

**Pará (SEDUC-PA)** — [S] módulo "Acadêmico – Diário" (intranet) — [Manual do Diário](https://intranet.seduc.pa.gov.br/intranet/academico/manuais/ACADEMICO%20-%20DIARIO%20-%20Manual%20do%20Diario.pdf)
**Mato Grosso do Sul (SED-MS)** — [S] app **EducaMS Professor** — [App Store](https://apps.apple.com/us/app/id1485458365)
**Mato Grosso (SEDUC-MT)** — [S] **SigEduca** (dados migram para o SIGA) — [TCE-MT](https://www.tce.mt.gov.br/processo/documento/528366/2023/149965/2023); módulo do professor não confirmado.
**Distrito Federal (SEEDF)** — [S] i-Educar adquirido do Portal do Software Público e adaptado (artigo antigo) — [core.ac.uk](https://core.ac.uk/download/196901029.pdf); status 2026 não confirmado.
**Piauí** — [S] edital 2025 exige frequência "no diário de classe e na plataforma do Canal Educação" — [SEDUC-PI](https://www.pi.gov.br/wp-content/uploads/2025/03/edital-professores-redacao.pdf). **Maranhão** — [S] MP-MA recomendou (2019) implantar diário eletrônico — [MPMA](https://cdn-0.mpma.mp.br/publicacoes/10188/5c2b9f16c8bb00e70b5f4cd34245d9f5.pdf).

**Diretriz nacional (CIEB/Consed)**
- [V] Nota Técnica CIEB #26 (jun/2025): o sistema de frequência "deve funcionar offline e ser acessível via celular"; lançamento diário recomendado; relatórios de preenchimento; no diagnóstico CIEB/ISG/Consed 2023-2024, ~90% das redes estaduais que não tinham os 20 "habilitadores" avançaram em 2024 — [CIEB NT 26](https://cieb.net.br/wp-content/uploads/2025/06/CIEB-Notas-Tecnicas-26-Uma-gestao-pela-aprendizagem-habilitadores-de-apoio-a-evolucao-dos-sistemas-de-matricula-alocacao-de-professores-e-diario-de-classe-nas-redes-de-ensino.pdf)

### Inferences
- [I] SP (maior rede do país) só é automatizável por extensão no navegador do próprio professor, após ele fazer login gov.br com 2FA; robô em servidor é inviável. A geolocalização é do navegador: lançar fora da escola via automação deixa rastro de localização divergente — risco de compliance para o professor (o mesmo vale para lançamentos manuais fora da escola).
- [I] Sistemas "SIGEduc" (BA, RN, AP, PB-2017) parecem compartilhar a mesma família (origem UFRN/SINFO, como SIGAA) — um conector para essa família poderia servir a vários estados. Não verificado.
- [I] A migração para apps offline desloca o hábito do professor para o celular; as versões web continuam existindo (SP, MG, PR, BA, CE, ES, RS, AL), preservando a rota da extensão Chrome, mas o produto deveria prever também uma "lista de lançamento" para o professor conferir/colar no app.
- [I] Prazo de 24h (SP) e 8 dias (SP-2024) favorecem um assistente que lança no mesmo dia por voz.

### Gaps
- RJ: número da resolução que revogou o diário eletrônico (2026) e qual o procedimento atual; ADEWEB/Edutec sem documentação pública.
- Sem confirmação do sistema atual em SE, TO, RO, AC, RR, MA, PI (sistema próprio), MT (módulo professor), DF (2026), SC (2026).
- Método de login (gov.br? CAPTCHA?) não confirmado para a maioria dos estados além de SP (gov.br+2FA), PR (Central de Segurança), BA (login/senha por e-mail), AL (login/senha web), RS (usuário/senha).

## 2. Redes MUNICIPAIS: sistemas, fornecedores, i-Educar/i-Diário, MEC Gestão Presente

### Takeaway
O segmento municipal (5.570 redes) é uma cauda longa de fornecedores; os dois "padrões" que cobrem muitos municípios com o mesmo software são o **i-Educar/i-Diário** (Portabilis, software livre, com API REST v2 — mas o token é por instalação, não por professor) e o novo **GPE – Gestão Presente na Escola** do MEC (gratuito, login gov.br, 800 redes selecionadas em 2025, com diário digital e app offline de frequência). Capitais têm sistemas próprios (SME-SP: SGP; Rio: SGA + app DiáRio).

### Cited Findings
- [V] **i-Diário** = "Portal do professor integrado com o software livre i-Educar" (Portabilis) — [GitHub portabilis/i-diario](https://github.com/portabilis/i-diario)
- [V] Rotas `api/v2` do i-Diário: `daily_frequencies` (create/index), `daily_frequency_students#update_or_create`, `content_records` (index, `sync`, `lesson_plans`), `teacher_classrooms`, `teacher_disciplines`, `classroom_students`, `lesson_plans`, `teaching_plans`, `school_calendars`, `exam_rules` — [config/routes.rb](https://github.com/portabilis/i-diario/blob/main/config/routes.rb). Não há rota v2 de escrita de notas (apenas frequência e conteúdo).
- [V] Autenticação da API v2: header `token` comparado com `IeducarApiConfiguration.current.api_security_token` (um segredo por instalação/entidade) ou `Authorization: Bearer` igual a `AUTH_TOKEN` global — [api/v2/base_controller.rb](https://github.com/portabilis/i-diario/blob/main/app/controllers/api/v2/base_controller.rb); [application_controller.rb](https://github.com/portabilis/i-diario/blob/main/app/controllers/application_controller.rb). O controller de frequência identifica o professor por `user_id`/`teacher_id` enviados na requisição.
- [V] i-Educar (Laravel 13) traz `google/recaptcha` como dependência — [composer.json](https://github.com/portabilis/i-educar/blob/master/composer.json); i-Diário usa Devise para login web — [Gemfile](https://github.com/portabilis/i-diario/blob/main/Gemfile)
- [S] **MEC Gestão Presente** (Portaria MEC 234, 02/04/2025): módulos **SGP – Sistema Gestão Presente** (plataforma de dados) e **GPE – Gestão Presente na Escola** (gestão escolar gratuita, adesão voluntária via Simec: matrícula, enturmação, alocação de professores e "um diário de classe digital que facilita o registro de frequência, notas e conteúdos") — [Portaria MEC 234/2025](https://abmes.org.br/arquivos/legislacoes/Portaria-mec-234-2025-04-02.pdf); [Guia GPE](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/GuiaGestoPresenteEscola_compressed.pdf); [Undime](https://undime.org.br/fique-atento/4/)
- [S] GPE é acessado com **login gov.br** em gpe.gestaopresente.mec.gov.br após adesão; perfis por responsabilidade; material do MEC cita "Aplicativo offline para registro de frequência: mesmo sem conexão à internet, os professores podem registrar..." — [MEC, ações iniciais GPE](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/aesiniciaisGPE.pdf); [MEC Gestão Presente](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/mec-gestao-presente.pdf)
- [S] Jul/2025: MEC selecionou **800 redes municipais** para implementação do GPE (prioridade a municípios pequenos/médios e com maior abandono nos anos finais) — [Radar Digital Brasília](https://radardigitalbrasilia.com.br/educacao/mec-seleciona-800-municipios-para-o-gestao-presente-na-escola/)
- [S] O SGP do MEC recebe dados das redes por **planilha (.csv/.xlsx)** ou **API** (redes com sistema próprio; requer ofício ao MEC; API Key por cliente; Swagger em `/v1/documentation`; hosts `api-cmde.hmg.gestaopresente.mec.gov.br` e `api-cmde.gestaopresente.mec.gov.br`); frequência mensal de estudantes do EM entre os dados exigidos; janelas de envio 2026: 19/01–06/02 e 10/02–06/03 — [MEC, dados via API](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/dadosapi.pdf); [Cartilha API](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/cartilhausoapimecgestaopresente.pdf); [Guia de dados](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/guiadados.pdf). É API rede→MEC, não professor→diário.
- [S] **São Paulo capital (SME-SP)**: **SGP – Sistema de Gestão Pedagógica** (novosgp.sme.prefeitura.sp.gov.br) substituiu o diário em papel (frequência, notas/conceitos, avaliações, observações, planos); não permite lançar fora do período de frequência do aluno; suporte da SME cobre SGP, SGA e Conecta — [Manual SGP ABAEs 2025](https://acervodigital.sme.prefeitura.sp.gov.br/wp-content/uploads/2025/09/Manual_SGP_ABAEs_2025.pdf); [Prefeitura SP](https://prefeitura.sp.gov.br/w/noticia/educacao-sistema-de-gestao-pedagogica-ganha-novas-funcionalidades); [Manual SME](https://manual.sme.prefeitura.sp.gov.br/pt-br/Procedimentos/Infraestrutura_e_Tecnologia/SuporteSME)
- [S] **Rio de Janeiro capital (SME-Rio)**: frequência lançada diariamente no app **DiáRio** ou na função frequência do **SGA** — [Circular CAV 07, 2º COC 2026](https://educacao.prefeitura.rio/wp-content/uploads/sites/42/2026/07/Circular-CAV-no-07-2o-COC-2026.pdf); [Circular CAV 03, 2025](https://educacao.prefeitura.rio/wp-content/uploads/sites/42/2025/09/CIRCULAR-CAV-no-03-1o-COC-2025.pdf)
- [S] Outros exemplos: Macaé/RJ usava **e-cidade** para notas e faltas (2016) — [Macaé](https://macae.rj.gov.br/midia/conteudo/arquivos/1472156250.pdf); Aracaju usa **SIGED** (login CPF, senha inicial = CPF, escola redefine senha) — [wiki Aracaju](https://wiki.educacao.aju.br/books/siged-professores/chapter/acesso-ao-sistema/export/pdf); Olinda lançou app de diário mobile e offline — [Olinda](https://olinda.pe.gov.br/olinda-da-mais-um-passo-importante-na-modernizacao-da-rede-municipal-de-ensino/?pdf=92121); Manaus (Semed) diário digital desde 2021 — [Informe Manaus](https://informemanaus.com/2021/diario-digital-sera-implantado-na-rede-municipal-de-ensino); PR oferece "RCO Municípios" a prefeituras — [psicopedagogia.com.br](https://psicopedagogia.com.br/conteudo/rco-municipios-guia-completo-para-gestao-municipal); app genérico "App do Professor – SGE" na App Store — [App Store](https://apps.apple.com/br/app/app-do-professor-sge/id1666263103)

### Inferences
- [I] i-Diário é o melhor alvo municipal: mesmo código em todas as instalações (Rails/Devise, UI estável), então um conector de UI serve a muitos municípios. A API v2 seria ideal (frequência + conteúdo ministrado), mas exige que a prefeitura forneça o token da instalação — rota B2G (parceria com a secretaria), não B2C.
- [I] O GPE do MEC pode virar o "sistema único" de centenas de municípios pequenos; como usa gov.br, deve ter as mesmas barreiras de SP (gov.br; 2FA possível). Monitorar.
- [I] Cauda longa: cada fornecedor municipal (Betha, IPM, e-cidade, SIGED, sistemas próprios) exige conector próprio; priorizar por número de professores atendidos.

### Gaps
- Sem número oficial atualizado de municípios com i-Educar/i-Diário (site da Portabilis retornou 403); sem dados de participação de Betha, IPM, Fly, GEO, Soluções Públicas, Educar Web, Sigeduc municipal.
- Não confirmei se o app do GPE é próprio, se exige 2FA, nem se o GPE expõe API de escrita.

## 3. Escolas PRIVADAS: ERPs, APIs/marketplaces, participação

### Takeaway
Mercado fragmentado e consolidando-se em grupos (TOTVS+Sponte; Arco/isaac+Activesoft+ClassApp; Layers como "hub"). Nenhum fornecedor privado pesquisado publica API aberta e documentada para o professor escrever notas/frequência; TOTVS Educacional/RM é o único com web services oficiais documentados (TBC/wsDataServer), mas eles exigem credenciais/infra da instituição. Na prática, a rota para o professor individual é automação da UI web (como o usuário já faz em Unimestre e Activesoft).

### Cited Findings
- [V] **TOTVS Educacional (RM)**: frequência diária gravável via TBC com o web service `wsDataServer` e o dataserver `EduFrequenciaDiariaWSData` (tabela SFREQUENCIA) — [TDN, Digitação de Frequência Diária através do TBC](https://tdn.totvs.com/download/attachments/234611462/Digita%C3%A7%C3%A3o%20de%20Frequ%C3%AAncia%20Di%C3%A1ria%20atrav%C3%A9s%20do%20TBC.pdf?api=v2); integração SESI LMS envia notas e frequências via Web Services TOTVS — [TDN, LMS SESI](https://tdn.totvs.com.br/download/attachments/533748328/Especifica%C3%A7%C3%A3o%20Anexo%20I%20-%20Detalhamento%20Funcional%20-%20LMS%20SESI.pdf?api=v2); projeto SENAI com API REST + OAuth 2.0 ("Cada SGE receberá um usuário e senha para autenticação e obtenção do token") — [TDN, FS007614](https://tdn.totvs.com.br/download/attachments/419529746/Especificacao%20Anexo%20I%20-%20Detalhamento%20Funcional%20-%20FS007614.pdf?api=v2); Portal do Professor (Corpore.net) com lançamento manual de frequência/notas no "Diário de Classe" — [Manual Portal Professores RM, 05/2024](https://portal.fbnovas.edu.br/Corpore.net/%5BMANUAL%5D%20EDUCACIONAL%20-%20PORTAL%20PROFESSORES%20-%20ATT%2005-24.pdf); TOTVS Classis Ensino Básico tem exportar diário para Excel e importar planilha (na área da secretaria) — [TDN Como Fazer Classis](https://tdn.totvs.com/download/attachments/4814795/Como%20Fazer%20TOTVS%20-%20v%201120%20Importa%C3%A7%C3%A3o-Exporta%C3%A7%C3%A3o%20-%20Classis%20Ensino%20B%C3%A1sico.pdf?api=v2)
- [S] **Sponte** → "Sponte by TOTVS" (adquirida junto com a Linx); educação básica, idiomas, cursos livres; ">70.000 clientes no Brasil e América Latina"; Bett Brasil 2026 — [Portal ERP](https://portalerp.com/br/noticia/sponte-by-totvs-lanca-solucao-que-leva-inteligencia-de-dados-para-a-gestao-de-instituicoes-de-ensino); [Bett 2026](https://brasil.bettshow.com/en/releases-expositores-2027/totvs-reforca-estrategia-para-o-setor-educacional-com-novidades-na-bett-brasil-2026). API pública não encontrada.
- [S] **Layers Education**: hub "neutro" que integra edtechs e ERPs (>20 sistemas de gestão integrados, sincronização ERP→app), >9 mil instituições e ~3,5 mi alunos; fundo de M&A de R$ 5 mi para integradores; parceria com Clever — [startups.com.br](https://startups.com.br/negocios/edtech/layers-cria-fundo-de-mas-com-r-5-milhoes-para-consolidar-edtechs/); [Suno](https://www.suno.com.br/noticias/?p=201976); [startups.com.br, Clever](https://startups.com.br/negocios/edtech/layers-se-une-a-clever-para-apoiar-escolas-e-edtechs-latinas/). Documentação técnica pública não encontrada.
- [S] **Activesoft** (fundada 1999) e **ClassApp** (>1.300 escolas, 1 mi usuários) aparecem como marcas do grupo **isaac**; uma vaga descreve Activesoft como empresa do **Grupo Arco Educação** — [Greenhouse isaac](https://job-boards.greenhouse.io/isaac/jobs/5478186004); [Greenhouse isaac, ClassApp](https://job-boards.greenhouse.io/isaac/jobs/5401636004); [B2B Stack](https://www.b2bstack.com.br/compare/activesoft-vs-gestao-escolar). Reclamações no Reclame Aqui sobre atualizações/suporte — [Reclame Aqui](https://www.reclameaqui.com.br/activesoft/suporte-tecnico-editado-pelo-reclame-aqui-e-sistema-muito-ruim-apos-atualizacoes-activesoft_YvwdpoinwihGt3Qm/). Sem API pública encontrada.
- [S] **SophiA** (Primasoft, 1993) — [B2B Stack](https://www.b2bstack.com.br/compare/sophia-vs-gestao-escolar); **Gennera** (app iOS oficial) — [App Store](https://apps.apple.com/br/app/gennera/id1518802450); **Proesc** em listas de "melhores sistemas" — [NFE.io](https://nfe.io/blog/gestao-empresarial/sistema-escolar/). APIs públicas não encontradas para Gennera, Proesc, Sophia, Unimestre, Activesoft.
- [S] Unimestre: única extensão Chrome pública encontrada é de aluno (Unimestre+, 7 usuários, 2023) — [Chrome Web Store](https://chromewebstore.google.com/detail/hhahiccgoigkbonplidkebpleehnggen)

### Inferences
- [I] Para escolas privadas, a parceria B2B (escola libera integração/credencial institucional ou o hub Layers) é o caminho "limpo"; para o professor individual, UI automation. A escola privada tende a ser mais tolerante que o Estado, mas o contrato escola–fornecedor pode restringir acesso automatizado (não verificado).
- [I] Priorização sugerida (por volume de professores × homogeneidade da UI): TOTVS RM/Educacional (grandes redes e IES privadas, UI Corpore.net padronizada), Sponte, Activesoft/isaac, Proesc, Sophia, Gennera, Unimestre.

### Gaps
- Não encontrei ranking/market share confiável de ERPs escolares privados (nem dados do Censo sobre software). Sem documentação pública de API da Sponte, Proesc, Gennera, Sophia, Activesoft, Unimestre, Lyceum, Galileu, WPensar, Perseus, iScholar — não significa que não existam APIs privadas sob contrato.

## 4. Ensino SUPERIOR: SIGAA, SUAP, Q-Acadêmico, TOTVS, LMS

### Takeaway
LMS globais têm APIs oficiais e documentadas para notas (Canvas e Moodle com escrita direta; Google Classroom com restrição forte: só altera notas de atividades criadas pelo próprio projeto). SUAP tem API OAuth2 institucional; SIGAA não tem API pública de escrita documentada. O diário oficial (nota final/frequência) quase sempre só se escreve pela UI web — mas SIGAA, SUAP e Moodle oferecem importação por planilha/integração Moodle→sistema acadêmico em algumas instituições.

### Cited Findings
- [V] **Google Classroom API**: notas via `courses.courseWork.studentSubmissions.patch`, `updateMask` só `draftGrade`/`assignedGrade`; escopos `classroom.coursework.students` ou `classroom.coursework.me`; "This request must be made by the Developer Console project" que criou o courseWork, senão `PERMISSION_DENIED` — [Classroom reference](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/patch); a API não lê/escreve a nota final do curso e não grava rubricas — [Classroom, Manage grades](https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades)
- [V] **Canvas REST**: `PUT /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id` (`submission[posted_grade]`) e `POST .../submissions/update_grades` (lote); token Bearer; "the user must have permission to manage grades" — [Canvas Submissions API](https://canvas.instructure.com/doc/api/submissions.html)
- [V] **Moodle Web Services**: `core_grade_update_grades` (2.7), `core_grades_get_grades` (2.7), `mod_assign_save_grade(s)` (2.6/2.7), `gradereport_user_get_grades_table` (2.9), `core_grades_grader_gradingpanel_point_store` (3.8) — [Moodle dev docs](https://docs.moodle.org/dev/Web_service_API_functions); importação de notas por CSV no gradebook (permissões `moodle/grade:import` e `gradeimport/csv:view`) — [Moodle docs, Grade import](https://docs.moodle.org/403/en/Grade_import). Frequência depende do plugin mod_attendance (não verificado).
- [S] **SUAP** (Institutos Federais): API com OAuth2 (authorization code), registro de aplicação em https://suap.ifrn.edu.br/api/ — [material de aula IFRN](https://dvcirilo-ifrn.github.io/pos/build/aula13.pdf); professor lança conteúdo, frequência, notas e plano no módulo Ensino — [Manual SUAP Módulo Professor, IFTO 2024](https://campusparaiso.ifto.edu.br/blog/cgti/wp-content/uploads/sites/9/2024/05/Manual-Suap-Modulo-Professor.pdf); "Meus Diários" permite baixar planilha do diário/notas — [IF Baiano 2025](https://www.ifbaiano.edu.br/unidades/urucuca/files/2025/01/SUAP-Modulo-Meus-Diarios.pdf); IFRN descreve exportar notas do livro de notas (Moodle) direto para o SUAP — [AVA IFRN](https://aberto.ava.ifrn.edu.br/mod/resource/view.php?id=633); prazo vencido bloqueia registros no diário — [IFAC](https://wiki.ifac.edu.br/sistemas/suap/edu/guia_para_virada_de_periodo)
- [S] **SIGAA**: "Portal do Docente → Ensino → Turmas → Cadastrar Notas" ou "Turma Virtual → Alunos → Lançar Notas" — [STI/UFPB](https://conhecimento.sti.ufpb.br/books/turmas/export/pdf); [UnB 2025](https://portalsig.unb.br/wp-content/uploads/2025/02/manual_docente_abaensino.pdf); UFABC: "Exportar Planilha" → preencher → "Importar Planilha" para conceitos — [UFABC tutorial](https://prograd.ufabc.edu.br/pdf/tutorial_lancamento_conceitos_sigaa.pdf); IFSC importa notas finais do Moodle para o SIGAA — [IFSC](https://ifsc.kaptiva.com.br/mod/resource/view.php?id=231356). Não achei API pública de escrita do SIGAA.
- [S] **Q-Acadêmico** (IF Goiano, IFPE) — manual do professor "Acadêmico Web" — [IF Goiano](https://sistemas.ifgoiano.edu.br/manuais-ifgoiano/qacademico/manuais/atuais/Manual_Academico_Web%20-%20Professor.pdf); [IFPE 2026](https://portal.ifpe.edu.br/ead/wp-content/uploads/sites/15/2026/07/Tutorial-Q-Academico_.pdf)
- [S] Outros portais de IES privadas: SOLIS (UNAR, 2025) — [UNAR](https://www.unar.edu.br/wp-content/uploads/2025/04/Guia%20de%20acesso%20ao%20Portal%20do%20Professor%20SOLIS%20-%20vers%C3%A3o%201%20-%2022012025.pdf); TOTVS RM Corpore.net — ver seção 3.

### Inferences
- [I] Classroom: o SaaS só consegue lançar notas em atividades que ele mesmo criou via API — então o fluxo "lance as notas do teste" funciona se o teste for criado pelo SaaS; para atividades criadas manualmente pelo professor, não.
- [I] Canvas e Moodle (token do próprio professor, se o admin habilitar web services/tokens) são as integrações de menor esforço e risco do catálogo, mas o diário "oficial" de IES costuma ser SIGAA/SUAP/TOTVS/Lyceum, não o LMS.

### Gaps
- Lyceum (Techne), Sagres, Gennera (IES), Perseus, SOLIS: não encontrei documentação de API. Se a API SUAP expõe escrita de notas/frequência do diário: não verificado (página de documentação não lida). Canvas CSV import e Google Classroom import de notas: não verificados nesta pesquisa.

## 5. Viabilidade técnica por classe de sistema; relatos públicos de automação; catálogo com rating

### Takeaway
Já existem extensões Chrome de nicho que preenchem diários oficiais a partir de CSV (UFMG, portal acadêmico no CE, SED-SP, SIAGE-PB), todas com base pequena de usuários — o modelo "extensão no navegador do professor, com o professor logado" é o padrão de fato e o mais defensável. Nenhuma API oficial aberta a professor existe nas redes públicas; obstáculos crescentes: gov.br+2FA (SP, GPE), geolocalização (SP), prazos curtos, CAPTCHA (i-Educar tem reCAPTCHA), apps offline.

### Cited Findings
- [V] **CSV Grade Filler – UFMG**: "Fills forms on the Diario de Classe website using CSV files" (notas e frequência), 23 usuários, v1.18 de 08/07/2026 — [Chrome Web Store](https://chromewebstore.google.com/detail/csv-grade-filler-ufmg/bbipopfmfkmmekbaijkpnajpailajgld)
- [V] **Notas no Sistema**: "faz o lançamento automatizado das notas no sistema do portal acadêmico" (desenvolvedor ligado a faculdade do CE), 47 usuários, 5,0 (6 avaliações), v2.0 de 26/04/2026 — [Chrome Web Store](https://chromewebstore.google.com/detail/notas-no-sistema/fodmedhagnhbnbnjgnfmmdaifljlecpl)
- [S] Extensão da **EduTIC Software** para envio de notas e frequência à **SED-SP** via Chrome (sem avaliações; página não carregou para leitura direta) — [Chrome Web Store](https://chrome.google.com/webstore/detail/gpcanajjajecfookhifojdabdcjbejde)
- [S] Extensões para o **SIAGE (PB)**, ex. "SIAGILIZE" (preenche notas, automatiza/valida/exporta dados do diário) — via resultados de busca na Chrome Web Store; não verificado diretamente.
- [S] Análogos estrangeiros: "Siged Carga de Notas" (Uruguai, CSV), "Importador de Notas Mined" (El Salvador) — [chromeboard](https://chromeboard.com/extension/siged-carga-de-notas-bpahhlhmhiemophimkghldkpiioldnei); [chromeboard](https://chromeboard.com/extension/importador-de-notas-mined-pjdakeeclfpkheobgmenlonbbpmokbbh)
- [S] Não achei repositório GitHub público de robô para SED, RCO ou i-Diário; o mais próximo é TCC da Fatec com Selenium para o SIGA (notificações a alunos) — [Fatec/CPS](https://ric.cps.sp.gov.br/bitstream/123456789/29803/1/ads_2024_2_marcosgasparinijunior_autosiga.pdf)
- [V] Barreiras confirmadas: SP gov.br + 2FA obrigatório, geolocalização no navegador e prazo 24h (seção 1); i-Educar com reCAPTCHA (seção 2); Classroom limitado ao projeto criador (seção 4); SUAP bloqueia diário após prazo (seção 4).
- [S] Fiscalização de dados escolares: ANPD suspendeu reconhecimento facial para frequência no PR (2026) — [Tribuna PR](https://www.tribunapr.com.br/noticias/parana/anpd-suspende-reconhecimento-facial-estudantes-parana/) — sinal de que a ANPD atua sobre tratamento de dados de alunos em redes públicas.

### Inferences

#### Escala de rating (inferida)
- **A** = API oficial documentada que o próprio professor pode autorizar (OAuth/token pessoal). Esforço: baixo (dias). Risco: baixo.
- **B** = API/web service/importação oficial, mas liberada pela instituição/rede (B2B/B2G). Esforço técnico baixo-médio; esforço comercial alto.
- **C** = UI web automatizável no navegador do professor (login manual; sem 2FA/geo/CAPTCHA conhecidos). Esforço: ~1-3 semanas por sistema + manutenção contínua a cada mudança de UI (estimativa, sem fonte).
- **D** = UI web com barreiras fortes (gov.br+2FA, geolocalização, CAPTCHA, prazo curto). Só extensão com o professor presente; risco de compliance.
- **E** = só app móvel/offline sem web conhecida. Impraticável sem engenharia reversa (não recomendado).

#### Catálogo consolidado
| Sistema | Segmento / quem usa | Login do professor | API oficial | Web/App/Offline | Barreiras | Rating |
|---|---|---|---|---|---|---|
| Sala do Futuro Professor / SED (SP) | Rede estadual SP | gov.br + 2FA obrigatório | Não | Web + apps (offline só visualização, 2024) | 2FA, geolocalização, prazo 24h | D |
| DED+ (MG) | Rede estadual MG | não confirmado | Não | Web (+ Minha Escola MG p/ famílias) | desconhecidas | C? |
| RCO/LRCO (PR) | Rede estadual PR (+ RCO Municípios) | CPF + senha Central de Segurança PR | Não | Web + apps Escola Paraná/LRCO | desconhecidas | C |
| SIGEduc Diário Digital (BA; também RN, AP) | Redes estaduais | login/senha (BA: por e-mail do RH) | Não | Web + app offline (BA) | desconhecidas | C |
| Professor Online / Diário Online (CE) | Rede estadual CE | não confirmado | Não | Web | desconhecidas | C |
| SEGES (ES) | Rede estadual ES | não confirmado | Não | Web + app offline | desconhecidas | C |
| Escola RS Professor (RS) | Rede estadual RS | usuário/senha | Não | Web + app | desconhecidas | C |
| SAGEAL (AL) | Rede estadual AL | login/senha web | Não | Web + app Android offline (2026) | desconhecidas | C |
| SIAP (GO), SIEPE (PE), SIAGE (PB), SISGESC (SC), Diário Digital AM, EducaMS, Acadêmico-Diário (PA) | Redes estaduais | não confirmado | Não | variados | desconhecidas | C/E (verificar) |
| SEEDUC-RJ (diário eletrônico revogado em 2026, segundo SEPE) / ADEWEB-Edutec (CEJA) | Rede estadual RJ | não confirmado | Não | — | situação normativa incerta | C (ADEWEB já automatizado pelo usuário) |
| i-Diário / i-Educar (Portabilis) | Muitos municípios (número não confirmado) | usuário/senha (Devise) | Sim, API v2 com token por instalação (frequência + conteúdo) | Web + app | reCAPTCHA no i-Educar | B (API) / C (UI) |
| GPE – Gestão Presente na Escola (MEC) | 800 municípios selecionados (2025) | gov.br | Não para professor (SGP tem API rede→MEC) | Web + app offline de frequência (citado) | gov.br (2FA possível) | D (monitorar) |
| SGP SME-SP | Rede municipal de SP | não confirmado | Não | Web | desconhecidas | C |
| SGA + DiáRio (SME-Rio) | Rede municipal do Rio | não confirmado | Não | Web (SGA) + app DiáRio | desconhecidas | C |
| TOTVS Educacional / RM (Portal do Professor Corpore.net) | IES privadas, grandes redes privadas, SESI/SENAI | login do portal | Sim (TBC/wsDataServer SOAP; REST em projetos) – institucional | Web | credencial institucional | B (inst.) / C (UI) |
| Sponte by TOTVS | Escolas pequenas/médias, idiomas, cursos livres | login do sistema | Não encontrada | Web + apps | — | C |
| Activesoft (grupo isaac/Arco) | Escolas privadas | login (páginas ASP legadas, segundo o usuário) | Não encontrada | Web + app Agenda | — | C (já automatizado pelo usuário) |
| Unimestre | Escolas privadas / IES (SC) | login web | Não encontrada | Web | — | C (já automatizado pelo usuário) |
| Proesc, Sophia, Gennera, Lyceum, iScholar, WPensar | Escolas/IES privadas | login web | Não encontrada | Web + apps | — | C |
| Layers Education (hub) | >9 mil instituições | — | Integrações com >20 ERPs (sem doc pública) | App | parceria | B (parceria) |
| SIGAA | Universidades federais | login institucional | Sem API pública de escrita encontrada | Web | prazos de consolidação | C (+ importação por planilha em algumas IES) |
| SUAP | Institutos Federais | login institucional | API OAuth2 (escrita de diário não verificada) | Web | bloqueio após prazo | B/C |
| Q-Acadêmico | IFs (IF Goiano, IFPE) | login web | Não encontrada | Web | — | C |
| Moodle | IES, redes | token do usuário (se habilitado) | Sim (`core_grade_update_grades`, `mod_assign_save_grades`) | Web/app | admin precisa habilitar WS | A/B |
| Canvas | IES privadas | token Bearer / OAuth | Sim (submissions, update_grades) | Web/app | — | A |
| Google Classroom | Muitas redes e escolas | OAuth Google | Sim, mas só em courseWork criado pelo próprio projeto | Web/app | restrição de projeto | A (limitado) |

- [I] Ordem sugerida de suporte: (1) LMS com API (Classroom, Moodle, Canvas) para ganhos rápidos; (2) sistemas já automatizados (Unimestre, Activesoft, ADEWEB) como prova; (3) i-Diário (muitos municípios com mesma UI); (4) TOTVS RM Portal do Professor (padronizado entre muitas IES/escolas); (5) estaduais sem 2FA e com web estável (PR RCO, MG DED+, BA/RN SIGEduc, CE, ES, RS, AL, GO); (6) SP Sala do Futuro por último (2FA+geo).
- [I] Arquitetura defensável: extensão de navegador que age na sessão já aberta pelo professor, mostrando prévia e exigindo confirmação antes de "salvar"; nunca armazenar senha gov.br nem rodar em servidor.

### Gaps
- Não encontrei casos públicos de secretaria punindo professor por automação ou por compartilhar credenciais (busca sem resultados relevantes). Não verifiquei anti-bot (WAF, rate-limit) de nenhum sistema estadual na prática. Estimativas de esforço são inferências sem fonte.

## 6. Termos de uso: compartilhamento de credenciais e acesso automatizado

### Takeaway
Não encontrei os termos de uso específicos da SED/Sala do Futuro, RCO ou SEEDUC. As cláusulas encontradas (gov.br e plataformas educacionais estaduais) dizem que a senha é "pessoal e intransferível" e que as credenciais "só poderão ser utilizadas pelo usuário cadastrado"; não achei cláusula expressa sobre robôs/acesso automatizado. Isso torna inviável (juridicamente arriscado) qualquer modelo em que o SaaS guarde senha do professor; o modelo em que o professor faz o login e a automação roda na sessão dele é o menos exposto.

### Cited Findings
- [S] Portal gov.br, termos de uso: "As credenciais de acesso (login e senha) só poderão ser utilizadas pelo usuário cadastrado." — [gov.br, Termos de Uso](https://www.gov.br/pt-br/termos-de-uso); orientação gov.br: guardar a senha "com o mais absoluto sigilo" — [gov.br, cuidados com a conta](https://www.gov.br/gestao/pt-br/assuntos/editoria-2013-defeso-eleitoral/cuidados-que-voce-precisa-ter-com-sua-conta-gov.br)
- [S] Participa+ Brasil: senha "pessoal e intransferível, não sendo possível, em qualquer hipótese, a alegação de uso indevido, após o ato de compartilhamento" — [gov.br Participa+](https://www.gov.br/participamaisbrasil/termo-de-uso-e-politica-de-privacidade)
- [S] Alagoas, sistema de abandono escolar da SEDUC-AL: senha "de uso pessoal e intransferível" — [SEDUC-AL, termos de uso](https://abandonoescolar.educacao.al.gov.br/termos-de-uso)
- [S] Bahia: professor substituto recebe acesso formal ao Diário Digital pelo período em que for responsável pela turma (acesso vinculado à pessoa designada) — [FAQ Diário Digital BA 2024](https://enova.educacao.ba.gov.br/wp-content/uploads/2024/04/faq_diario.pdf)
- [S] Aracaju (SIGED): login = CPF do professor; a escola pode redefinir a senha — [wiki Aracaju](https://wiki.educacao.aju.br/books/siged-professores/chapter/acesso-ao-sistema/export/pdf)
- [V] SP: lançamentos de frequência ficam associados a geolocalização e ao login gov.br com 2FA (seção 1) — mecanismo técnico de responsabilização individual.

### Inferences
- [I] Guardar senha do professor no servidor do SaaS violaria literalmente a cláusula gov.br e cláusulas "pessoal e intransferível"; extensão na sessão do próprio professor (ele digita a senha e aprova) é a interpretação mais defensável, mas não há precedente público confirmando que é permitido.
- [I] O professor continua juridicamente responsável pelo que é lançado; o produto precisa de prévia + confirmação + log.

### Gaps
- Textos integrais dos termos da SED/Sala do Futuro (SP), RCO (PR, Resolução 3550/2022), SEEDUC-RJ, SIGEduc-BA não localizados; nenhum caso público de punição por automação/compartilhamento de credenciais encontrado.

## 7. Sistemas com importação de notas/frequência por planilha (CSV/XLS)

### Takeaway
Importação por planilha existe principalmente em sistemas de IES/LMS e em funções de secretaria, raramente no perfil do professor de rede pública. É um caminho barato onde existe: o SaaS gera o arquivo no formato exato e o professor faz o upload.

### Cited Findings
- [V] **Moodle**: importação de notas por CSV no gradebook (exportar, editar, importar; mapeamento de colunas; permissões `moodle/grade:import` e `gradeimport/csv:view`) — [Moodle docs, Grade import](https://docs.moodle.org/403/en/Grade_import)
- [S] **SIGAA** (UFABC, conceitos): "Exportar Planilha" → preencher → "Importar Planilha" — [UFABC](https://prograd.ufabc.edu.br/pdf/tutorial_lancamento_conceitos_sigaa.pdf); IFSC importa notas finais do Moodle para o SIGAA — [IFSC](https://ifsc.kaptiva.com.br/mod/resource/view.php?id=231356). Varia por instituição.
- [S] **SUAP**: download da planilha do diário/notas — [IF Baiano](https://www.ifbaiano.edu.br/unidades/urucuca/files/2025/01/SUAP-Modulo-Meus-Diarios.pdf); IFRN: exportação de notas do livro de notas do Moodle direto para o SUAP — [AVA IFRN](https://aberto.ava.ifrn.edu.br/mod/resource/view.php?id=633)
- [S] **TOTVS Classis Ensino Básico**: exportar diário para Excel, preencher, "importar planilhas do Excel" (área da secretaria, não do professor) — [TDN](https://tdn.totvs.com/download/attachments/4814795/Como%20Fazer%20TOTVS%20-%20v%201120%20Importa%C3%A7%C3%A3o-Exporta%C3%A7%C3%A3o%20-%20Classis%20Ensino%20B%C3%A1sico.pdf?api=v2)
- [S] **MEC SGP (Gestão Presente)**: envio de dados das redes por planilhas .csv/.xlsx (nível rede, não professor) — [MEC, dados via API](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/dadosapi.pdf)
- [V] Terceiros que fazem "CSV → formulário" via extensão: CSV Grade Filler (Diário de Classe UFMG) — [Chrome Web Store](https://chromewebstore.google.com/detail/csv-grade-filler-ufmg/bbipopfmfkmmekbaijkpnajpailajgld)

### Inferences
- [I] Onde houver import nativo (Moodle, SIGAA em algumas IES, SUAP via Moodle, TOTVS via secretaria), o SaaS pode oferecer "gerar arquivo de importação" como integração de esforço quase zero e risco mínimo (o professor faz o upload).
- [I] Nas redes estaduais pesquisadas não encontrei import de planilha no perfil do professor — lá a rota é a UI.

### Gaps
- Não verificado: importação CSV no Canvas, no i-Diário, no RCO, no DED+, na Sala do Futuro, Sponte, Proesc, Gennera, Activesoft, Unimestre.
