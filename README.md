# Inteligent Hability 3.5 — Tutor Cognitivo Local

© 2026 Nailson Rodrigues de Lima. Todos os direitos reservados.

**Finalidade:** aplicativo educacional offline para crianças de 5 a 12 anos, dividido nas faixas 5–7, 8–10 e 11–12 anos. Esta edição é **funcional para piloto supervisionado**, mas ainda depende de validação pedagógica independente, dispositivos reais, acessibilidade assistiva e análise jurídica da distribuição comercial.

## Como executar

- **Sem instalação:** abra `Inteligent_Hability_V3_5_Standalone.html` com navegador atualizado, inclusive no Windows ou no Android por meio de um gerenciador de arquivos que permita abrir HTML local. A disponibilidade varia com o navegador e as restrições de arquivos locais.
- **Versão modular:** abra `index.html` com todos os arquivos `.js`, `styles.css`, `favicon.svg` e a pasta `assets` preservados juntos. Também pode publicar a pasta modular integral em hospedagem estática HTTPS.
- O app não precisa de Python, Node.js, servidor, internet, login, conexão de API, chave ou pagamentos durante a operação.
- Na primeira utilização, escolha **Modo temporário** ou permita armazenamento local após a participação do responsável. O segundo modo é uma escolha local e não comprova identidade nem consentimento verificável.

## Novidades reais da 3.5

1. Motor `IHAdvancedAI` com detecção lexical melhorada de conceitos e intenções, recuperação de conteúdo complementar e continuidade de assunto **somente na memória da sessão**.
2. **33 conceitos adicionais**, com explicações, exemplos, pergunta para reflexão e pistas, distribuídos por faixa etária e área. A aplicação anterior já continha 75 desafios, 15 miniaulas, 30 temas aprofundados, 45 flashcards, 12 laboratórios e 9 missões.
3. Interpretação restrita e explicável de problemas verbais de **adição, subtração, multiplicação e divisão**, além das operações matemáticas já implementadas na 3.4. Questões ambíguas devem gerar pedido de especificação, nunca um chute numérico.
4. Modo de investigação guiada e pista, sem oferecer automaticamente a solução final.
5. Gerador de práticas com parâmetros variados, para três faixas; exercícios numéricos com validação de respostas e exercícios de múltipla escolha ligados à biblioteca. Após erro, fornece primeiro uma pista; após nova tentativa, explica a solução.
6. Planejamento de estudo que utiliza tentativas de desafios e contadores agregados de acertos da oficina; **não diagnostica capacidade, inteligência ou condição da criança**.
7. Novos dados armazenáveis: apenas número de tentativas e acertos da oficina por faixa e área. O texto livre das perguntas do tutor não é gravado no estado nem exportado nos backups.
8. Acessibilidade existente preservada, identidade visual e logomarca mantidas; documentos legais atualizados em relação aos novos contadores e à memória efêmera.

## Limites honestos da IA

O motor é **IA simbólica local**, na acepção prática de regras de inferência e recuperação de conhecimento. **Não** é um modelo neural de linguagem nem possui treinamento contínuo, criatividade irrestrita, compreensão aberta da linguagem natural ou validação clínica. Um modelo generativo local real exigiria distribuição opcional de pesos de modelo, memória, aceleração/CPU e validação adicionais, o que não integra este pacote.

O reconhecimento de dados sensíveis e situações de risco é básico, não infalível. O tutor não substitui professor, responsável, psicólogo ou serviços de emergência.

## Privacidade e backups

Sem ativação de armazenamento, o progresso é apenas temporário. Ativado o salvamento, usa `localStorage` do navegador e exportação/importação JSON. O backup pode conter textos escritos no laboratório e, portanto, requer cuidado no armazenamento; crianças não devem inserir nomes completos, localização, contatos, senhas ou outras informações pessoais. Os resultados da oficina são armazenados somente como contadores agregados por área e faixa.

Para distribuição web, regras de hospedagem, logs do servidor, fornecedores, suporte e obrigações de proteção de crianças precisam ser analisadas novamente. Consulte Termos, Política de Privacidade e a Avaliação de Conformidade.

## QA reproduzível para desenvolvedores

Na pasta `qa/` existem testes que podem ser executados em ambiente de desenvolvimento com Node.js e, opcionalmente, Python + Playwright/Chromium:

```
node qa/test_engine.js
node qa/test_ai35.js
node qa/test_catalog35.js
python qa/test_browser_v35.py
```

Os quatro comandos passaram no ambiente de avaliação. O teste de navegador usa armazenamento simulado por bloqueio da navegação na infraestrutura de testes. A tentativa com HTTP local foi bloqueada por política do ambiente antes de carregar os arquivos; não é evidência de falha do app, nem comprova teste de `localStorage` em dispositivo real.

## Publicação e venda

A implantação comercial requer identificação do fornecedor/controlador, atendimento a titulares, revisão jurídica de LGPD/ECA Digital/CDC, ensaios com crianças acompanhadas por responsáveis e validação pedagógica especializada de toda a biblioteca. Não se afirma homologação comercial ou certificação jurídica.
