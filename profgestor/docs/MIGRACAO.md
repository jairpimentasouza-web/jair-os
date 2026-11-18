# Migração V4 → V5, publicação e recuperação

> Nada disto foi executado em produção. A ferramenta foi testada apenas no emulador local
> (9 testes). Cada etapa de produção exige autorização do proprietário.

## Ordem obrigatória

**Migrar antes de publicar as regras.** As regras V5 exigem `organizations/org_jair` com
`billingExempt: true` e `organizationId` em todos os perfis. Publicar as regras antes da
migração **bloqueia a conta original** (comprovado pelo teste
"sem migração, as regras V5 bloqueiam a conta original").

## 0. Pré-requisitos

1. Criar um projeto Firebase de **homologação** separado (ex.: `profgestor-homolog`) e preencher `.firebaserc`.
2. Pausar o agente de agenda do Jair OS durante a janela de migração (ele grava em produção pelo Admin SDK).
3. Credenciais: conta de serviço com papel mínimo `roles/datastore.user` no projeto alvo (`GOOGLE_APPLICATION_CREDENTIALS`).
4. Export nativo agendado como segunda linha de defesa:
   ```bash
   gcloud firestore export gs://BUCKET-DE-BACKUP/$(date +%F) --project gestao-aulas-jair
   ```

## 1. Ensaio em homologação (cópia dos dados de produção)

```bash
gcloud firestore import gs://BUCKET-DE-BACKUP/AAAA-MM-DD --project profgestor-homolog
```
```bash
node tools/migrate-v5.mjs inventory --production --project profgestor-homolog > inventario.json
```
Revisar no inventário: `usuarios.semOrganizationId`, documentos `(sem organizationId)`,
`aulasPossivelmenteDuplicadas`, `aulasSemAlunoExistente`, `pacotesComConsumoDivergente`.
Decidir caso a caso; a ferramenta **não** apaga nem funde registros.

```bash
node tools/migrate-v5.mjs backup --out backups/homolog-AAAA-MM-DD --production --project profgestor-homolog
```
```bash
node tools/migrate-v5.mjs plan --backup backups/homolog-AAAA-MM-DD --production --project profgestor-homolog
```
```bash
node tools/migrate-v5.mjs apply --backup backups/homolog-AAAA-MM-DD --production --project profgestor-homolog --i-have-verified-the-backup
```
```bash
node tools/migrate-v5.mjs verify --backup backups/homolog-AAAA-MM-DD --production --project profgestor-homolog
```
Depois: `firebase deploy --only firestore:rules,storage,hosting --project staging` e uso real
(login do proprietário, agenda, financeiro, portal da família). Ensaiar também o rollback.

## 2. Produção (somente com autorização)

Mesma sequência com `--project gestao-aulas-jair`. Travas da ferramenta:
- sem `FIRESTORE_EMULATOR_HOST`, exige `--production --project`;
- `apply` exige `--i-have-verified-the-backup` e backup com **no máximo 60 minutos**;
- `apply` recalcula o plano e **recusa** se os dados mudaram desde o plano revisado;
- o backup confere contagem e SHA-256 antes de qualquer uso.

Em seguida, publicar nesta ordem: regras (`firestore:rules`, `storage`) → hosting → functions (somente após configurar a cobrança; ver PAGAMENTOS.md).

## 3. Recuperação e rollback

| Situação | Ação |
|---|---|
| Regras novas bloqueiam uso legítimo | Console Firebase → Firestore → Regras → histórico → publicar a versão anterior (efeito em ~1 min) |
| Hosting com defeito | Console Firebase → Hosting → histórico de versões → reverter |
| Migração precisa ser desfeita, preservando o que foi gravado depois | `node tools/migrate-v5.mjs rollback --backup DIR --apply ...` (modo `migration`: remove só o que o plano adicionou) |
| Corrupção de dados: voltar exatamente ao backup | `rollback --mode full --apply` (**descarta** tudo gravado após o backup) ou `gcloud firestore import` do export nativo |
| Webhook de cobrança com defeito | Desativar o endpoint no painel do provedor; eventos são reenviados depois e o processamento é idempotente; a reconciliação diária corrige divergências |

Antes de qualquer rollback total, faça um novo backup do estado atual.
