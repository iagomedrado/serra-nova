# Sistema do Laticínio Serra Nova

Sistema interno da empresa, feito em uma única página: `index.html`, com HTML, CSS e JavaScript no mesmo arquivo.
Publicado pelo GitHub Pages em https://iagomedrado.github.io/serra-nova/ a partir da branch `main` do repositório `iagomedrado/serra-nova`.
Responsável: Iago (gerente). Escreva sempre em português do Brasil, com linguagem simples e sem termos técnicos desnecessários.

## Como o sistema funciona
- A página só mostra e calcula. Os dados ficam no Supabase, no projeto "serra-nova" (ref `lxpkigztunalreqlsbul`, região São Paulo, plano gratuito).
- A biblioteca `@supabase/supabase-js@2.117.2` é carregada do jsDelivr com `integrity` (SRI). Se trocar a versão, recalcule o hash.
- A chave publicável do Supabase no arquivo é pública por natureza. Nunca coloque a chave `service_role`, tokens ou senhas na página.
- Login por e-mail e senha. O primeiro acesso cria o administrador. Os demais usuários são criados na aba "Usuários" pela edge function `usuarios` (ações: primeiro-acesso, criar, senha, excluir). O botão "Sair" encerra só a sessão do aparelho atual (`signOut({ scope: "local" })`).
- Permissões por aba: sem acesso / ver / editar (tabela `permissoes`). As regras de segurança (RLS) usam `privado.eh_admin()` e `privado.pode(modulo, nivel)`. A tela esconde botões, mas quem garante a segurança é o banco.
- Módulos: `livro`, `producao`, `queijos`, `estoque`, `resfriadores`.
- Objeto global `window.SN` com `sb` (cliente Supabase), `perfil`, `permissoes`, `pode(modulo, nivel)`, `ui` (`toast`, `openModal`, `closeModal`, `confirmar`) e `chamarFuncao`.

## Abas
- **Início:** resumo das áreas e "Precisa de atenção". Recebe os eventos `livro:resumo` e `estoque:resumo`.
- **Livro de contas (pronto):** contas a pagar com parcelas, pagamentos parciais, recorrências e categorias. Tabelas `livro_contas` (parcelas em jsonb), `livro_categorias`, `livro_recorrencias`. Objeto `window.SN_Livro`. Registra quem lançou cada conta e quem registrou cada pagamento.
  - O vencimento das parcelas em aberto pode ser alterado na janela "Editar conta" (seção Vencimentos) ou no "Ajustar" de cada parcela.
  - Os filtros (categoria, situação, forma de pagamento e vencimento) ficam reunidos no botão "Filtros". Os filtros ativos aparecem como etiquetas removíveis abaixo da busca. O filtro de forma de pagamento considera a forma padrão da conta e a forma usada nos pagamentos.
  - O resumo tem só "Hoje" (padrão ao abrir) e "Período personalizado".
- **Controle de estoque (pronto):** insumos em 4 áreas (LABORATÓRIO, ALMOXARIFADO QUÍMICO, EMBALAGENS E RÓTULOS, ALMOXARIFADO). Objeto `window.SN_Estoque`. Tabelas `estoque_produtos`, `estoque_config` (uma linha, id = 1) e `estoque_contagens` (um registro por dia, com os itens em jsonb).
  - Cada produto tem os campos **Entrada**, **Estoque atual** e **Estoque mínimo**, além de validade e aviso de vencimento opcionais (prazo definido em cada produto).
  - Fluxo: quando chega produto, o operador preenche **Entrada**. O botão **Registrar Estoque** chama a função `estoque_registrar(p_data)` no banco, que soma a entrada ao estoque atual, limpa o campo e grava o registro do dia, tudo numa única transação. Vários registros no mesmo dia são acumulados no mesmo registro.
  - `estoque_desfazer_ultimo()` desfaz o último registro, tirando as entradas do estoque atual e devolvendo-as para o campo Entrada.
  - Antes de registrar, o cálculo de "Comprar" e o pedido do WhatsApp já consideram estoque atual + entrada.
  - Uma faixa amarela ("Alterações não registradas") aparece quando algum produto mudou desde o último registro, e o navegador avisa se a pessoa tentar sair com alterações feitas por ela e não registradas.
  - Consumo = estoque do registro anterior + entradas − estoque atual. O histórico soma os registros de cada semana (de segunda a domingo) e mostra as últimas 8 semanas, com a média.
  - O pedido de compra sai por área. Os itens que estão vencendo, mas não precisam de compra, saem na seção "VENCENDO EM BREVE".
- **Lançamento de produção, Estoque de queijos e Resfriadores:** ainda são só demonstração de layout, com dados de exemplo. Antes de construir, pergunte ao Iago como a empresa trabalha nessas áreas.
- **Usuários:** só para administradores.

## Visual
- Cores da marca: vinho `#6E0A10` no menu, vermelho `#C8101A` nos botões principais, dourado `#F2B81E` nos destaques. Fundo neutro claro. Há tema escuro por `prefers-color-scheme`.
- Fontes: Merriweather nos títulos e Source Sans 3 no texto.
- Todo campo precisa ter o nome escrito junto dele (o Iago pediu isso explicitamente). Prefira cartões simples a tabelas largas.
- Tudo precisa funcionar bem no celular.

## Regras de trabalho
- Mudanças no banco de dados (tabelas, funções, regras RLS, edge functions) não ficam neste repositório. Se uma tarefa precisar delas, avise o Iago antes de seguir.
- Toda tabela nova precisa de RLS ligado e de políticas usando `privado.pode('<modulo>', 'ver' | 'editar')`, além do gatilho `livro_carimbo` para registrar quem criou e quem alterou cada linha.
- Não altere o comportamento das abas prontas sem o Iago pedir.
- Antes de concluir, confira que o JavaScript não tem erro de sintaxe e que as abas existentes continuam funcionando.
- Explique as mudanças para o Iago em linguagem simples.
