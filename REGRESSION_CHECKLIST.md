# Regressao Funcional - Planejamento CVCG 2026

## 1. Desbloqueio
- Abrir a pagina e confirmar que a tela de lock aparece.
- Testar senha invalida e confirmar mensagem "Senha incorreta.".
- Testar senha valida e confirmar que lock some e conteudo aparece.

## 2. Apresentacao (scroll)
- Verificar Hero com contadores (Areas, Grupos, Atividades).
- Navegar com rolagem entre secoes e grupos.
- Clicar no indicador de rolagem do Hero e validar scroll suave.
- Usar setas para cima/baixo e validar navegacao entre paginas.

## 3. Navegacao lateral
- Confirmar dots do scroll nav visiveis.
- Clicar em dots e validar navega para secao correta.
- Confirmar dot ativo atualiza conforme scroll.

## 4. Gantt
- Confirmar legendas renderizadas por secao.
- Testar botoes de zoom (+/-).
- Testar "Expandir tudo" e "Recolher tudo".
- Expandir/recolher secoes e grupos individualmente.
- Confirmar linha "Hoje" aparece no ano 2026.

## 5. Busca
- Buscar por termo de item (ex.: "batismo") e confirmar filtro.
- Buscar por termo de meta (ex.: "local") e confirmar grupos retornados.
- Validar contador de itens encontrados.
- Limpar busca e confirmar retorno ao estado completo.

## 6. Tooltip e modais
- Hover em evento do Gantt e validar tooltip com data e detalhes.
- Clicar em evento e validar modal com ocorrencias e campos.
- Clicar no icone de documento (grupo) e validar modal de conteudo.
- Fechar modal por botao, clique no backdrop e tecla Esc.

## 7. Calendario anual visual
- Validar lista de eventos por mes.
- Hover em item da lista destaca dias no mini calendario.
- Hover em dia do mini calendario destaca itens da lista.

## 8. Responsividade
- Em viewport <= 768px, validar layout de apresentacao.
- Confirmar Gantt escondido em mobile (comportamento atual esperado).
- Confirmar tabela com overflow horizontal no conteudo.

## 9. Seguranca basica (sanitizacao)
- Conferir renderizacao de blocos p/ul/grid sem quebrar layout.
- Validar que conteudo HTML dinamico nao injeta script/event handlers.
