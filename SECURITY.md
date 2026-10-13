# Política de Segurança

## Escopo deste repositório

Este repositório é uma **vitrine sanitizada** do JOS. Ele contém apenas documentação pública, estudos de caso e páginas estáticas de produto. Não contém:

- credenciais, tokens, chaves de API ou segredos;
- dumps de banco, backups ou exportações de dados;
- dados pessoais de alunos, responsáveis, clientes ou terceiros;
- endpoints administrativos, nomes de funções internas ou identificadores de infraestrutura;
- código operacional do runtime, dos agentes de desktop ou das integrações.

O código operacional e os dados vivem em ambientes privados, com Row Level Security em todas as tabelas, segredos em cofre (vault) e aprovação humana para ações de risco.

## Como reportar uma vulnerabilidade

1. **Não abra issue pública** com detalhes exploráveis.
2. Use o recurso **"Report a vulnerability"** (Security Advisories privados) deste repositório no GitHub.
3. Descreva o impacto, os passos para reproduzir e, se possível, uma sugestão de correção.

Compromissos de resposta (melhor esforço, projeto mantido por uma pessoa):

| Etapa | Prazo-alvo |
|---|---|
| Confirmação de recebimento | até 5 dias úteis |
| Avaliação inicial e severidade | até 10 dias úteis |
| Correção de severidade alta/crítica | até 30 dias |

## Páginas estáticas de produto

As landing pages publicadas via GitHub Pages:

- não coletam dados de cartão (pagamento ocorre na plataforma de checkout externa);
- só ativam pixel de medição de anúncios **após consentimento explícito** do visitante;
- repassam ao checkout apenas parâmetros de origem permitidos (UTM), com limite de tamanho;
- trazem link para a [Política de Privacidade](docs/privacidade.html), que descreve dados, bases legais da LGPD e direitos do titular.

## Continuidade

O ambiente operacional tem backup lógico diário fora da plataforma principal, com verificação de integridade por SHA-256, teste automático de restaurabilidade, retenção de 14 cópias e alerta quando o último backup verificado passa de 26 horas.

## Referências adotadas

OWASP ASVS e OWASP Top 10 for LLM Applications, NIST CSF 2.0, CIS Controls v8 e LGPD (Lei 13.709/2018) como referências de controle. A adoção é declarada como alvo de engenharia, não como certificação.
