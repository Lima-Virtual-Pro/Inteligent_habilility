# Diagnóstico e QA — Inteligent Hability v3.5

Data: 13/10/2026. Responsabilidade de autoria: Nailson Rodrigues de Lima.

## Escopo

Evolução sobre a 3.4, sem remover desafios, miniaulas, mapas, flashcards, laboratório, missões, configuração de privacidade, exportação/importação, autoria e política/termos. IA local simbólica complementa `local_ai.js` e o conteúdo pedagógico previamente escrito.

## Resultados reproduzíveis

| Pacote de testes | Aprovação | Método |
|---|---:|---|
| Motor 3.4, regressão | **44/44** | Node.js, `qa/test_engine.js` |
| Motor cognitivo 3.5 | **57/57** | Node.js, `qa/test_ai35.js` |
| Interface, acessibilidade básica, módulos anteriores, privacidade e novos controles | **67/67** | Chromium/Playwright, `qa/test_browser_v35.py` |
| Geração/correção repetida de prática | **375/375** | Node.js, `qa/test_catalog35.js` (25 casos × 5 áreas × 3 faixas) |

**Total: 543 casos/verificações automatizadas aprovados.** São ensaios técnicos; não equivalem a 543 avaliações pedagógicas independentes.

## Erros detectados e corrigidos nesta iteração

1. **Interpretação incorreta de enunciado:** “3 caixas com 4 itens em cada, quantos ao todo?” era classificado como soma, produzindo 7. A precedência de contexto passou a reconhecer agrupamento/multiplicação antes de marcadores genéricos de total; a bateria regressiva passou.
2. **Contexto após trocar faixa ou área:** memória cognitiva e atividade aberta agora são redefinidas quando a faixa muda e o contexto é reiniciado na troca manual de área.
3. **Risco de perda de resposta de erro:** testada proteção para dados pessoais, orientação de risco à criança e enunciados fora da biblioteca; assunto não reconhecido recebe pedido de especificação.
4. **Armazenamento do tutor:** os únicos novos campos persistentes são contadores de tentativas e acertos por área/faixa, com limites e lista autorizada de chaves na validação de backup.
5. **Teste assíncrono de importação:** o teste de UI antigo verificava conteúdo antes da atualização assíncrona e podia produzir falso negativo; corrigido o teste para aguardar retorno visível.

## Análise adicional

- HTML standalone incorpora scripts, estilos e imagens; política de segurança (CSP) utiliza hashes SHA-256 dos scripts embutidos e não autoriza conexões externas.
- Teste em telas **320, 360, 390, 768 e 1.280 pixels** sem transbordamento horizontal nas principais vistas. Não foram registrados erros JS nem pedidos externos durante os testes de interface.
- Os cálculos são determinísticos e numericamente limitados; não se utiliza `eval` ou execução de expressões arbitrárias do usuário.
- Respostas do tutor apresentam fonte/tipo de inferência e distinguem suporte verificado de dúvidas fora da biblioteca.

## Restrições e pendências

- O teste Playwright de interface utilizou uma implementação temporária de armazenamento local por restrição da infraestrutura. Não deve ser citado como validação do `localStorage` real.
- Um ensaio adicional contra servidor HTTP local foi **impedido pela política do navegador sandbox (`ERR_BLOCKED_BY_ADMINISTRATOR`) antes do carregamento**. Não foi possível concluir a verificação real com recarregamento e retenção nesta infraestrutura.
- Faltam validação com professoras(es), revisão dos enunciados conforme BNCC e faixa etária por especialistas, avaliação de acessibilidade com leitor de tela/teclado em diversos sistemas, teste de longa duração em dispositivos Android/Windows, análise de segurança por terceiro e revisão jurídica da operação comercial.
- A biblioteca complementar é conceitual e limitada. O sistema **não** contém modelo neural treinado, pesos de rede ou capacidade de generalizar a qualquer pergunta.

## Aprovação

**Aprovado para demonstração técnica e piloto supervisionado. Não homologado para venda a público infantil sem etapas externas adicionais.**
