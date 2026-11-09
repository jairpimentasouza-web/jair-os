# Capacidade e custos

> Estimativas, não medições. Os preços unitários abaixo são valores de tabela de referência
> **a confirmar** em `cloud.google.com/firestore/pricing` para a região real do projeto
> (São Paulo costuma ser mais cara que `nam5`). As fórmulas permitem recalcular.

## Premissas por professor ativo

| Item | Valor assumido |
|---|---|
| Alunos ativos | 20 |
| Aulas por mês | 35 (≈ 420 por ano, acumulando) |
| Aberturas do app por dia | 6 (celular + computador) |
| Outros documentos do tenant | ≈ 200 (alunos, pacotes, despesas, leads, solicitações) |
| Gravações por mês | ≈ 200 (aulas, presença, pagamento, sincronização Google) |

## Leituras: o fator dominante

O cliente V4 abre *listeners* sobre **coleções inteiras** do tenant, sem paginação nem cache
persistente. Cada abertura relê todo o histórico de aulas:

```
leituras/mês ≈ aberturas/mês × (aulas_acumuladas + 200 + ~12 get() das regras) + ~3 × gravações
```

| Momento | Aulas acumuladas | Leituras/mês por professor |
|---|---:|---:|
| Fim do 1º ano | 420 | ≈ 115 mil |
| Fim do 2º ano | 840 | ≈ 190 mil |
| Com otimização (janela de 90 dias + cache persistente) | ≈ 150 relidas | ≈ 25–40 mil |

## Projeção mensal de infraestrutura (sem otimização, histórico de 1 ano)

Referência: leitura US$ 0,06 / 100 mil; gravação US$ 0,18 / 100 mil; cota gratuita diária de
50 mil leituras e 20 mil gravações.

| Professores | Leituras/mês | Firestore | Auth (e-mail/senha)* | Hosting + Functions | Total aproximado |
|---:|---:|---:|---|---|---:|
| 10 | 1,15 mi | ≈ US$ 0 (cota gratuita) | sem custo | sem custo | **≈ US$ 0** |
| 100 | 11,5 mi | ≈ US$ 6 | sem custo | sem custo | **≈ US$ 7** |
| 1.000 | 115 mi | ≈ US$ 68 | sem custo | ≈ US$ 2 | **≈ US$ 70** |
| 10.000 | 1,15 bi | ≈ US$ 690 (≈ US$ 1.140 no 2º ano) | ≈ 40 mil MAU com famílias; perto do limite sem custo | ≈ US$ 15 | **≈ US$ 700–1.200** |

\* Confirmar o limite de usuários ativos mensais sem custo do Firebase Authentication/Identity Platform.

Custo de infraestrutura por assinante: **≈ US$ 0,07–0,12/mês**, abaixo de 3% do preço do
Essencial. Com a otimização de leituras, cai para ≈ US$ 0,02.

## Custos que pesam mais que a infraestrutura

| Item | Natureza | Estimativa | Fonte |
|---|---|---|---|
| Tarifa do meio de pagamento | variável | ≈ 4–5% + tarifa fixa por cobrança | **não verificada** (ver PAGAMENTOS.md) |
| Tributos sobre a receita | variável | depende do regime (ex.: Simples Nacional) | confirmar com contador |
| Suporte ao cliente | variável | principal custo real em escala | medir no piloto |
| Revisão jurídica (termos, privacidade, contrato de operador) | fixo, pontual | — | orçamento externo |
| Domínio, e-mail transacional, contabilidade | fixo | — | — |
| IA (assistente) | variável | **não implementado**; exigir teto por tenant antes de ativar | — |

Margem de contribuição indicativa (Profissional, R$ 49,90): preço − tarifa de pagamento −
tributos − infraestrutura. A infraestrutura é irrelevante na conta; tarifa e tributos dominam.

## Ações recomendadas, por impacto

1. Limitar os *listeners* de aulas a uma janela (ex.: 90 dias para trás + futuro) e paginar o histórico sob demanda.
2. Habilitar cache persistente do Firestore (`persistentLocalCache`) para que reaberturas leiam só o que mudou.
3. Gravar papel e tenant como *custom claims* (backend) para eliminar os `get()` das regras.
4. Alertas de orçamento no Google Cloud Billing (50%, 90%, 100%) e cota de leituras por tenant monitorada.
5. Medir o consumo real no piloto antes de confirmar preços.
