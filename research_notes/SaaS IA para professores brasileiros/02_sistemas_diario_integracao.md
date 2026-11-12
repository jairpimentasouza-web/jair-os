# Sistemas de diário de classe eletrônico no Brasil e viabilidade de automação (estado em nov/2026)

> Status: rascunho v1, salvo durante a pesquisa (pesquisa em andamento). Legenda: **[V]** = verificado em fonte primária/oficial; **[S]** = fonte secundária (imprensa, sindicato, loja de apps); **[I]** = inferência minha.

## 1. Redes ESTADUAIS: qual sistema o professor usa para diário/notas/frequência (por UF)

### Takeaway
Cada UF tem seu próprio sistema estadual (quase sempre feito "em casa" pela secretaria ou pela empresa estadual de TI), e a tendência 2024-2026 é: app móvel com modo offline + prazos curtos de lançamento + (em SP) login gov.br com 2FA e geolocalização obrigatória. Isso torna as redes estaduais o segmento mais caro e arriscado para automação de terceiros; os maiores (SP, MG, PR) têm barreiras fortes.

### Cited Findings

**São Paulo (SEDUC-SP)**
- [V] Desde 03/02/2025 o Diário de Classe (Frequência, Registro de Aulas, Avaliação, Fechamento, Relatório, "Mapão", acesso do eventual) fica na **Sala do Futuro Professor** (https://saladofuturoprofessor.educacao.sp.gov.br); o login é "Entrar com o gov.br" com CPF e senha gov.br, e a SEDUC exige "a versão mais recente do aplicativo Gov.br, com a Verificação em Duas Etapas ativada. Esse requisito será obrigatório para o acesso à Sala do Futuro Professor." — [SEDUC-SP, Projeto Professor Presente + Sala do Futuro Professor, 2025](https://midiasstoragesec.blob.core.windows.net/001/2025/06/orientao-professor-presente-pagamento-2025.pdf)
- [V] Geolocalização: "Ao acessar o módulo de frequência, o navegador irá pedir permissão para acessar a localização do usuário. É de extrema importância que o usuário permita esse acesso" — mesma fonte. Na tela de frequência todos os alunos vêm com "C" (comparecimento) e o professor só marca as faltas — mesma fonte.
- [V] Prazo: "Registro de frequência e conteúdo em 24h a partir de Março de 2025" — mesma fonte. Antes (comunicado de 28/03/2024) o módulo ficava aberto 8 dias corridos para o docente, depois passava ao trio gestor e à supervisão — [Comunicado 17/2024, DE Barretos](https://midiasstoragesec.blob.core.windows.net/001/2024/03/comunicado-17-24.pdf)
- [V] Em 2024 o Diário de Classe existia na SED (web) e em apps iOS/Android com **modo offline**, mas "No modo offline do aplicativo Diário de Classe, permanece a visualização com as habilidades trabalhadas em aula. Por isso, recomenda-se que o registro de aula seja feito na versão web ou no modo online do aplicativo"; o registro de aula passou a exigir selecionar o "material digital" da aula, que dispara tarefa automática no Centro de Mídias (Tarefa SP) — [Comunicado 17/2024](https://midiasstoragesec.blob.core.windows.net/001/2024/03/comunicado-17-24.pdf)
- [S] Frequência de 2026 alimenta o painel "Aluno Presente" da Secretaria até o nível da turma (Agência SP, 04/03/2026, via resumo de busca) — [abcdoabc](https://abcdoabc.com.br/frequencia-escolar-aumenta-em-sp/)

**Minas Gerais (SEE-MG)**
- [V] **DED+** (sucessor do Diário Escolar Digital – DED) para registro de conteúdo, avaliações e frequência; tem botão "Chamada do Dia" (lança a chamada do dia com um clique; cliques para frequência caíram de 9 para 3); lista de turmas com pendências para fechamento do bimestre; o DED antigo seguiu acessível durante migração gradual; dados alimentam o app Minha Escola MG — [Agência Minas, novo DED](https://www.agenciaminas.mg.gov.br/noticia/educacao-apresenta-novo-diario-escolar-digital-a-rede-estadual-de-ensino/); [Agência Minas, novos perfis DED](https://www.agenciaminas.mg.gov.br/noticia/educacao-lanca-novos-perfis-de-acesso-para-o-diario-escolar-digital); [Agência Minas, Minha Escola MG](https://www.agenciaminas.mg.gov.br/noticia/aplicativo-minha-escola-mg-amplia-acesso-a-vida-escolar-dos-estudantes-da-rede-estadual-128922)

**Paraná (SEED-PR)**
- [S] **RCO – Registro de Classe Online** (web) e app oficial **Escola Paraná – Professores** (iOS/Android); professores sem acesso ao RCO não têm algumas funções do app — [Paraná, serviço "Instalar o aplicativo Escola Paraná - Professores"](https://www.parana.pr.gov.br/servicos/Educacao/Aplicativos/Instalar-o-aplicativo-Escola-Parana-Professores-lqNJmZox); app "LRCO Paraná" na App Store, "mesmas funcionalidades do RCO/RCDIG web" — [App Store LRCO](https://apps.apple.com/br/app/id6498710410)
- [S] RCO+Aulas = ferramenta de planejamento; plano pode ser importado para o diário (fonte secundária sobre "RCO Municípios") — [psicopedagogia.com.br](https://psicopedagogia.com.br/conteudo/rco-municipios-guia-completo-para-gestao-municipal); [Paraná, Professores aprovam nova ferramenta de planejamento](https://www.parana.pr.gov.br/Noticia/Professores-da-rede-estadual-aprovam-nova-ferramenta-de-planejamento)

**Rio de Janeiro (SEEDUC-RJ)**
- [S] Boletim do SEPE-RJ (mar/2026): "Diário Eletrônico: a Seeduc emitiu resolução revogando o Diário Eletrônico." — [SEPE boletim rede estadual mar/2026](https://seperj.org.br/wp-content/uploads/2026/03/boletim_REDEESTADUALmar26b_rascunho.pdf); [SEPE boletim nº 74](https://seperj.org.br/wp-content/uploads/2026/03/boletim_REDEESTADUAL74_redes2.pdf). Não encontrei o número da resolução nem o que substituiu o diário eletrônico.

**Bahia (SEC-BA)**
- [V] **Diário de Classe Digital** = módulo Portal do Professor do **SIGEduc** (sigeduc.educacao.ba.gov.br), regulamentado pela Portaria 187/2024; login e senha enviados ao e-mail cadastrado no RH Bahia; há **app** com modo offline (manual do app, jul/2025) — [Manual Diário de Classe Digital 2024](https://enova.educacao.ba.gov.br/wp-content/uploads/2024/04/manual_de_diario_de_classe_digital.pdf); [FAQ 2024](https://enova.educacao.ba.gov.br/wp-content/uploads/2024/04/faq_diario.pdf); [Manual do app, 2025](https://enova.educacao.ba.gov.br/wp-content/uploads/2025/07/manual_app_diario_classe_digital.pdf); [Correio, Portaria 187/2024](https://www.correio24horas.com.br/minha-bahia/rede-estadual-de-ensino-na-bahia-tera-diario-de-classe-digital-0124)

**Ceará (SEDUC-CE)**
- [V] **SIGE Escola** com módulos Acadêmico e **Professor Online**; o **Diário Online** faz parte do Professor Online desde março/2016 e registra plano, aulas, frequência, avaliações e notas — [SEDUC-CE, O que é o Diário Online](https://apistorage.seduc.ce.gov.br/paicidadecerta/wp-content/uploads/2025/11/03135600/Sige-lotacao-professor-online-O-que-e-o-diario-online-11.pdf); [Caderno Diário Online](https://apistorage.seduc.ce.gov.br/paicidadecerta/wp-content/uploads/2025/11/03135545/Sige-lotacao-professor-online-CADERNO-Diario-Online-3.pdf)

**Espírito Santo (SEDU-ES)**
- [V] **SEGES** + app **SEGES Professor** (lança notas e faltas, consulta diário; funciona **online e offline**, sincroniza ao reconectar); apps irmãos SEGES Responsáveis e SEGES Gestor — [ES.gov, Sedu lança apps SEGES](https://www.es.gov.br/Noticia/sedu-lanca-novos-aplicativos-do-sistema-seges-para-responsaveis-professores-e-gestores); [Sedu atualiza procedimentos do Diário de Classe Digital](https://www.es.gov.br/Noticia/sedu-atualiza-procedimentos-para-uso-do-diario-de-classe-digital)

**Rio Grande do Sul (SEDUC-RS)**
- [S] **Escola RS – Professor** (app de diário de classe para frequência e aproveitamento; também web em professor.escola.rs.gov.br; integrado ao sistema ISE; desenvolvido pela PROCERGS — pacote br.com.procergs.tuaescola) — [AppGoblin, Escola RS - Professor](https://appgoblin.info/apps/br.com.procergs.tuaescola); [RS.gov, Escola RS](https://estado.rs.gov.br/ferramenta-permite-atualizar-cadastro-de-estudantes-pelo-aplicativo-escola-rs)

**Santa Catarina (SED-SC)**
- [S] **SISGESC** (Sistema de Gestão Educacional de SC, CIASC) + **Professor Online** (lançado fev/2015) + app **Professor SC** (nova versão jul/2019) — [ENLICSUL 2026](https://ns1.editorarealize.com.br/editora/anais/enlicsul/2026/6a187aab1766d_28052026142603.pdf); [UFFS dissertação 2019](https://rd.uffs.edu.br/bitstream/prefix/4598/1/MUELLER.pdf). Status 2026 não confirmado.

**Goiás (SEDUC-GO)**
- [V] Diário eletrônico no **SIAP – Sistema Administrativo e Pedagógico** (perfil professor: planejamento, diário, envio de planos); **SIGE** cuida de matrícula/modulação de professores — [Portal Educa GO, SIAP](https://portaleduca.educacao.go.gov.br/suporte_ti/siap-sistema-administrativo-e-pedagogico-2); [Diretrizes Operacionais 2025](https://goias.gov.br/educacao/wp-content/uploads/sites/40/2025/06/Diretrizes_Operacionais_UEs_SeducGO___2025___03_06.pdf)

**Pernambuco (SEE-PE)**
- [S] **SIEPE** (Sistema de Informações da Educação de Pernambuco); Portaria SEE 2790/2020 atribui à gestão validar frequência no SIEPE e acompanhar "diários impressos ou eletrônicos" — [Portaria SEE 2790/2020](https://www.normasbrasil.com.br/norma/portaria-2790-2020-pe_400900.html)

**Alagoas (SEDUC-AL)**
- [S] **SAGEAL** (Sistema de Gestão Educacional de Alagoas): app Android lançado em 07/07/2026, mesmo login/senha da versão web, lança notas e frequência **offline** com sincronização posterior; iOS em desenvolvimento — [Tribuna do Sertão, 03/07/2026](https://tribunadosertao.com.br/alagoas/2026/07/03/933599-aplicativo-para-android-facilita-notas-e-frequencia-de-professores-da-rede-estadual); ver também [Seduc moderniza registro digital, mai/2026](https://www.tribunadosertao.com.br/alagoas/2026/05/04/896423-seduc-moderniza-registro-digital-para-garantir-permanencia-estudantil-e-repasse-de-incentivos)

**Amazonas (SEDUC-AM)**
- [S] App **Diário Digital AM** ("para uso dos docentes no lançamento de aulas") — [App Store](https://apps.apple.com/br/app/id1523901475); sistema **SIGEAM** (PRODAM), com reformulação "SIGEAM 2.0" web + app em termo de referência de 2022 — [PRODAM TR 2022](https://prodam.am.gov.br/wp-content/uploads/2022/01/10-Termo-de-Referencia-02.05.2022_ultimaversao.pdf)

**Amapá (SEED-AP)**
- [S] **SIGEduc** com "Portal do Professor – Lançamento de Frequência" — [NTE/SEED-AP FAQ SIGEduc](https://nte.seed.ap.gov.br/faqsigeduc/portal_do_professor/PORTAL_DO_PROFESSOR_3_LANCAMENTO_DE_FREQUENCIA.pdf)

**Paraíba (SEE-PB)**
- [S] Diário de classe online implantado nas escolas estaduais em 2017, ligado ao **SIGEduc** — [UFPB, dissertação](https://repositorio.ufpb.br/jspui/bitstream/123456789/36659/1/JanierysLouren%c3%a7oLinsAlbuquerque_Dissert.pdf)

**Pará (SEDUC-PA)**
- [S] Módulo "Acadêmico – Diário" na intranet da SEDUC-PA (manual de lançamento de notas/frequência) — [Manual do Diário SEDUC-PA](https://intranet.seduc.pa.gov.br/intranet/academico/manuais/ACADEMICO%20-%20DIARIO%20-%20Manual%20do%20Diario.pdf)

**Mato Grosso do Sul (SED-MS)**
- [S] App **EducaMS Professor** — [App Store](https://apps.apple.com/us/app/id1485458365)

**Mato Grosso (SEDUC-MT)**
- [S] **SigEduca** é o sistema estadual (dados migram do SIGEDUCA para o SIGA) — [TCE-MT doc](https://www.tce.mt.gov.br/processo/documento/528366/2023/149965/2023). Módulo de diário do professor não confirmado.

**Distrito Federal (SEEDF)**
- [S] i-Educar adquirido do Portal do Software Público e adaptado pela SEEDF (artigo acadêmico, data antiga) — [core.ac.uk](https://core.ac.uk/download/196901029.pdf). Status 2026 não confirmado.

**Piauí / Maranhão**
- [S] PI: edital SEDUC-PI 2025 exige registrar frequência "no diário de classe e na plataforma do Canal Educação" — [Edital SEDUC-PI](https://www.pi.gov.br/wp-content/uploads/2025/03/edital-professores-redacao.pdf). MA: MP-MA recomendou (2019) implantar diário eletrônico — [MPMA](https://cdn-0.mpma.mp.br/publicacoes/10188/5c2b9f16c8bb00e70b5f4cd34245d9f5.pdf). Sistema atual não confirmado.

**Tendência geral (CIEB/Consed)**
- [V] Nota Técnica CIEB #26 (jun/2025) recomenda que o sistema de frequência "deve funcionar offline e ser acessível via celular", lançamento diário, e relatórios de preenchimento; diagnóstico CIEB/ISG/Consed 2023-2024 com redes estaduais: ~90% das que não tinham os 20 "habilitadores" avançaram em 2024 — [CIEB NT 26](https://cieb.net.br/wp-content/uploads/2025/06/CIEB-Notas-Tecnicas-26-Uma-gestao-pela-aprendizagem-habilitadores-de-apoio-a-evolucao-dos-sistemas-de-matricula-alocacao-de-professores-e-diario-de-classe-nas-redes-de-ensino.pdf)

### Inferences
- [I] 2FA gov.br + geolocalização no navegador (SP) inviabilizam robô em servidor; só funciona extensão no navegador do próprio professor, com o professor fazendo login (exatamente o modelo atual do usuário) — e mesmo assim a geolocalização registra onde o navegador está, o que é um risco se o professor lançar fora da escola.
- [I] O movimento para apps offline (BA, ES, AL, SP, PR, RS, AM, MS) desloca o uso do professor para o celular; a versão web continua existindo na maioria, o que preserva a rota de extensão Chrome.

### Gaps
- RJ: qual resolução revogou o diário eletrônico (2026) e o que vale hoje; RN, SE, TO, RO, AC, RR, MA, PI, MT sem confirmação do sistema atual (pesquisa em andamento).

## 2. Redes MUNICIPAIS

### Takeaway
(em andamento) i-Educar/i-Diário (Portabilis, software livre) é o padrão aberto mais difundido; i-Diário tem API REST v2, mas ela usa um token único por instalação (não por professor), pensado para o app oficial — logo não é uma API aberta a terceiros.

### Cited Findings
- [V] i-Diário = "Portal do professor integrado com o software livre i-Educar" (Portabilis) — [GitHub portabilis/i-diario README](https://github.com/portabilis/i-diario)
- [V] Rotas `api/v2` do i-Diário incluem `daily_frequencies` (create/index), `daily_frequency_students#update_or_create`, `content_records#sync`, `teacher_classrooms`, `classroom_students`, `lesson_plans`, `teaching_plans`, `school_calendars` — [config/routes.rb](https://github.com/portabilis/i-diario/blob/main/config/routes.rb)
- [V] Autenticação da API v2: header `token` comparado a `IeducarApiConfiguration.current.api_security_token` (um segredo por instalação/entidade) ou `Authorization: Bearer AUTH_TOKEN` global — [api/v2/base_controller.rb](https://github.com/portabilis/i-diario/blob/main/app/controllers/api/v2/base_controller.rb); [application_controller.rb](https://github.com/portabilis/i-diario/blob/main/app/controllers/application_controller.rb)
- [V] i-Educar (Laravel 13) depende de `google/recaptcha` — [composer.json](https://github.com/portabilis/i-educar/blob/master/composer.json)
- [S] Rio de Janeiro (SME): sistema SGA + app "DiáRio"; frequência deve ser lançada diariamente no app DiáRio ou no SGA — [Circular CAV 07, 2º COC 2026](https://educacao.prefeitura.rio/wp-content/uploads/sites/42/2026/07/Circular-CAV-no-07-2o-COC-2026.pdf)
- [S] Macaé (RJ) usava e-cidade para notas/faltas (2016) — [Macaé manual](https://macae.rj.gov.br/midia/conteudo/arquivos/1472156250.pdf); Aracaju usa SIGED — [wiki educação Aracaju](https://wiki.educacao.aju.br/books/siged-professores/page/cadastro-de-notas-dos-estudantes/export/pdf); Olinda lançou app de diário mobile/offline — [Olinda](https://olinda.pe.gov.br/olinda-da-mais-um-passo-importante-na-modernizacao-da-rede-municipal-de-ensino/?pdf=92121); Manaus (Semed) diário digital desde 2021 — [Informe Manaus](https://informemanaus.com/2021/diario-digital-sera-implantado-na-rede-municipal-de-ensino)
- [S] MEC criou o **MEC Gestão Presente** (Portaria MEC 234, 02/04/2025), com dois módulos: **SGP – Sistema Gestão Presente** (plataforma de dados que recebe dados das redes) e **GPE – Gestão Presente na Escola** (sistema de gestão escolar gratuito, adesão voluntária pelo Simec, que inclui matrícula, enturmação, alocação de professores e "um diário de classe digital que facilita o registro de frequência, notas e conteúdos") — [Portaria MEC 234/2025](https://abmes.org.br/arquivos/legislacoes/Portaria-mec-234-2025-04-02.pdf); [Guia Gestão Presente na Escola (MEC)](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/GuiaGestoPresenteEscola_compressed.pdf); [Undime](https://undime.org.br/fique-atento/4/). (gov.br bloqueia leitura automatizada com CAPTCHA; conteúdo obtido por trechos de busca.)
- [S] Jul/2025: MEC selecionou **800 redes municipais** para a etapa de implementação do GPE, priorizando municípios pequenos/médios e com maior abandono nos anos finais — [Radar Digital Brasília](https://radardigitalbrasilia.com.br/educacao/mec-seleciona-800-municipios-para-o-gestao-presente-na-escola/)
- [S] O SGP (MEC) aceita dados das redes por **planilha (.csv/.xlsx)** ou **API** (para redes com sistema próprio; exige ofício ao MEC; API Key por cliente; Swagger em `/v1/documentation`; hosts `api-cmde.hmg.gestaopresente.mec.gov.br` e `api-cmde.gestaopresente.mec.gov.br`); frequência mensal de estudantes do EM está entre os dados exigidos — [MEC, Dados via API](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/dadosapi.pdf); [Cartilha uso da API](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/cartilhausoapimecgestaopresente.pdf); [Manual SGP](https://www.gov.br/mec/pt-br/media/manual-sgp.pdf). Essa API é rede→MEC, não professor→diário.
- [S] São Paulo capital (SME-SP): **SGP – Sistema de Gestão Pedagógica** (novosgp.sme.prefeitura.sp.gov.br) substituiu o diário em papel: frequência, notas/conceitos, tipos de avaliação, observações pedagógicas e planos; o suporte da SME cobre SGP, SGA e Conecta — [Manual SGP ABAEs 2025](https://acervodigital.sme.prefeitura.sp.gov.br/wp-content/uploads/2025/09/Manual_SGP_ABAEs_2025.pdf); [Prefeitura SP, SGP ganha novas funcionalidades](https://prefeitura.sp.gov.br/w/noticia/educacao-sistema-de-gestao-pedagogica-ganha-novas-funcionalidades); [Manual SME, Suporte](https://manual.sme.prefeitura.sp.gov.br/pt-br/Procedimentos/Infraestrutura_e_Tecnologia/SuporteSME)
- [S] Paraíba (estadual) usa também o **SIAGE**: nota técnica da SEE-PB (Portaria 648, nov/2024) pede garantir "que todos os docentes tenham acesso ao SIAGE" para registro das informações acadêmicas — [SEE-PB Nota Técnica](https://paraiba.pb.gov.br/diretas/secretaria-da-educacao/todos-editais/todos-editais-e-licitacoes/NOTATCNICAPortarian648de05denovembrode2024.pdf) (corrige/complementa a menção a SIGEduc na seção 1)

### Inferences
- [I] O GPE do MEC pode virar, a médio prazo, o "sistema padrão" de muitos municípios pequenos (um alvo único que cobre centenas de redes) — vale monitorar; não encontrei se ele tem app, login gov.br ou API de escrita.
- [I] Para municípios com i-Educar/i-Diário, a API v2 existe, mas o token é por instalação: só a prefeitura (ou a Portabilis) pode concedê-lo. Rota realista para professor individual = automação da UI web do i-Diário (Rails/Devise), que é estável e igual em todas as instalações — bom custo-benefício (um conector serve para muitos municípios).
- [I] Os municípios usam muitos fornecedores diferentes (i-Educar, e-cidade, SIGED, SGP próprio, apps próprios); a cauda longa é enorme.

### Gaps
- Não encontrei número oficial atualizado de municípios que usam i-Educar/i-Diário (o site da Portabilis não foi acessado), nem participação de Betha, IPM, Fly, GEO, Soluções Públicas. Não confirmei detalhes do app "DiáRio" do Rio além da circular.

## 3. Escolas PRIVADAS
### Takeaway
(em andamento) O mercado privado é fragmentado; quase nenhum fornecedor publica API aberta para escrita de notas/frequência. TOTVS RM/Educacional é a exceção técnica (web services SOAP TBC/wsDataServer e APIs REST em projetos), mas exige credenciais da instituição, não do professor.

### Cited Findings
- [V] TOTVS Educacional: digitação de frequência diária via TBC usando o web service `wsDataServer` com o dataserver `EduFrequenciaDiariaWSData` (tabela SFREQUENCIA) — [TDN, Digitação de Frequência Diária através do TBC](https://tdn.totvs.com/download/attachments/234611462/Digita%C3%A7%C3%A3o%20de%20Frequ%C3%AAncia%20Di%C3%A1ria%20atrav%C3%A9s%20do%20TBC.pdf?api=v2); integração SESI LMS envia notas e frequências ao TOTVS Educacional via Web Services TOTVS — [TDN, Detalhamento Funcional LMS SESI](https://tdn.totvs.com.br/download/attachments/533748328/Especifica%C3%A7%C3%A3o%20Anexo%20I%20-%20Detalhamento%20Funcional%20-%20LMS%20SESI.pdf?api=v2); projeto SENAI com API REST + OAuth 2.0 ("Cada SGE receberá um usuário e senha para autenticação e obtenção do token") — [TDN, FS007614](https://tdn.totvs.com.br/download/attachments/419529746/Especificacao%20Anexo%20I%20-%20Detalhamento%20Funcional%20-%20FS007614.pdf?api=v2); Portal do Professor (Corpore.net / RM) tem lançamento manual de frequência e notas no "Diário de Classe" — [Manual Portal Professores RM, 05/2024](https://portal.fbnovas.edu.br/Corpore.net/%5BMANUAL%5D%20EDUCACIONAL%20-%20PORTAL%20PROFESSORES%20-%20ATT%2005-24.pdf)
- [S] **Sponte** agora é "Sponte by TOTVS" (adquirida pela TOTVS junto com a Linx); atende educação básica, idiomas e cursos livres; "mais de 70.000 clientes no Brasil e América Latina"; apresentada na Bett Brasil 2026 — [Portal ERP](https://portalerp.com/br/noticia/sponte-by-totvs-lanca-solucao-que-leva-inteligencia-de-dados-para-a-gestao-de-instituicoes-de-ensino); [Bett Brasil 2026, TOTVS](https://brasil.bettshow.com/en/releases-expositores-2027/totvs-reforca-estrategia-para-o-setor-educacional-com-novidades-na-bett-brasil-2026). Não encontrei documentação pública de API da Sponte.
- [S] **Layers Education**: "ecossistema" neutro que integra edtechs e ERPs; >9 mil instituições e ~3,5 milhões de alunos; >20 sistemas de gestão integrados (sincronização ERP→app); fundo de M&A de R$ 5 mi para integradores — [startups.com.br](https://startups.com.br/negocios/edtech/layers-cria-fundo-de-mas-com-r-5-milhoes-para-consolidar-edtechs/); [Suno](https://www.suno.com.br/noticias/?p=201976); parceria com Clever — [startups.com.br](https://startups.com.br/negocios/edtech/layers-se-une-a-clever-para-apoiar-escolas-e-edtechs-latinas/). Sem documentação pública de API encontrada.
- [S] **Activesoft**: fundada em 1999; vagas "Activesoft" publicadas no Greenhouse da **isaac** (plataforma financeira para escolas), ao lado de ClassApp — indica que pertence ao grupo isaac — [Greenhouse isaac](https://job-boards.greenhouse.io/isaac/jobs/5478186004); [B2B Stack](https://www.b2bstack.com.br/compare/activesoft-vs-gestao-escolar). Sem API pública encontrada.
- [S] **SophiA** (Primasoft): gestão de escolas e bibliotecas, fundada em 1993 — [B2B Stack](https://www.b2bstack.com.br/compare/sophia-vs-gestao-escolar). **Gennera**: app iOS oficial — [App Store](https://apps.apple.com/br/app/gennera/id1518802450); API pública não encontrada. **Proesc**: aparece em listas de "melhores sistemas" sem dados de mercado — [NFE.io](https://nfe.io/blog/gestao-empresarial/sistema-escolar/).
- Não encontrei ranking/market share confiável de ERPs escolares privados.

## 4. Ensino SUPERIOR
### Takeaway
(em andamento) Os LMS (Google Classroom, Moodle, Canvas) têm APIs oficiais documentadas para notas; os sistemas acadêmicos públicos (SIGAA, SUAP) têm APIs OAuth2 institucionais, mas o "diário oficial" de nota/frequência normalmente só é escrito pela UI.

### Cited Findings
- [V] **Google Classroom API**: notas por `courses.courseWork.studentSubmissions.patch` com `updateMask` só `draftGrade`/`assignedGrade`; escopos `classroom.coursework.students` ou `classroom.coursework.me`; restrição: a requisição "must be made by the Developer Console project" que criou o courseWork (senão `PERMISSION_DENIED`) — [Classroom API reference, studentSubmissions.patch](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/patch); a API não lê/escreve nota final do curso e não grava rubricas — [Classroom, Manage grades](https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades)
- [V] **Moodle Web Services**: `core_grade_update_grades` (desde 2.7), `core_grades_get_grades` (2.7), `mod_assign_save_grade(s)` (2.6/2.7), `gradereport_user_get_grades_table` (2.9), `core_grades_grader_gradingpanel_point_store` (3.8) — [Moodle dev docs, Web service API functions](https://docs.moodle.org/dev/Web_service_API_functions). Frequência depende do plugin mod_attendance (funções não listadas nessa página).
- [S] **SUAP** (Institutos Federais, IFRN): API com OAuth2 (authorization code), aplicações registradas em https://suap.ifrn.edu.br/api/ — [material de aula IFRN](https://dvcirilo-ifrn.github.io/pos/build/aula13.pdf); manual do módulo professor (IFTO, 2024) — [Manual SUAP Módulo Professor](https://campusparaiso.ifto.edu.br/blog/cgti/wp-content/uploads/sites/9/2024/05/Manual-Suap-Modulo-Professor.pdf)
- [S] **SIGAA** (UFRN e dezenas de federais): caminho do docente "Portal do Docente → Ensino → Turmas → Cadastrar Notas" — [STI/UFPB](https://conhecimento.sti.ufpb.br/books/turmas/export/pdf); [UnB manual docente 2025](https://portalsig.unb.br/wp-content/uploads/2025/02/manual_docente_abaensino.pdf). Não achei documentação pública de API de escrita do SIGAA.
- [S] **Q-Acadêmico** (IF Goiano, IFPE etc.) — manual do professor "Acadêmico Web" — [IF Goiano](https://sistemas.ifgoiano.edu.br/manuais-ifgoiano/qacademico/manuais/atuais/Manual_Academico_Web%20-%20Professor.pdf); [IFPE tutorial 2026](https://portal.ifpe.edu.br/ead/wp-content/uploads/sites/15/2026/07/Tutorial-Q-Academico_.pdf)

## 5. Viabilidade técnica de automação por classe de sistema; relatos públicos de automação
### Takeaway
(em andamento) Já existem extensões Chrome de nicho (pequena base de usuários) que preenchem diários oficiais a partir de CSV — prova de que o modelo "extensão no navegador do professor" é o caminho de fato usado; nenhuma API oficial aberta para professor foi encontrada em redes públicas.

### Cited Findings
- [V] **CSV Grade Filler – UFMG**: "Fills forms on the Diario de Classe website using CSV files" (notas e frequência a partir de CSV), 23 usuários, v1.18 atualizada em 08/07/2026 — [Chrome Web Store](https://chromewebstore.google.com/detail/csv-grade-filler-ufmg/bbipopfmfkmmekbaijkpnajpailajgld)
- [V] **Notas no Sistema**: "faz o lançamento automatizado das notas no sistema do portal acadêmico" (desenvolvedor ligado a uma faculdade do CE), 47 usuários, nota 5,0 (6 avaliações), v2.0 de 26/04/2026 — [Chrome Web Store](https://chromewebstore.google.com/detail/notas-no-sistema/fodmedhagnhbnbnjgnfmmdaifljlecpl)
- [S] Extensão da **EduTIC Software** para "envio de notas e frequência escolar para a SED" via Chrome (sem avaliações) — [Chrome Web Store](https://chrome.google.com/webstore/detail/gpcanajjajecfookhifojdabdcjbejde) (a página não carregou para leitura direta; descrição via resultado de busca)
- [S] Extensões para o **SIAGE (Paraíba)** — "SIAGILIZE" (preencher notas, automatizar/validar/exportar dados do diário) e outra para agilizar registro de aulas e notas — via resultado de busca na Chrome Web Store; páginas não verificadas diretamente.
- [V] **Unimestre+**: extensão de aluno (colore boletim e calcula nota necessária), 7 usuários, 2023 — não lança notas — [Chrome Web Store](https://chromewebstore.google.com/detail/hhahiccgoigkbonplidkebpleehnggen)
- [S] Extensões análogas fora do Brasil: "Siged Carga de Notas" (Uruguai, CSV) e "Importador de Notas Mined" — [chromeboard](https://chromeboard.com/extension/siged-carga-de-notas-bpahhlhmhiemophimkghldkpiioldnei)
- [V] i-Educar inclui `google/recaptcha` como dependência — [composer.json](https://github.com/portabilis/i-educar/blob/master/composer.json)
- [V] SP: login gov.br com 2FA obrigatório + geolocalização do navegador no módulo de frequência + prazo de 24h (2025) — ver seção 1.

## 6. Termos de uso: compartilhamento de credenciais / acesso automatizado
(em andamento)

## 7. Sistemas com importação de notas/frequência por planilha
(em andamento)
