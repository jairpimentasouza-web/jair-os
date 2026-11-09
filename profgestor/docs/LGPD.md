# Privacidade e LGPD — material para revisão jurídica

> Documento técnico preparado para revisão por profissional habilitado. **Não constitui
> parecer jurídico nem declaração de conformidade.**

## Papéis no tratamento (proposta)

| Relação | Controlador | Operador |
|---|---|---|
| Dados de alunos e responsáveis tratados pelo professor | **Professor assinante** | ProfGestor (plataforma) |
| Dados cadastrais e de cobrança do professor | ProfGestor | Stripe/Mercado Pago, Google (Firebase) |

Consequência prática: o ProfGestor precisa de **contrato de operador (DPA)** com cada
assinante, termos de uso e política de privacidade próprios, e lista pública de suboperadores.

## Inventário de dados

| Categoria | Exemplos | Onde | Quem acessa |
|---|---|---|---|
| Identificação do aluno (frequentemente **menor**) | nome, telefone, disciplina | `alunos` | equipe do tenant; família do próprio aluno |
| Acompanhamento pedagógico | presença, conteúdo, dificuldades, tarefas | `aulas` | idem |
| Financeiro da relação aluno–professor | valores, status de pagamento | `aulas`, `pacotes`, `despesas` | equipe (despesas: só equipe) |
| Responsáveis | nome, e-mail | `usuarios`, `convites` | admin do tenant |
| Prospecção | nome, telefone, interesse, origem | `leads` | equipe do tenant |
| Professor (cliente da plataforma) | nome, e-mail, assinatura | `usuarios`, `organizations` | o próprio; admin da plataforma (só cobrança) |

Não há dados de cartão no ProfGestor (checkout hospedado pelo provedor).

## Crianças e adolescentes (art. 14)

- Acesso da família limitado ao `alunoId` vinculado, com e-mail verificado (testado).
- Recomendações pendentes: consentimento específico de um dos pais/responsável para menores
  de 12 anos quando a base legal exigir; separar observações privadas do professor dos
  documentos visíveis à família; não enviar dados de alunos a provedores de IA sem base
  legal, transparência e contrato.

## Direitos dos titulares — suporte técnico existente e pendente

| Direito | Situação |
|---|---|
| Acesso / portabilidade | Leitura permitida mesmo após vencimento da assinatura; **exportação estruturada (JSON/CSV) pelo app: pendente** |
| Eliminação | Exclusão permitida pelas regras mesmo após vencimento; **exclusão em cascata da conta do professor (dados + Auth): pendente** |
| Correção | Edição pela equipe do tenant |
| Revogação de acesso da família | Admin do tenant desativa o perfil (`ativo: false`) — testado |

## Segurança aplicada

Isolamento por tenant nas regras (testes negativos), menor privilégio por papel, auditoria
somente-inserção (`auditLogs`), webhooks autenticados, segredos fora do código (Secret Manager),
backups verificáveis. **Pendente**: política de retenção configurável, registro de acessos
excepcionais do suporte, plano de resposta a incidentes formalizado (comunicação à ANPD e aos
titulares), revisão de logs para não conter dados pessoais.

## Suboperadores e localização

Google Firebase (Hosting, Auth, Firestore, Functions — região a confirmar; as Functions foram
configuradas em `southamerica-east1`), Stripe ou Mercado Pago (cobrança), Google Calendar
(opcional, por escolha do professor). Transferência internacional depende da região do
Firestore e dos provedores — avaliar na revisão jurídica.
