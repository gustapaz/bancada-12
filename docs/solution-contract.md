# Bancada 12

Modo integrado. A oficina recebe objetos, diagnostica, repara e libera a retirada. A referência é o [fluxo de cartões do Trello](https://trello.com/guide/trello-101), adaptado para uma fila linear com ficha de bancada, sem reproduzir as colunas ou a marca do Trello. O acervo inicial e os objetos são fictícios.

GET /api/bench devolve {version,tickets}. POST /api/bench recebe uma ação create com título e relato, ou advance com id e uma confirmação de verificação. Ambas levam version. As etapas são sequenciais, a saída de diagnóstico exige confirmação, e a retirada encerra a ficha. O servidor rejeita entradas inválidas e retorna 409 para versão vencida.

O cabeçalho X-Bench recebe UUID aleatório da bancada. D1/SQLite guarda as mudanças isoladas por navegador com gravação condicional. Limite de 15 fichas, 100 alterações por bancada, 2.000 bancadas e expiração em sete dias após a última gravação. Dados iniciais sintéticos. Sem dados pessoais, cobranças ou integração externa. Svelte no cliente, Valibot no contrato de entrada e Worker com SQLite/D1.
