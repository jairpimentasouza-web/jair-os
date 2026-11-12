# ProfGestor V5

Gestão de aulas particulares (agenda, alunos, financeiro, pacotes, CRM, acompanhamento
pedagógico, portal da família) evoluindo do V4 pessoal para um SaaS multitenant.

**Estado:** não publicado. 116 testes automatizados aprovados em emulador local. Ver [docs/STATUS.md](docs/STATUS.md).

## Estrutura

```
web/                 app (sem build): baseline V4 + correções V5
  PROVENANCE.md      origem e hashes do baseline capturado de produção
firestore.rules      isolamento por tenant, papéis, direito de uso
storage.rules        arquivos por tenant
functions/           backend de assinaturas (Stripe principal, Mercado Pago alternativo)
tools/migrate-v5.mjs migração com inventário, backup, dry-run, verificação e rollback
tests/unit           fórmulas dos indicadores
tests/emulator       regras, Storage, migração, cobrança (Firebase Emulator)
tests/e2e            app real no Chromium contra os emuladores
site/                página comercial (separada do app) e capturas de tela
tools/capturar-telas.mjs  gera as capturas do site a partir do app real (dados fictícios)
docs/                auditoria, arquitetura, migração, pagamentos, custos, LGPD, status
docs/legal/          minutas de termos, privacidade e contrato de operador (para revisão jurídica)
```

## Rodar os testes

Requisitos: Node 22 e Java 21 (emuladores). Nada acessa produção.

```bash
npm ci && (cd functions && npm ci)
```
```bash
npm test
```
```bash
npm run test:e2e
```

Para abrir o app contra os emuladores: suba `npx firebase emulators:start --only auth,firestore --project demo-profgestor`,
sirva `web/` em `http://localhost:PORTA` e acesse `index.html?emulator=1`. O modo emulador só é
ativado em `localhost` e usa um projeto `demo-`, que não corresponde a recurso real.

## Operação e suporte (após publicação)

| Tarefa | Como |
|---|---|
| Liberar o cadastro self-service | Backend grava `platformConfig/public` `{ selfSignupOpen: true }` (o cliente não consegue) |
| Abrir as assinaturas no app | `platformConfig/public.billingEnabled = true` — só depois das Functions publicadas e testadas |
| Mostrar o botão de Pix de aula | `platformConfig/public.pixAulaEnabled = true` — só depois de existir `criarCobrancaPix` |
| Conceder administração da plataforma | Backend cria `platformAdmins/{uid}` — não dá acesso ao conteúdo dos tenants |
| Isentar uma conta de cobrança | Backend define `organizations/{org}.billingExempt = true` |
| Revogar acesso de um responsável | Admin do tenant desativa o perfil (`ativo: false`) ou apaga o convite |
| Conferir cobrança de um cliente | `organizations/{org}.entitlement` e `billingEvents` com o `orgId` |
| Corrigir divergência de assinatura | Reconciliação diária automática; ou reenviar o evento pelo painel do provedor (idempotente) |
| Migração, publicação e rollback | [docs/MIGRACAO.md](docs/MIGRACAO.md) |

## Documentos

[Auditoria](docs/AUDITORIA.md) · [Arquitetura](docs/ARQUITETURA.md) · [Migração e rollback](docs/MIGRACAO.md) ·
[Pagamentos](docs/PAGAMENTOS.md) · [Custos](docs/CUSTOS.md) · [LGPD](docs/LGPD.md) · [Status](docs/STATUS.md) · [Minutas legais](docs/legal/)

## Site comercial

`site/` é estático e independente do app. Publique-o num destino próprio (outro site do
Firebase Hosting ou outro domínio) somente após a revisão jurídica. Os links apontam para
`https://gestao-aulas-jair.web.app`; ajuste se o domínio do app mudar. Para refazer as
capturas: `npm run site:telas`.
