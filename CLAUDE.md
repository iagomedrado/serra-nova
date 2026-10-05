# Sistema do Laticínio Serra Nova

Sistema interno da empresa, feito em uma única página: `index.html`, com HTML, CSS e JavaScript no mesmo arquivo.
Publicado pelo GitHub Pages em https://iagomedrado.github.io/serra-nova/ a partir da branch `main` do repositório `iagomedrado/serra-nova`.
Junto do `index.html` ficam os arquivos do "app" para celular: `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` e `favicon.png` (feitos com o logotipo, fundo vinho). Não há service worker, de propósito, para o celular sempre abrir a versão mais nova.
Responsável: Iago (gerente). Escreva sempre em português do Brasil, com linguagem simples e sem termos técnicos desnecessários.

## Como o sistema funciona
- A página só mostra e calcula. Os dados ficam no Supabase, no projeto "serra-nova" (ref `lxpkigztunalreqlsbul`, região São Paulo, plano gratuito).
- A biblioteca `@supabase/supabase-js@2.117.2` é carregada do jsDelivr com `integrity` (SRI). Se trocar a versão, recalcule o hash.
- A chave publicável do Supabase no arquivo é pública por natureza. Nunca coloque a chave `service_role`, tokens ou senhas na página.
- Login por e-mail e senha. O primeiro acesso cria o administrador. Os demais usuários são criados na aba "Usuários" pela edge function `usuarios` (ações: primeiro-acesso, criar, senha, excluir). O botão "Sair" encerra só a sessão do aparelho atual (`signOut({ scope: "local" })`).
- Permissões por aba: sem acesso / ver / editar (tabela `permissoes`). As regras de segurança (RLS) usam `privado.eh_admin()` e `privado.pode(modulo, nivel)`. A tela esconde botões, mas quem garante a segurança é o banco.
- Módulos: `livro`, `producao`, `queijos`, `vendas`, `estoque`, `resfriadores`. A lista de módulos aparece em três lugares que precisam andar juntos: `MODULOS` no `index.html`, a regra `permissoes_modulo_check` no banco e `MODULOS` na edge function `usuarios`.
- Objeto global `window.SN` com `sb` (cliente Supabase), `perfil`, `permissoes`, `pode(modulo, nivel)`, `ui` (`toast`, `openModal`, `closeModal`, `confirmar`) e `chamarFuncao`.

## Abas
- **Início:** resumo das áreas e "Precisa de atenção". Recebe os eventos `livro:resumo`, `estoque:resumo`, `producao:resumo`, `queijos:resumo` e `vendas:resumo`.
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
  - Os produtos aparecem recolhidos em linhas compactas (nome, avisos e estoque atual) e abrem com um clique para edição. As áreas também recolhem. Há "Abrir todos" e "Recolher todos", e a busca mostra os resultados mesmo em áreas recolhidas.
  - O pedido de compra sai por área. Os itens que estão vencendo, mas não precisam de compra, saem na seção "VENCENDO EM BREVE".
- **Lançamento de produção (pronto):** objeto `window.SN_Producao`. Tabelas `producao_produtos` (nome, tipo `queijo` ou `creme`, ativo, ordem) e `producao_lancamentos` (data_fabricacao, produto_id, lote, leite_litros, pecas, peso_kg, observacao).
  - Queijos (Tropical, Parmesão, Meia Cura, Frescal): data de fabricação, lote, volume de leite e número de peças. Rendimento = litros por peça.
  - Cremes (Creme de Leite Cru, Creme do Soro do Leite): data de fabricação, lote e peso (kg).
  - Resumo por período (Hoje, Esta semana como padrão, Este mês, Período personalizado), total por produto e lista agrupada por dia. Avisa quando um lote se repete para o mesmo produto no período.
  - O botão "Produtos" permite adicionar, renomear, mudar o tipo e tirar produtos de uso (sem apagar os lançamentos).
  - Os lotes de queijo lançados aqui aparecem na fila "Aguardando destino" do Estoque de queijos. A aba de Produção não foi alterada para isso.
