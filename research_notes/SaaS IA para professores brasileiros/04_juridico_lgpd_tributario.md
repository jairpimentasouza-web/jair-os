# Marco jurídico-regulatório: SaaS de IA para professores que lança notas/frequência em sistemas escolares (Brasil, nov/2026)

> Nota de pesquisa (não é parecer jurídico). Data de referência: 12/11/2026. Itens marcados [PENDENTE] ou [INCERTO] precisam de confirmação por advogado/contador. Arquivo em construção — versão inicial salva cedo por segurança.

## 1. ECA Digital (Lei 15.211/2025)

### Takeaway
O ECA Digital está em vigor desde 17/03/2026, regulamentado pelo Decreto 12.880/2026 e fiscalizado pela ANPD; mira produtos de TI "direcionados a" ou "de acesso provável por" crianças/adolescentes. Uma ferramenta usada só por professores provavelmente fica fora do núcleo do ECA Digital, mas o risco sobe se alunos tiverem qualquer acesso (ex.: link de prova/lista gerada para o aluno responder online).

### Cited Findings
- Lei 15.211/2025 (ECA Digital) entrou em vigor em 17/03/2026 (vacatio de 6 meses após sanção em 17/09/2025) — [Machado Meyer](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026); [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)
- Decreto 12.880/2026 (18/03/2026) regulamenta a lei; Decreto 12.622/2025 atribui à ANPD a fiscalização — [BMA](https://www.bmalaw.com.br/conteudo/direito-digital-protecao-de-dados-e-cybersecurity/informativos-e-newsletters/eca-digital-e-sua-regulamentacao-entram-em-vigor); [Amadeu e Santos](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/)
- Em 28/10/2026 a ANPD publicou o guia "Fornecedores de produtos ou serviços de tecnologia da informação: escopo e obrigações gerais do ECA Digital" (consulta pública abr–jun/2026). Critérios de "acesso provável" avaliados em conjunto: atratividade/probabilidade de uso por crianças e adolescentes; facilidade de acesso; riscos significativos à privacidade, segurança e desenvolvimento. "Dizer nos termos de uso que o público-alvo é adulto não afasta a aplicação da lei." — [Amadeu e Santos (resumo do guia)](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/) [fonte secundária; conferir no gov.br/anpd]
- Sanções (art. 35): advertência; multa de até 10% do faturamento do grupo no Brasil, teto de R$ 50 milhões por infração; multa alternativa de R$ 10 a R$ 1.000 por usuário cadastrado; suspensão; proibição — [Amadeu e Santos](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/)
- Em março/2026, normas complementares da ANPD (verificação etária, supervisão parental, fiscalização) ainda estavam pendentes — [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)
- O guia da ANPD (segundo o resumo) não trata especificamente de ferramentas B2B/usadas por adultos que processam dados de crianças, nem de edtech — [Amadeu e Santos](https://amadeusesantos.com.br/guia-anpd-eca-digital-quem-deve-cumprir/)

### Inferences
- Produto professor-only (login só do docente, sem conta/acesso de aluno) não é "direcionado a" nem tende a ser "de acesso provável" por crianças; o tratamento de dados de alunos continua regido pela LGPD art. 14. Se o produto evoluir para portal/app do aluno, simulados online ou correção com envio ao aluno, o ECA Digital passa a ser relevante (verificação etária, padrões protetivos, sem perfilamento publicitário).
- Mitigação: termos e arquitetura que impeçam contas de alunos; nenhum anúncio/perfilamento; documentar a análise de "acesso provável" no RIPD.

### Gaps
- Texto integral do guia ANPD de 28/10/2026 e do Decreto 12.880/2026 não foi lido na fonte primária (só via resumo de escritório).

## 2. Regulação de IA — PL 2338/2023 e CNE/MEC

### Takeaway
O PL 2338/2023 (aprovado no Senado em 10/12/2024) seguia sem parecer na Comissão Especial da Câmara em out/nov 2026; não é lei. O texto do Senado lista como alto risco IA usada como fator determinante em seleção de estudantes ou "avaliações determinantes para o progresso acadêmico ou monitoramento de estudantes". Em paralelo, o CNE aprovou o Parecer CNE/CP 15/2026 (diretrizes de IA na educação), com exigência de supervisão humana nas avaliações e vedação de publicidade direcionada com dados educacionais.

### Cited Findings
- PL 2338/2023: aprovado no Senado em 10/12/2024; na Câmara desde mar/2025; Comissão Especial instalada em 20/05/2025 (presidente Luisa Canziani, relator Aguinaldo Ribeiro); em 10/10/2026 situação "aguardando parecer do relator"; datas de votação adiadas; relator disse em 24/08/2026 que a votação ficaria para depois das eleições de outubro/2026 — [Câmara, ficha de tramitação](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262); [Grownt](https://grownt.tech/pl-da-ia-avanca-na-camara-mas-redata-e-impasse-com-o-senado-travam-o-calendario/); [LCF monitor](https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/) [conferir status atualizado em nov/2026]
- Se a Câmara alterar o texto, ele volta ao Senado — [Merovian](https://merovian.app/blog/pl-2338-marco-legal-da-inteligencia-artificial)
- Art. 14, II (texto do Senado): alto risco para sistemas de IA usados como fator determinante na seleção de estudantes ou em avaliações determinantes para progresso acadêmico ou monitoramento de estudantes (exceto monitoramento só para segurança); ITS Rio nota que até tutoria pode cair em alto risco se seus resultados entram em avaliações determinantes — [ITS Rio, nota técnica](https://itsrio.org/wp-content/uploads/2016/12/24.05.07-nota-tecnica-Substitutivo-Pl-2338-1.pdf); [Câmara, apresentação Ig Ibert Bittencourt](https://www2.camara.leg.br/atividade-legislativa/comissoes/comissoes-temporarias/especiais/57a-legislatura/comissao-especial-sobre-inteligencia-artificial-pl-2338-23/apresentacoes-em-eventos/2025.10.14IgIbertBittencourtUNESCOIA.EdueNEES.pdf)
- Parecer CNE/CP 15/2026 aprovado em 01/09/2026; súmula no DOU em 06/10/2026; precisa de homologação ministerial para força normativa — [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira). Uma fonte (Mattos Filho, via resumo de busca) indica homologação pelo MEC em 10/11/2026 — [Mattos Filho](https://www.mattosfilho.com.br/unico/mec-diretrizes-inteligencia-artificial/) [INCERTO: página retornou 403; confirmar no DOU]
- Conteúdo do Parecer 15/2026: IA subordinada às finalidades educacionais; classificação de aplicações por risco (finalidade, autonomia, tipos de dados, impacto nos direitos); gestão acadêmica com IA só "submetida à supervisão humana"; usos incompatíveis: vigilância biométrica contínua, "utilização de dados educacionais para publicidade direcionada", sanção acadêmica/disciplinar fundada exclusivamente em IA, decisões automatizadas com efeitos relevantes — [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira)
- Educação infantil e anos iniciais: uso só mediado pelo professor, sem acesso autônomo a IA generativa até o 5º ano — [Mixvale](https://www.mixvale.com.br/2026/10/14/cne-aprova-regras-para-uso-de-inteligencia-artificial-no-pais/); [Revista Educação](https://revistaeducacao.com.br/2026/09/04/cne-aprovou-diretrizes-de-ia-na-educacao/)
- Segundo reportagem, IA na correção de provas é tratada como alto risco e exige validação humana prévia e documentada — [Fast Company Brasil](https://fastcompanybrasil.com/news/cne-veta-ia-correcao-redacoes-provas/)
- O parecer traz projeto de resolução; a Resolução CNE ainda não foi localizada como publicada — [CNE, PDF do parecer](https://www.gov.br/mec/pt-br/cne/2026/setembro-2026/pcp015_26.pdf); [texto-referência consulta pública](https://www.gov.br/mec/pt-br/cne/2026/maio-2026/texto-referencia-inteligencia-artificial-consulta-publica.pdf)

### Inferences
- Gerar provas/listas com IA para o professor revisar = baixo risco em ambos os marcos. Lançar notas que o próprio professor atribuiu (IA só transcreve) não é "avaliação determinante por IA"; se a IA sugerir/corrigir notas, entra em zona de alto risco (PL) e de validação humana documentada (CNE).
- Design: IA nunca atribui nota; registrar log de confirmação humana por lançamento; rotular conteúdo gerado por IA.

### Gaps
- Texto integral do Parecer 15/2026/projeto de resolução (PDF bloqueado por captcha); confirmação da homologação.

## 3. LGPD — (em construção)

### Takeaway
(em construção)

### Cited Findings
- ANPD multou plataforma de rede social em R$ 153.769.671,33 em 25/08/2026 por cinco infrações envolvendo dados de crianças e adolescentes ("feed sem cadastro"), com ordem de eliminar dados de adolescentes sem representação regularizada — [Daniel Law](https://www.daniel.com.br/pt/client-alert/anpd-aplica-multa-de-r-1537-milhoes-por-falhas-no-tratamento-de-dados-de-criancas-e-adolescentes/)
- ANPD determinou suspensão imediata do tratamento biométrico (reconhecimento facial) para frequência escolar em sistemas da SEED/PR; caso encaminhado à Coordenação-Geral de Sanção e ao MP-PR; ANPD criticou omissão do Registro de Operações de Tratamento — [Convergência Digital](https://convergenciadigital.com.br/governo/anpd-exige-suspensao-imediata-do-tratamento-de-dados-biometricos-na-frequencia-escolar-no-parana/); [Data Privacy Brasil](https://www.dataprivacybr.org/anpd-suspende-o-uso-de-reconhecimento-facial-em-escolas-publicas-do-parana/)
- ANPD abriu em maio/2023 procedimento nº 00261.001328/2023-77 sobre plataformas educacionais que permitiam perfis comportamentais para anúncios — [Data Privacy Brasil](https://www.dataprivacybr.org/data-privacy-brasil-atua-para-proteger-os-direitos-de-criancas-e-adolescentes-em-plataformas-educacionais/)
- Secretaria de Educação do DF recebeu advertências da ANPD (jan/2024) por formulários coletando dados de saúde de crianças — [Confidata](https://confidata.com.br/educacao) [fonte secundária]
- Res. CD/ANPD 19/2024 (23/08/2024): prazo de 12 meses para incorporar cláusulas-padrão (SCCs) — encerrou em 23/08/2025; cláusulas devem ser adotadas integralmente, sem alteração — [Lefosse](https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/); [Mattos Filho](https://www.mattosfilho.com.br/unico/regulamentacao-transferencia-internacional-dados/)
- Res. CD/ANPD 2/2022 (agentes de pequeno porte): dispensa de encarregado, prazo em dobro e procedimento simplificado de incidentes; exclusão quando há tratamento de alto risco (ao menos um critério geral + um específico) — [Migalhas](https://www.migalhas.com.br/depeso/362499/resolucao-cd-anpd-2-22-analise-baseada-em-risco-e-alcance-da-norma); [texto (gov.br/palmares cópia)](https://www.gov.br/palmares/pt-br/midias/arquivos-menu-acesso-a-informacao/legislacao/resolucao-cd-anpd-n2-2022.pdf)

## 4. Credenciais e acesso automatizado a sistemas oficiais — (em construção)

### Cited Findings
- Política de privacidade do app Diário de Classe (SEDUC-SP): "O login e senha só poderão ser utilizados pelo usuário cadastrado. Ele se compromete em manter o sigilo da senha, que é pessoal e intransferível, não sendo possível, em qualquer hipótese, a alegação de uso indevido, após o ato de compartilhamento." — [SED-SP](https://sed.educacao.sp.gov.br/PoliticaPrivacidadeAPP/Index)
- O mesmo acesso SED vale para Diário de Classe e Centro de Mídias SP — [SEDUC-SP tutorial](https://midiasstoragesec.blob.core.windows.net/001/2020/04/tutorial-acesso-docente-sed-.pdf)

## 5. CDC — (em construção)
- Decreto 11.034/2022 (SAC) aplica-se aos "fornecedores dos serviços regulados pelo Poder Executivo federal" — [Câmara Legin](https://www2.camara.leg.br/legin/fed/decret/2022/decreto-11034-5-abril-2022-792480-publicacaooriginal-164911-pe.html); [Mattos Filho](https://www.mattosfilho.com.br/unico/decreto-servico-consumidor/)

## 6. Licitações — (em construção)
- Decreto 12.807/2025: desde 01/01/2026 dispensa por valor até R$ 65.492,11 (compras/serviços) e R$ 130.984,20 (obras/engenharia) — [Effecti](https://effecti.com.br/decreto-12807-de-2025/); [cópia do decreto (Unipampa)](https://sites.unipampa.edu.br/propladi/files/2026/01/decreto-12-807-2025-limites-dispensa-2026.pdf)

## 7. Tributário/societário — (em construção)
- Desenvolvimento/licenciamento de software não está no rol de ocupações MEI (Anexo XI Res. CGSN 140/2018); PLP 25/2026 propõe incluir, não aprovado — [Meu Contador Online](https://www.meucontadoronline.com.br/blog/desenvolvedor-de-software-pode-ser-mei/); [Wetax](https://wetax.com.br/programador-pode-ser-mei-em-2026)
- Licenciamento e assinatura de software (inclusive SaaS) no Simples: Anexo III se Fator R ≥ 28%, senão Anexo V (LC 123 art. 18 §5º-D, V; §§5º-I, 5º-J, 5º-M; Res. CGSN 140 art. 25 §1º V "e"; SC Cosit 222/2019) — [Tributo Devido](https://tributodevido.com.br/portal/tributacao-no-simples-nacional-para-licenciamento-e-assinatura-de-software/)
- Simples a partir de 2027: IBS/CBS por dentro do DAS ou opção "híbrida" (recolher IBS/CBS fora do DAS, gerando crédito pleno ao cliente PJ) — [Migalhas](https://www.migalhas.com.br/depeso/458864/simples-nacional-2027); [Meu Contador Online](https://www.meucontadoronline.com.br/blog/simples-nacional-hibrido-em-2027/)
