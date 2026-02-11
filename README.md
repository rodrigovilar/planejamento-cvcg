# Planejamento CVCG 2026

Aplicacao front-end estatica com desbloqueio por senha e visualizacao em dois modos:
- Apresentacao scroll-based por secoes/grupos
- Cronograma em Gantt com busca, zoom, tooltip e modais

## Estrutura de arquivos

### HTML
- `index.html`: estrutura da pagina, lock screen e carregamento dos scripts

### Dados
- `data.json`: envelope com dados criptografados por campo
- `encrypt.mjs`: utilitario para conversao/criptografia dos dados
- `data-schema.mjs`: validacao estrutural do modelo de dados (pipeline Node)

### JS (`src/`)
- `meta.js`: render de blocos de conteudo (inclui sanitizacao HTML basica)
- `presentation-builders.js`: criacao das paginas da apresentacao
- `presentation-navigation.js`: navegacao por teclado e dots de scroll
- `presentation-core.js`: montagem da apresentacao e highlights do calendario
- `gantt-state.js`: estado e utilitarios de data/zoom/collapse
- `gantt-search.js`: busca e highlight de texto
- `gantt-ui.js`: tooltip e modais
- `gantt-render.js`: render principal do Gantt e linhas/marcadores
- `data-schema.js`: validacao estrutural dos dados descriptografados (browser)
- `crypto.js`: descriptografia no cliente e fluxo de unlock

### CSS (`styles/`)
- `base.css`: variaveis base e reset
- `gantt.css`: estilos do Gantt, tooltip e modal
- `presentation.css`: estilos da apresentacao e calendario visual anual
- `responsive.css`: regras responsivas

## Ordem de carregamento de scripts
A ordem no `index.html` e importante por dependencia global entre funcoes:
1. `src/meta.js`
2. `src/presentation-builders.js`
3. `src/presentation-navigation.js`
4. `src/presentation-core.js`
5. `src/gantt-state.js`
6. `src/gantt-search.js`
7. `src/gantt-ui.js`
8. `src/gantt-render.js`
9. `src/crypto.js`

## Regressao funcional
Use `REGRESSION_CHECKLIST.md` apos mudancas estruturais para validar que o comportamento permaneceu consistente.
