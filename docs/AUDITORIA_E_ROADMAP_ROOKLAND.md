# RookLand · Auditoria e guia de implementação

## Visão do jogo

RookLand é um jogo persistente de administração de um reino em uma ilha. O jogador planta, cria animais, dá ordens aos aldeões, transforma insumos, negocia excedentes e investe em população, tecnologia e defesa. As ordens continuam em sua ausência. Ao voltar, ele vê o que rendeu, por que algo parou e qual decisão vale tomar agora.

O ciclo central é **atribuir trabalho → coletar e produzir → alimentar e abastecer → vender ou investir → desbloquear novas opções**. Fazenda e curral dão produção recorrente. A economia, as distâncias e os limites de estoque fazem a organização da ilha importar. As eras dão metas claras, e os soldados têm utilidade solo antes de qualquer PvP.

A referência de Colheita Feliz e Fazendinha é o prazer de voltar e encontrar o progresso visível. Do Hay Day, adaptar pedidos e cadeias de produção com acesso pelo mapa. De Age of Empires III, adaptar mudanças de era que liberam tecnologia, construções e funções militares. A progressão atual do centro se estende até cinco faixas: Fundação, Comércio, Fortaleza, Reino e Império. Referências: [Supercell, pedidos e comércio](https://support.supercell.com/hay-day/en/game/index.html), [Supercell, acesso à loja pelo mapa](https://support.supercell.com/hay-day/en/articles/the-shop.html) e [Age of Empires III DE, requisitos e mudanças por era](https://www.ageofempires.com/news/aoe3de-baseline-update).

## 1. Auditoria do estado atual

Leitura estática da rota jogável, simulação, configuração, API, salvamento e interface. Os tempos abaixo são cálculos pelas regras do código e precisam de calibração em partidas novas.

| Área | O que existe | Lacuna e prioridade |
| --- | --- | --- |
| Produção sem jogador | Simulação no servidor, atualizada a cada 200 ms; autosave JSON a cada 5 s. Ordens seguem com o navegador fechado se o servidor estiver ligado e o mundo despausado. | **P0.** Com o servidor desligado, o tempo para. Falta reconciliação persistente, resumo de retorno e motivos de bloqueio. |
| Coleta e fazenda | Caminhada, carga, entrega, replantio após uma semente inicial, poço e pesquisas. Atribuições podem continuar e buscar outro nó quando um depósito esgota. | **P0.** Falta acompanhar taxa líquida, caminhos e tarefas paradas. O mapa gera ferro e ouro, inclusive em renascimentos de recursos, sem um filtro global de era. |
| Curral | Até um aldeão por curral; a espécie fica configurada. Com dois animais, espaço e comida, pode reproduzir automaticamente. Coleta reinicia o ciclo do animal e credita direto no estoque. | **P0.** Dar visibilidade a trabalhador, maturação, reprodução e estoque. Hoje, se apenas parte do rendimento cabe, o ciclo é reiniciado e o excedente desaparece. Separar leite/lã recorrentes de abate para evitar que o mesmo animal gere carne repetidamente sem explicação. |
| Estoques e indústria | Capacidade agregada dos celeiros por recurso; leite e lã têm limites separados. Ferraria e tecelagem têm slider e produzem em lotes. O código credita armas e outros produtos em 'village.crafts', exibido no painel do celeiro. | **P0.** Acabados não passam pelas mesmas regras de capacidade dos insumos. Verificar o caminho completo lote → crédito → snapshot → celeiro ao mexer nisso. Mostrar uma saída aguardando espaço e preservar a quantidade pronta. |
| Progressão | Centro urbano de níveis 1–8, com marcos de era em N2, N4, N6 e N8; celeiros também chegam a N8. N6–N8 têm custos altos em madeira, pedra, comida, ferro e ouro. | **P0.** Conectar as novas eras a conteúdo exclusivo (tecnologia, comércio e defesa), para que os custos altos também abram metas novas. |
| População e alimentação | Casas abrem vagas. Consumo de pessoas, soldados, animais e casas a cada 10 min; falta de comida reduz a eficiência dos aldeões a 50%. | **P0.** O efeito da fome pode prolongar a própria crise. Falta previsão de saldo, reserva e recuperação acessível. Dieta e reputação ainda não existem. |
| Mercado | Compra e venda por ouro no centro urbano, com preços fixos, diferença entre compra e venda e checagem de saldo/capacidade. | **P1.** Faltam demanda, oferta, preços variáveis e encomendas que consumam tanto insumos quanto manufaturados. |
| Militar | Quartel, soldado genérico, equipamento, muros, portões, torres e níveis de defesa. Soldado se move e recebe armadura. | **P1.** Falta uma ação que justifique criar e sustentar tropas. Primeiro criar patrulha, treino e missões solo. |
| Mundo e acesso | Uma vila em memória, um arquivo de mundo e snapshots compartilhados. A API local envia o estado e aceita comandos sem identidade de jogador. | **Futuro.** Faltam múltiplas ilhas, NPCs, contas e isolamento. A API atual serve ao protótipo solo e precisa de outra camada antes de hospedar reinos de jogadores. |

**Onde trabalhar:** [configuração e fórmulas](../shared/village/config.ts), [simulação, comandos e migração](../shared/village/simulation.ts), [estado e tipos](../shared/village/types.ts), [protocolo](../shared/protocol.ts), [relógio e snapshot](../server/src/game.ts), [API e salvamento](../server/src/index.ts), [tela da vila](../web/src/views/village/VillageView.tsx). A rota jogável é '/crops_farm'. Há uma divergência em [VILA.md](VILA.md) sobre pagar sementes a cada ciclo e nos custos antigos de casas; usar o código como fonte e atualizar os trechos relevantes quando implementar.

## 2. Eras para a campanha solo

Era é o marco do reino. Nível é a evolução de uma estrutura ou tecnologia. Mostrar a meta da próxima era no Centro da Vila, com pré-requisitos e custo. No catálogo, listar o conteúdo disponível e mostrar apenas uma prévia do próximo desbloqueio.

| Era | Conteúdo liberado em etapas | Objetivo que prepara a próxima etapa |
| --- | --- | --- |
| **I · Fundação** | Madeira, pedra, comida simples, cenoura, abrigo N1 e celeiro. Depois da primeira entrega e da primeira colheita, liberar trigo, poço, recruta e porco. Arbustos são a reserva de emergência. | Ensinar a construir, atribuir trabalho e entregar. Para II, ter casa e celeiro operantes, dois aldeões em tarefas e cumprir uma meta de produção acumulada. |
| **II · Comércio** | Ferro por prospecção e mineração; ouro primeiro por encomendas comerciais e, após pesquisa, por mineração. Liberar batata, ovelha/lã, vaca/leite, mercado, tecelagem, ferraria, ferramentas, casas N2 e quartel com soldado básico. | Produzir tecido e ferramenta, entregar encomendas variadas e concluir uma patrulha. Demonstrar as cadeias comida → lã → roupa e madeira/ferro → ferramentas/armas. |
| **III · Fortaleza** | Casa N3, armazenamento avançado, portões/torres de pedra, armaduras, técnicas de mineração, funções militares e expedições solo. Expansão de ilhas pode ser acrescentada quando o ciclo solo estiver estável. | Sustentar a vila e o exército, cumprir contratos avançados e abrir espaço para especialização agrícola, comercial ou militar. |
| **IV · Reino** | Centro N6–N7 e celeiros de nível equivalente; espaço para palácio, companhia mercante e fortificações avançadas. | Investir estoques em projetos grandes e encomendas que exijam produtos manufaturados. |
| **V · Império** | Centro N8; espaço para tecnologias finais, frota de expedição e edifícios monumentais. | Sustentar um reino maduro com comércio, defesa e especializações de fim de jogo. |

Proposta atual: Centro N1 na Fundação, N2–3 no Comércio, N4–5 na Fortaleza, N6–7 no Reino e N8 no Império. Os níveis de celeiro 6–8 passam a exigir o mesmo nível no centro. Os custos ampliados dos dois edifícios são um sumidouro de recursos de fim de jogo; priorizar como próximos sumidouros contratos de produtos manufaturados, projetos monumentais e expansão marítima, cada qual consumindo recursos diferentes e liberando conteúdo concreto.

Criar regras declarativas de acesso e um validador compartilhado que retorne o motivo do bloqueio. Usar as regras em construção, melhorias, pesquisas, compras, geração/renascimento de nós, atribuição de coleta e receitas, inclusive para comandos enviados diretamente à API. Depósitos bloqueados podem ficar no mapa como pontos a prospectar, sem coleta nem compra antes da tecnologia. Migrar saves existentes preservando edifícios, recursos, pesquisas e filas. Derivar uma era mínima a partir do progresso e permitir manutenção do patrimônio já adquirido. Registrar a decisão na migração e evitar cobrar novamente o que já foi comprado.

## 3. Ritmo de coleta e economia

### Referência de partida a 1×

Exemplo isolado com um aldeão sem pesquisa/ferramenta, sem fome, e **oito quadrados de trajeto em cada sentido** entre depósito e celeiro. Caminhada base de 1,25 quadrado/s e três segundos de trabalho por coleta. Depósitos cheios e sem bloqueios.

| Produção | Carga inicial → aldeão no máximo | Tempo inicial por ciclo e ritmo aproximado |
| --- | --- | --- |
| Madeira ou ferro liberado | 8 → 20 | 16,4 s e 29 un./min por aldeão. |
| Pedra ou ouro liberado | 2 → 6 | 16,7 s e 7 un./min por aldeão. Os 30 de pedra da casa N2 são 15 viagens no início ou 5 no máximo. |
| Cenoura N1 | 6 por colheita com um aldeão | 44 s de plantio, crescimento e colheita, mais cerca de 13 s de deslocamento no cenário de 8 quadrados. Dá cerca de 63 comidas em 10 min. |

Calcular coleta com **tempo de ida + trabalho + tempo de volta carregado + espera**. Manter aldeão inicial lento, pedra e ouro pesados, com carga de até 6 no máximo; melhorar o rendimento por posicionamento, rota, especialização e ferramentas. A diferença de peso não deve ser compensada inflando a carga. O cálculo de viagens atual assume coleta natural até para comida. Trocar por ETA com a fonte adequada (fazenda, curral, coleta ou mercado), usar caminhos alcançáveis e tratar bloqueios como motivo, sem inventar um tempo. Exibir o custo, quanto falta e uma estimativa sob demanda.

**Comida e armazenamento.** Preservar custos de comida das casas de **100 / 500 / 2.500**. O upkeep atual por casa é **10 / 50 / 250 a cada 10 min**, além de 1 por civil, 5 por soldado e 2 por animal. Na referência, 250 de manutenção equivale à produção bruta de cerca de quatro fazendas de cenoura N1; 2.500 exigem mais que um celeiro N3 de 2.000. Mostrar ambos antes de confirmar o upgrade e guiar o jogador a ampliar estoque e produção. Com 20 de comida no início, a primeira casa exige 80 adicionais; a produção de cenoura de referência leva cerca de 13 min sem contar gastos e rendas extras. Ensinar a coleta em arbustos e evitar que o tutorial exija casa antes de conseguir começar a produzir. Medir a vila real antes de recalibrar upkeep ou custos confirmados.

**Fontes, gastos e proteção contra crise.**

- Para cada recurso, medir produção entregue, estoque, gastos e saldo líquido na última janela útil. Comida sustenta a vila, recrutas e reprodução; madeira e pedra expandem; ferro vira ferramentas/armas; ouro paga pesquisa, comércio e tropas; lã e leite entram em manufatura, dieta e encomendas.
- Dar ao jogador reserva de comida para as próximas refeições. Compras opcionais, reprodução e consumo de mercadorias pela oficina devem respeitar reservas configuráveis. Ao faltar comida, preservar tarefas, oferecer ração de emergência/arbustos e priorizar recuperação. Mostrar quando haverá falta e onde redirecionar trabalho.
- Colocar limite explícito na fila ou estoque de produtos acabados; usar uma área de saída por oficina se o celeiro lotar. Usar uma transação para pagar um lote e creditar cada conclusão uma vez. Aplicar o mesmo cuidado a produtos do curral quando só parte do estoque tem espaço.
- Medir no mínimo primeiro alimento entregue, primeira contratação, primeira casa, primeira encomenda, eras II/III, primeiro soldado útil, tempo com estoque cheio e tempo em falta de comida. Metas iniciais de teste de jogo a 1×: primeira entrega em **1–3 min**, Era II em **25–45 min** e Era III em **2–4 h** de simulação, incluindo ausências. Ajustar após testar rotas perto/longe, com e sem poço, e partidas agrícolas, comerciais e militares.

### Mercado e reputação

Começar com **mercado de NPCs**, sem dependência de outros jogadores. Cada bem liberado tem preço base, estoque de mercado, tendência e faixa de variação. Compras pressionam o preço para cima, vendas para baixo e o preço retorna gradualmente à base. Mostrar total previsto, cotação por lote, tendência, taxa e capacidade. Calcular no servidor por ordem, validar o lote inteiro antes de debitar e testar que comprar e vender repetidamente não gera ouro sem atividade produtiva. Limitar o volume de NPC e usar contratos rotativos de insumos, itens de oficina e mantimentos para criar demanda real. Contratos da Era II são fonte inicial de ouro antes da mina.

Separar **satisfação dos aldeões** de **reputação comercial**. Primeiro usar um indicador da vila com composição visível: variedade da dieta (ex.: vegetal, laticínio, carne), estabilidade das refeições e carga de trabalho. Manter comida genérica para compatibilidade e começar com registros de variedade entregues/consumidos por refeição antes de expandir todo o inventário. Em seguida, introduzir decisões de política e religião com vantagens e custos claros: folga e jornada, conselho comunitário e celebrações. Fazer o efeito mudar aos poucos, com limites, sem empilhar penalidades de fome e moral até travar a produção. A reputação externa vem do cumprimento de contratos e pode abrir parceiros e encomendas melhores.

## 4. Progresso durante a ausência

1. Distinguir aba fechada, servidor desligado e mundo pausado. Se o servidor segue rodando, mostrar apenas o resumo acumulado desde a última visita. Se ele ficou desligado, reconciliar o intervalo pelo relógio do servidor ao restaurar o save. Pausa explícita continua congelando o mundo.
2. Persistir checkpoint real junto do estado e reconciliar uma vez por intervalo. Começar com limite de **8 horas por ausência** para recuperação de servidor parado, a 1×. Saves sem checkpoint começam a contar a partir da migração. Relógio voltando não gera tempo negativo; reconexões ou reinícios repetidos não creditam o mesmo intervalo.
3. Simular apenas ordens e filas aceitas. Considerar trajeto, entrega, estoque cheio, insumos, refeição, maturação, reprodução e conclusão de obras e lotes. Usar as regras autoritativas da vila. Evitar milhões de ticks síncronos em um salto; processar em blocos limitados e medir custo. Só trocar por eventos/agregação se o resultado respeitar as mesmas travas e a ordem dos eventos.
4. Registrar ganhos e gastos durante a ausência e salvar o novo checkpoint junto com o resultado antes de anunciar a conclusão. Resumo ao voltar: tempo aplicado, entregas, gastos de manutenção, obras concluídas e motivo das filas que pararam. Exemplo: “Lã pronta · celeiro cheio”. Voltar à estrutura em um toque.

## 5. Soldados com utilidade antes do PvP

Na Era II, oferecer treino e uma patrulha da própria ilha. A patrulha pode escoltar uma carga de NPC ou proteger um ponto de coleta durante uma missão escolhida. Na Era III, adicionar expedições solo com objetivo, requisitos, tempo, recompensa limitada e prévia de risco. Começar com resultados calculados pelo servidor, sem depender de um motor de combate em tempo real. Ataques surpresa que destruam progresso enquanto o jogador está ausente ficam fora dessa etapa.

A receita atual do soldado exige **45 comidas, 20 ouro, 1 arma e 1 roupa**, além de **60 s de treino** e uma vaga. A arma, sozinha, ainda exige 20 ferro, 10 madeira, 5 ouro e 3 pregos; a roupa exige 2 panos e 4 comidas. O quartel, as oficinas e a criação de ovelhas precisam formar um caminho visível até o primeiro soldado. Mostrar no quartel o que falta e levar à estrutura que produz o material. Preservar a barra de quantidade de ferraria e tecelagem, exibindo saída real quando cada lote rende várias unidades.

Com oficinas prontas e sem itens fabricados, o primeiro soldado demanda **28 ferro, 17 madeira, 25 ouro, 49 comida e 4 lã** pelas receitas atuais, sobrando dois pregos e um pano. Ferraria e tecelagem podem trabalhar em paralelo: pregos + arma levam 80 s; pano + roupa, 65 s; o treino começa depois e leva mais 60 s. O piso é **2 min 20 s**, excluindo coleta, construções, criação de animais e tempo para iniciar cada lote. Usar essa decomposição para medir se o gargalo real é acesso a ferro, lã, ouro ou o encadeamento de ordens.

Serviços militares precisam ter retorno percebido, sem superar toda a economia civil. Usar gastos recorrentes ligados à decisão do jogador, como ração de marcha, reposição de equipamento após missão e reparo de fortificações quando usadas. Validar a reserva de vagas dos soldados em fila e mostrar bloqueio se a saída do quartel estiver ocupada. Um teste de aceitação da Era II é criar uma tropa, cumprir uma missão e entender o custo e o resultado sem depender de outro jogador.

## 6. Interface compacta para celular

### Diagnóstico da vila

- A tela já tem CSS responsivo. O mapa, porém, usa clique, mouse e roda, inclusive para traçar muros. Reduzir cards sem adaptar gestos deixa ações centrais difíceis no celular. A construção também depende da seleção de um aldeão no mapa, o que dificulta descobrir como começar.
- As informações econômicas estão distribuídas entre o HUD, o Centro da Vila e os painéis de celeiro, curral e oficinas. O Centro concentra pesquisas, mercado, sementes e animais. A busca por uma tarefa comum pode exigir abrir um prédio e depois achar a aba certa.
- O celeiro já mostra acabados com ícones. Compactar por categoria e manter os nomes acessíveis. A evolução já tem representação acima da estrutura. Usar essa superfície para tempo e progresso, e evitar barras duplicadas em cards de melhoria.

### Layout e ações

| Área | Comportamento proposto |
| --- | --- |
| Topo | Linha única com ícones, quantidade de recursos liberados e alertas de falta/estoque cheio. Toque em um recurso abre saldo, capacidade, entradas e saídas. Era e população compactas com acesso ao próximo objetivo. |
| Mapa | Toque seleciona, arrastar desloca, pinça aproxima. Oferecer zoom por botões e cancelar explícito. Separar toque de arraste e usar Pointer Events no mapa. Seleção de unidade com ação “Atribuir” e destinos destacados. Muros por toque inicial → toque final → confirmar. |
| Barra inferior | **Construir · Tarefas · Estoque · Vila** com ícone e texto curto. Estoque e tarefas acessíveis sem procurar um prédio. Construir abre catálogo e permite escolher um aldeão livre ou aproveitar a seleção atual. Mercado entra em Vila quando liberado. |
| Painel contextual | Uma folha inferior por vez no celular e painel lateral no desktop. Cabeçalho pequeno com ícone, nome e nível atual. Mostrar status, uma ação principal, próximo custo, faltante e motivo de bloqueio. Manter níveis concluídos no histórico ou detalhes. A ação destrutiva fica em menu secundário com confirmação. |
| Estoque | Agrupar “Recursos”, “Animais” e “Produzidos”. Ícone + quantidade e barra apenas onde há limite relevante. Mostrar capacidade da vila e contribuição do celeiro selecionado em detalhes. |
| Centro da Vila | Mostrar objetivo da era, requisitos e previsão de alimentação. Abrir áreas de pesquisa, mercado e políticas com linhas curtas. Priorizar avisos acionáveis: tocar em “Curral sem trabalhador” leva ao curral. |
| Produção | Lista curta de receitas disponíveis, slider com valor visível, custo e tempo atualizados. Em oficina com múltiplos rendimentos, distinguir lotes e unidades produzidas. Barra sobre a estrutura selecionada ou em atividade, com tempo restante; painéis podem mostrar o estado, como “aguardando saída”, sem duplicar a barra. |

Usar alvos de toque de aproximadamente **44 × 44 px CSS**, rótulo acessível para ícones, foco visível, alto contraste e alerta por texto/ícone além de cor. Prever áreas seguras do celular, rolagem dentro de painéis e ausência de hover. Testar em 360×800, 390×844, paisagem e desktop. Critérios: sem rolagem horizontal, câmera sem construir ao arrastar, painel sem cobrir a confirmação, três ações para iniciar cada fluxo comum a partir da barra inferior. Verificar teclado no desktop. Medir fluidez e tráfego com a ilha populada; a API hoje serializa snapshots inteiros a cada janela de 100 ms quando há mudança, o que merece medição em celular antes de decidir por cadência menor ou atualização por partes.

## 7. Ordem de execução para a IA

Implemente uma entrega por vez com um caminho completo de servidor, persistência e UI. Use a simulação existente da vila e mantenha a rota jogável. Os laboratórios são rotas separadas. Antes de alterar a economia, registre a configuração atual e os tempos de referência para comparar.

| Entrega | Implementação | Critério para passar à próxima |
| --- | --- | --- |
| **1 · Fundação e interface básica** | Regras compartilhadas de eras e desbloqueios, migração, tutorial curto, catálogo progressivo, atalhos de construção/tarefas/estoque e gestos no mapa. Corrigir a dependência do ferro na transição. | Save novo chega à Era II usando só bens da Era I. API recusa ação bloqueada sem cobrar. Save anterior abre com estoque, filas e estruturas. É possível construir e atribuir pelo celular. |
| **2 · Produção durante ausência** | Checkpoint, reconciliação e resumo de retorno; arrumar estados de bloqueio, capacidade das saídas e proteção de comida. Corrigir perdas parciais no curral. | Fechar aba com servidor ligado e simular servidor parado produzem o resultado esperado pelos respectivos relógios. Pausar e reiniciar duas vezes não duplicam entregas. Estoque cheio não apaga produção pronta. |
| **3 · Economia e vida da vila** | Indicadores de saldo, custos e ETA, mercado NPC variável, encomendas, dieta e carga de trabalho. Introduzir escolhas de política e religião na sequência, com efeitos explicados. | Existe um caminho recuperável em crise e um caminho comercial sem minerar ouro na abertura. Compra e venda alternadas não criam lucro artificial. Produção e gastos da vila são compreensíveis pelo celular. |
| **4 · Fortaleza e utilidade militar** | Patrulha, escolta, funções de tropas, contratos avançados e expedições NPC. Completar o desbloqueio da Era III e ajustar os gargalos com medições. | Era III alcançável a partir de save novo sem conteúdo futuro. Soldados geram utilidade solo e têm custo de operação previsível. |
| **5 · Arquipélago e PvP posterior** | Primeiro ilhas NPC com viagens, risco, carga e comércio. Depois contas, mundos separados, convites e instâncias de combate. | PvP exige duas aceitações válidas. A permissão temporária para a batalha limita o acesso ao reino do outro; expiração, recusa e desconexão têm regras claras. O servidor valida dono, sessão e resultado, creditando recompensas uma vez. |

Para cada alteração futura, validar custo e acesso no servidor antes de modificar estado, manter contrato compatível quando possível, atualizar documentos e preservar backups de migração. Cobrir pelo menos: ordem repetida, recursos insuficientes, estoque cheio, acesso antes da era, retorno após pausa, save antigo, cancelamento de gesto e conclusão de lote após reinício. Usar 'npm run check' e as suites de 'server/test' pertinentes quando implementar as fases. Validar o fluxo real em um save novo e usar cópia dos saves existentes para cenários de migração.

**Primeira tarefa para a IA:** implementar a Entrega 1 como um recorte jogável da abertura até a Era II. Começar pelos pré-requisitos de transição e por uma função compartilhada de desbloqueio. A seguir, ligar os estados à UI e demonstrar a mesma passagem de era no desktop e em uma viewport móvel. Preservar os custos de comida das casas e o peso de pedra/ouro. Deixar a política de preços, as demais ilhas e a batalha online para suas respectivas entregas.
