# Política de segurança

## Escopo deste repositório

Este repositório é a versão pública e sanitizada do JOS. Ele contém documentação de arquitetura, estudos de caso e páginas estáticas de produtos (por exemplo, `escala5x2/`). O runtime operacional, os dados e as credenciais ficam fora daqui.

O que **não** deve ser versionado aqui:

- chaves secretas, tokens de serviço (`service_role`, `sb_secret_*`), senhas ou cookies;
- dumps de banco, exportações de planilhas ou dados pessoais de alunos, responsáveis e clientes;
- código de Edge Functions, migrações SQL ou endpoints administrativos.

A chave pública (`anon`/publishable) do Supabase pode aparecer no front-end por definição: ela não concede acesso sem as políticas de RLS do banco.

## Controles aplicados

- Row Level Security em todas as tabelas expostas, com negação explícita para tabelas internas.
- Funções `SECURITY DEFINER` com `search_path` fixo e verificação de identidade (`auth.uid()`) no corpo.
- Vínculos por e-mail (convites, papéis administrativos e compras) exigem e-mail confirmado no Supabase Auth.
- Segredos de integração no Supabase Vault; webhooks validados por HMAC ou token com comparação em tempo constante.
- Content Security Policy nas páginas estáticas que acessam o backend.
- Análise estática (CodeQL) semanal e em pull requests; ações do GitHub fixadas por SHA e atualizadas pelo Dependabot.

## Como reportar uma vulnerabilidade

Não abra issue pública. Use o recurso **Security → Report a vulnerability** deste repositório (GitHub Private Vulnerability Reporting) ou entre em contato diretamente com o mantenedor.

Inclua os passos para reproduzir, o impacto observado e, se possível, uma sugestão de correção. O objetivo é responder em até 7 dias.
