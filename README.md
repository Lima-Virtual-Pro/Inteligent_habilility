# Inteligent Hability 3.6 — biblioteca local orientada por fontes

**© 2026 Nailson Rodrigues de Lima.** Todos os direitos reservados.

## Iniciar

- Abra `Inteligent_Hability_V3_6_Standalone.html` em navegador atualizado, sem instalar dependências. A operação principal funciona offline.
- Alternativamente, use `index.html` mantendo juntos CSS, JS e `assets/`, ou hospede o conteúdo estático em HTTPS.
- A biblioteca inclui uma seleção de links a fontes oficiais; eles **só** exigem acesso à internet se o usuário optar por abri-los.
- Acesse **Biblioteca confiável**, pesquise um assunto, veja a explicação e a referência e clique em “Conversar com o tutor”.

## Acervo e evolução

- **179 registros consultáveis:** 41 conceitos curados para 3.6, 30 temas complementares, 33 conceitos de 3.5 e 75 perguntas e respostas comentadas da nova versão.
- **150 desafios de múltipla escolha** no total (75 anteriores + 75 novos), distribuídos por 3 faixas etárias e 5 áreas.
- **60 temas aprofundados**, 15 miniaulas, 15 missões, 24 laboratórios e flashcards gerados a partir das aulas. Não contabilizar combinações automáticas como questões inéditas manualmente escritas.
- **7 referências institucionais** com natureza de uso documentada: orientação geral ou apoio direto ao assunto.
- Pesquisa local com sinônimos, filtros de idade, área, contexto efêmero, pistas graduais, link voluntário às fontes e recusa por insuficiência de informação.

## Inteligência implementada e limites

O tutor é **simbólico e determinístico**, construído com regras e catálogos locais. Não utiliza modelos neurais generativos, LLM embutido, buscas automáticas na web ou atualização em tempo real. Não assegura respostas a toda pergunta, precisão universal, domínio de conteúdos médicos, aconselhamento individualizado ou certificação pedagógica. Pode haver ambiguidades, erros de linguagem e conceitos desatualizados.

## Proteção e uso infantil

O sistema oferece modo sem armazenamento, opção de salvamento local mediante declaração do responsável, backup, exclusão, avisos de limite do tutor e orientação para não inserir dados pessoais. A declaração simples não é um sistema confiável de verificação de identidade/parentalidade. Não há transmissão automática de conversas pela aplicação. Abrir links para fontes externas é uma ação voluntária e implica saída do contexto totalmente offline.

## QA reproduzível

Em ambiente de desenvolvimento, use Node.js e Python+Playwright+Chromium (essas dependências não são necessárias para usar o aplicativo):

```
node qa/test_source36.js
node qa/test_engine.js
node qa/test_ai35.js
node qa/test_catalog35.js
python qa/test_browser36.py
```

O relatório `QA_RELATORIO_V3_6.md` apresenta os resultados observados e ressalva testes não feitos. O navegador automatizado usa armazenamento simulado, não equivale a validação em aparelhos reais. É necessária revisão humana especializada da biblioteca antes de publicação comercial.