- **Estoque de queijos (pronto):** acompanha o caminho de cada lote de queijo depois da produção: salmoura (1 a 20) → secagem (1 a 30) → estoque embalado. Objeto `window.SN_Queijos`.
  - Tabelas `queijos_lotes` (um por lançamento de produção), `queijos_posicoes` (onde estão as peças agora: etapa, número, peças, entrada e saída prevista) e `queijos_movimentos` (histórico com origem e destino). A tela não grava nas tabelas diretamente: tudo passa pelas funções do banco `queijos_receber`, `queijos_mover`, `queijos_tempo`, `queijos_perda`, `queijos_dispensar` e `queijos_desfazer`. A fila vem de `queijos_pendentes()`.
  - O tempo de cada etapa é informado na entrada da etapa (não é fixo por tipo de queijo) e pode ser ajustado depois. Quando o tempo acaba, o cartão fica dourado e aparece em "Precisa de atenção". Cartões com mais de um lote ficam em azul (`--misto`); se também estiverem com tempo cumprido, ficam dourados com a faixa lateral azul.
  - Em qualquer etapa só parte das peças pode seguir. Qualquer queijo pode pular etapas (ir da fila direto para a secagem ou para o estoque). Um tanque ou secagem pode ter mais de um lote.
  - **Saída do estoque:** botão "Registrar saída" (ou "Saída" em cada lote embalado). Informa peças e peso (kg) de um ou mais lotes, data/hora e observação. A função `queijos_saida(p_itens, p_quando, p_observacao)` tira as peças, grava um movimento do tipo `saida` (peso em `destino.peso_kg`) e cria uma venda pendente em Gerenciamento de vendas. Desfazer uma saída só funciona enquanto a venda ainda está pendente.
  - "Registrar perda" tira peças do controle com motivo. "Não controlar" tira um lote da fila (produções antigas). "Desfazer" só vale para o último movimento de cada lote.
- **Gerenciamento de vendas (pronto):** objeto `window.SN_Vendas`, módulo de permissão `vendas` (separado do estoque, para controlar quem vê preços).
  - Tabelas `vendas` (situação `pendente` ou `concluida`, cliente, forma de pagamento, data da venda), `vendas_itens` (produto, lote, peças, peso e preço por quilo), `vendas_clientes` e `vendas_formas` (listas com "tirar de uso", sem apagar). Vendas e itens só são gravados pelas funções `queijos_saida`, `vendas_concluir` e `vendas_reabrir`; clientes e formas são editados direto na tabela.
  - Cada saída do estoque chega em "Aguardando dados da venda". "Completar venda" pede cliente (ou cliente novo), forma de pagamento, data e **preço por quilo** de cada item. O preço é sugerido pelo último preço daquele produto para o cliente (ou o último do produto).
  - **Parcelado:** na janela da venda, "Pagamento" à vista ou parcelado (2 a 36 parcelas). Número de parcelas, primeiro vencimento e dias entre parcelas geram a lista; vencimentos e valores podem ser ajustados, mas a soma precisa ser igual ao total (o banco também confere). As parcelas ficam na coluna `vendas.parcelas` (jsonb: n, vencimento, valor, recebido_em, recebido_por). `vendas_parcela_recebida(p_venda, p_n, p_data)` marca ou desfaz o recebimento; `vendas_a_receber()` lista as parcelas em aberto para o painel "Parcelas a receber". Parcelas em atraso aparecem em "Precisa de atenção".
  - Resumo por período (Hoje, Esta semana, Este mês como padrão, Período personalizado), filtro por cliente, totais por cliente e por produto. "Editar" corrige uma venda; "Voltar para pendente" permite desfazer a saída no estoque.
- **Resfriadores (pronto):** os resfriadores de leite da empresa, emprestados aos produtores ou de reserva no pátio. Objeto `window.SN_Resfriadores`, módulo `resfriadores`.
  - Tabelas `resfriadores` (número único, capacidade em litros, observação, `local` = `produtor` ou `patio`, produtor, desde quando, `ativo` para "fora de uso"), `resfriadores_produtores` (lista com "tirar de uso"), `resfriadores_locais` (histórico de por onde passou), `resfriadores_manutencoes` (data, o que foi feito, quem fez, custo) e `resfriadores_fotos`.
  - Cadastrar e mudar de lugar só pelas funções `resfriadores_criar` e `resfriadores_mudar`, que mantêm o histórico de lugares. Os demais dados, manutenções e fotos são gravados direto nas tabelas.
  - Fotos ficam no Storage, na pasta privada `resfriadores` (máximo 5 MB, só imagens), em `<id do resfriador>/<nome>.jpg`. A tela reduz cada foto para no máximo 1600 px antes de enviar e mostra com links temporários (`createSignedUrls`). As fotos podem ser ligadas a uma manutenção (`manutencao_id`).
  - Não há leitura de temperatura: a aba antiga de exemplo com tanques e câmara fria foi substituída.
- **Usuários:** só para administradores.
- Todas as abas agora usam dados reais. O aviso de demonstração (`demoNote`) não aparece em nenhuma.

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
