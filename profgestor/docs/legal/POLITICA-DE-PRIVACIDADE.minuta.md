# Política de Privacidade do ProfGestor — MINUTA

> **Minuta técnica para revisão por advogado. Não vigente.** Descreve o funcionamento real
> do software nesta versão; qualquer mudança técnica deve atualizar este texto.

## 1. Quem somos
[RAZÃO SOCIAL], CNPJ [NÚMERO]. Encarregado pelo tratamento de dados (DPO): [NOME], contato [E-MAIL DO ENCARREGADO].

## 2. Dois papéis diferentes
- **Dados dos professores assinantes** (cadastro, login, assinatura): o ProfGestor é **controlador**.
- **Dados de alunos e responsáveis** lançados pelo professor: o **professor é o controlador** e o ProfGestor é **operador**, tratando-os apenas conforme as instruções do professor e o Acordo de Tratamento de Dados.

## 3. Dados que tratamos como controlador
| Dado | Finalidade | Base legal (a validar) |
|---|---|---|
| Nome, e-mail, senha (armazenada pelo provedor de autenticação) | Criar e proteger a conta | Execução de contrato |
| Situação da assinatura, plano, identificadores do provedor de pagamento | Cobrança e controle de acesso | Execução de contrato |
| Registros técnicos e de auditoria (autor, data, tipo de ação) | Segurança, prevenção a fraudes, prestação de contas | Legítimo interesse; obrigação legal |
Não coletamos dados de cartão: o pagamento ocorre na página do provedor.

## 4. Dados que tratamos como operador
Identificação de alunos e responsáveis, agenda, presença, conteúdo das aulas, observações pedagógicas, valores e pagamentos das aulas, interessados (CRM). Esses dados são isolados por conta: outros assinantes e a administração comercial do ProfGestor não têm acesso ao seu conteúdo. Acesso excepcional para suporte só ocorre a pedido do professor, por tempo limitado e com registro.

## 5. Compartilhamento (suboperadores)
| Empresa | Serviço | Dados |
|---|---|---|
| Google (Firebase) | Hospedagem, autenticação, banco de dados, funções | Todos os dados do serviço |
| [Stripe ou Mercado Pago] | Cobrança da assinatura | Nome, e-mail, dados de pagamento do assinante |
| Google (Agenda) — opcional | Sincronização escolhida pelo professor | Dados das aulas sincronizadas |
Localização dos dados e transferência internacional: [REGIÃO DO FIRESTORE E CLÁUSULAS APLICÁVEIS].

## 6. Retenção
Dados da conta: enquanto ativa e por [PRAZO] após o cancelamento, para exportação. Registros de cobrança: pelo prazo legal fiscal. Registros de auditoria: [PRAZO]. Depois, eliminação ou anonimização.

## 7. Direitos dos titulares
Professores exercem seus direitos pelo aplicativo (correção, exportação em JSON, exclusão) ou pelo contato do encarregado. Alunos e responsáveis devem dirigir pedidos ao professor (controlador); o ProfGestor apoia o professor no atendimento.

## 8. Crianças e adolescentes
O serviço é contratado por professores adultos. Dados de menores são lançados pelo professor sob sua responsabilidade e base legal, com acesso da família restrito ao próprio aluno e condicionado a e-mail confirmado.

## 9. Segurança
Isolamento por conta aplicado no servidor e verificado por testes automatizados; autenticação com confirmação de e-mail para o portal; segredos fora do código; trilha de auditoria; backups. Incidentes relevantes serão comunicados à ANPD e aos afetados nos termos da regulamentação.

## 10. Cookies e rastreamento
O aplicativo usa armazenamento local do navegador apenas para preferências (tema, configurações, marcadores de onboarding). Não há rastreamento publicitário. [Revisar caso o site comercial adote ferramenta de análise.]

Versão da minuta: 12/11/2026.
