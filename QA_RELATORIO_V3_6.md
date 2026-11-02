# Relatório de QA — Inteligent Hability v3.6

**Data:** 13/10/2026. **Escopo:** sintaxe, integridade de catálogo, regras do tutor, busca orientada por fontes, regressão e navegador isolado.

## Resultados verificáveis desta execução

- `qa/test_source36.js`: **34/34 testes aprovados**, incluindo fontes, idade, catálogo, cálculos, privacidade, recusas e contexto.
- `qa/test_engine.js`: **44/44 testes anteriores aprovados** (regressão do motor local 3.4).
- `qa/test_ai35.js`: **57/57 testes de IA anterior aprovados**.
- `qa/test_catalog35.js`: **375/375 ciclos automáticos de exercícios aprovados** (checagem de cálculo/estrutura, não revisão didática humana).
- `qa/test_browser36.py`: **28/28 testes de navegação aprovados** de 320 a 1.280 px; sem erros de console da aplicação e sem acesso automático a serviços externos durante os testes.
- Validação sintática de JavaScript e construção HTML standalone com hashes CSP. 

## Natureza do QA — limitações

- Os 75 desafios novos passaram por verificação estrutural automatizada: 3 opções distintas, gabarito em intervalo, explicação, duas pistas e distribuição nas faixas. Isso **não comprova que todos os gabaritos estão conceitualmente corretos, unívocos ou pedagogicamente adequados**.
- A busca emprega comparação lexical com sinônimos e tem risco de falso positivo, particularmente em perguntas longas ou homônimos. O tutor não é IA neural; não há compreensão irrestrita ou treinamento autônomo.
- Os testes em navegador foram executados por meio de conteúdo HTML carregado em navegador isolado e armazenamento `localStorage` simulado. **Não foi validada persistência em aparelho real ou em origem HTTP/HTTPS externa**, nem testes de usuário, leitor de tela ou público infantil.
- Acurácia global e poder de resolutividade não foram medidos com amostra independente de dúvidas reais. Requer avaliação humana em todas as cinco áreas e três faixas.
- Links institucionais foram conferidos como endereços de fontes temáticas. Não existe sistema automático de checagem de conteúdo, validade atual ou alinhamento de cada questão com códigos específicos da BNCC.

## Critérios de liberação para venda

Verificar acessibilidade assistiva e navegação por teclado com usuários; revisar amostra abrangente de itens e gabaritos com especialistas; verificar armazenamento em navegador e Android/Windows; testar os termos, a privacidade, direitos de crianças e hospedagem escolhida; registrar responsáveis por atualização de acervo e canal de correção.

## Reprodução

`node qa/test_source36.js && node qa/test_engine.js && node qa/test_ai35.js && node qa/test_catalog35.js && python qa/test_browser36.py`
