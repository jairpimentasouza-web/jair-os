# Proveniência do baseline V4

Os arquivos desta pasta foram baixados de `https://gestao-aulas-jair.web.app/` em
2026-11-09 21:22 UTC (cabeçalho `last-modified` do `index.html`: 2026-09-07 05:46:50 GMT).
O código-fonte original do ProfGestor não estava em nenhum repositório acessível nesta
sessão; o bundle publicado não tem etapa de build (é JavaScript ES module servido como
está), então ele é o próprio código-fonte em execução.

| Arquivo | SHA-256 no momento da captura |
|---|---|
| index.html | 94081e2a15c4f65ef490500a79bf3f0b0122a35eb7d99220a560f604742ed29c |
| src/app.js | 7d4fe2b3097b251271b90aa842b707998a8cb52118dad4630edf4839a5857d63 |
| src/v4.js | 9be96e06edccc5113d226b8f4ffbf465477ed542608ca15c27d62174b33e2deb |
| assets/app.css | 1e36a028081fcbb2ee10e7e8b1665cb0d7ac936d1d95f53befa535f523a1cf95 |
| assets/v4.css | 4f9bfac825631b6c9cbe727bec0cdae75c2cdaf2df6afda401cecf5579360843 |
| sw.js | aef7d074bb0e649dc5df213eda8e15e6e292b9c1370ec76a15b029d3af4b83a1 |
| manifest.webmanifest | b2944dfdb6ebd1253847749a4bdf38dfef853bdbf12ddf7b1bb4e7c5885f61ce |

**Ausente em produção:** `src/v4-features.js` é referenciado pelo `index.html` e pelo
service worker, mas o Hosting devolve o próprio `index.html` nesse caminho (rewrite de SPA).
O navegador recebe HTML como JavaScript, gera erro de sintaxe e todas as funções que esse
arquivo deveria definir (`renderCRM`, `renderAulasOperacao`, indicadores do painel, ficha
360) ficam indefinidas.

Não foram capturados: `firebase.json`, `firestore.rules`, `storage.rules`, índices e
Cloud Functions. Eles não são públicos e esta sessão não tem credenciais do projeto
`gestao-aulas-jair`.
