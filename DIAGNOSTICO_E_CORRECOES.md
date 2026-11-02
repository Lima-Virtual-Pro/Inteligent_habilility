# Diagnóstico e correções — Inteligent Hability 3.3

**Data da avaliação:** 13/10/2026  
**Autoria identificada no aplicativo:** © 2026 Nailson Rodrigues de Lima  
**Origem revisada:** pasta `Inteligent_Hability_V3_2`, recebida após interrupção da atualização.

## Defeitos observados e reparos

1. **Dois conjuntos de Termos de Uso e Política de Privacidade no mesmo HTML:** os identificadores `termos`, `privacidade`, `titulo-termos` e `titulo-privacidade` estavam repetidos. O menu também apresentava duas entradas para cada documento. **Correção:** removidas as seções e entradas duplicadas, preservados os documentos mais completos e atualizados e testada a abertura no menu e no diálogo inicial.
2. **Tutor exibindo tópico aprofundado quando a seleção era “Aula principal”:** o código convertia `value=""` em `Number('') === 0`. **Correção:** o valor vazio é tratado como a aula geral; os tópicos têm seleção explícita.
3. **Validação inconsistente do botão “Perguntar”:** um evento JavaScript podia ser interpretado como intenção predefinida, impedindo o bloqueio de pergunta vazia. **Correção:** invocação explícita do tutor sem parâmetros; teste com texto vazio e pergunta completa.
4. **Histórico de decisões das missões:** o aplicativo guardava `choices:[]` após conclusão, perdendo as alternativas selecionadas. **Correção:** as escolhas são acumuladas ao longo de cada missão e preservadas no backup.
5. **CSP do standalone:** uma política restritiva precisava ser compatibilizada com estilos dos indicadores de progresso. **Correção:** criação dos indicadores sem atributo HTML `style` e atualização via CSSOM; scripts e estilo incorporados com hashes CSP específicos. Foi removida a diretiva `frame-ancestors` do metadado HTML, pois não é suportada ali; a proteção contra incorporação precisa de cabeçalho HTTP do servidor de hospedagem.
6. **Mensagem genérica em navegadores sem armazenamento local:** falha de acesso era confundida com backup corrompido. **Correção:** diferenciadas indisponibilidade de armazenamento e corrupção/incompatibilidade de dados, sem apagar progresso potencialmente recuperável.
7. **Versão exibida no rodapé:** atualizada para 3.3.

**Importante:** os defeitos são fatos observados no código após a interrupção; não é possível demonstrar que a queda da rede foi a causa específica.

## QA aplicado

- Sintaxe JavaScript analisada (`node --check`) e referências internas/IDs conferidas.
- Testes automatizados de interface no Chromium: **22 de 22 verificações aprovadas** — privacidade, políticas, menu, desafios, tutor, aulas, flashcards, mapas, laboratório, missões, exportação JSON, exclusão e ausência de erros de JavaScript.
- Testes adicionais: gravação local, interrupção da gravação e importação de backup JSON passaram com armazenamento local simulado.
- Conteúdo disponível e estruturalmente validado: **75 perguntas com IDs únicos**, **15 miniaulas**, **45 flashcards**, **30 tópicos de tutor**, **12 projetos** e **9 missões**.
- Navegação dos **10 módulos em cada faixa** (`5-7`, `8-10`, `11-12`) aprovada; sem rolagem horizontal indevida em 320, 360, 390, 768 e 1280 px na página principal.
- Arquivo HTML standalone executado em documento isolado no Chromium com sua CSP, imagens e scripts incorporados, sem requisição externa detectada.

## Limitações da verificação

- As políticas do ambiente de testes impediram navegar diretamente até uma URL `file://` ou servidor local. Por isso, não foi possível validar diretamente o duplo clique sobre um arquivo baixado em um computador do usuário; os testes rodaram com o HTML standalone injetado no navegador, preservando a política CSP.
- Ainda são necessários testes manuais em Windows 7/navegadores legados e Android, especialmente voz, diálogos, importação/exportação e arquivos offline.
- Verificação estrutural da biblioteca não equivale a revisão pedagógica humana de todas as questões.
- Não houve auditoria jurídica definitiva, homologação, pentest ou teste com crianças; o sistema **não deve ser anunciado como certificado ou pronto para comercialização sem essas etapas e a identificação do responsável pelo tratamento**.

## Como utilizar

- Para abrir sem instalar nada: `Inteligent_Hability_V3_3_Standalone.html`.
- Para manutenção e publicação estática: abra `index.html` mantendo todos os arquivos e a pasta `assets/` lado a lado.
- Faça um backup do progresso antigo antes de migrar. Em caso de dúvida, comece com a opção **sem guardar progresso**.
