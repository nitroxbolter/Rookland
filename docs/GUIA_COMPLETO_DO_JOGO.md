# Guia funcional de RookLand

Este documento registra o comportamento que existe no código hoje e separa o que ainda é planejamento. O jogo é uma vila persistente de coleta e administração, com ordens executadas no servidor enquanto a partida está despausada.

## Progressão do reino

O Centro Urbano tem níveis 1 a 8. As faixas de era aparecem nos níveis 1 (Fundação), 2–3 (Comércio), 4–5 (Fortaleza), 6–7 (Reino) e 8 (Império). A primeira transição exige casa e celeiro prontos, dois aldeões trabalhando e 60 unidades de comida colhidas. O avanço do Centro Urbano acontece assim que os requisitos e materiais são entregues, sem cronômetro de era.

| Centro para nível | Madeira | Pedra | Comida | Ferro | Ouro |
|---|---:|---:|---:|---:|---:|
| 2 | 120 | 80 | 100 | — | — |
| 3 | 250 | 180 | — | 70 | 40 |
| 4 | 450 | 350 | — | 120 | 100 |
| 5 | 750 | 600 | — | 220 | 200 |
| 6 | 2.500 | 2.500 | 5.000 | 1.200 | 800 |
| 7 | 6.000 | 5.000 | 12.000 | 3.000 | 2.000 |
| 8 | 12.000 | 10.000 | 25.000 | 6.500 | 5.000 |

O Centro Urbano guarda até 100 madeira, 100 pedra e 100 ouro. Comida e ferro precisam de celeiro. Os estoques dos celeiros prontos se somam; celeiros em construção ou melhoria ainda não aumentam o limite.

## Estruturas

As coordenadas e custos-base abaixo refletem `shared/village/config.ts`. O trabalhador inicia a obra e a conclui no tempo indicado; o edifício só libera sua função após ficar pronto.

| Estrutura | Área | Custo de construção | Função e progressão |
|---|---:|---|---|
| Centro Urbano | 4×4 | Inicial | Eras, pesquisa, recrutamento e mercado. Níveis 1–8; custos na tabela acima. |
| Celeiro | 3×3 | 60 madeira + 25 pedra | Armazena cada recurso e produto animal. Níveis 1–8; N6–N8 exigem Centro do mesmo nível. |
| Fazenda | 2×2 | 15 madeira | Produz cenoura, trigo ou batata. Até quatro trabalhadores. Níveis 1–3. |
| Casa | 2×2 | 35 madeira + 10 pedra + 100 comida | Dá vagas de população: +2, +6 e +15 nos níveis 1, 2 e 3. |
| Poço | 2×2 | 40 madeira + 30 pedra | Dobra a velocidade de crescimento das fazendas dentro de oito tiles. |
| Curral | 2×2 | 50 madeira + 10 pedra | Níveis 1–5 comportam 2, 4, 6, 8 e 10 animais. Um aldeão cuida da coleta e reprodução. |
| Muro | 1×1 | 8 madeira + 12 pedra | Bloqueia caminho. Níveis 1–3. |
| Portão | 2×1 | 35 madeira + 30 pedra + 5 ferro | Permite passagem das unidades aliadas. Níveis 1–3. |
| Torre | 2×2 | 55 madeira + 110 pedra + 15 ferro | Guarnece arqueiros e ataca criaturas ao alcance. Até nível 4. |
| Ferraria | 3×3 | 100 madeira + 80 pedra + 20 ferro | Produz pregos, ferramentas, armas e armaduras. |
| Tecelagem | 3×3 | 90 madeira + 35 pedra | Produz tecido e roupas a partir de lã e outros insumos. |
| Quartel | 3×3 | 150 madeira + 100 pedra + 25 ferro | Treina soldados e arqueiros em fila. |

### Celeiro: capacidade por nível

| Nível | Comida / madeira | Pedra / ferro / ouro | Produtos animais |
|---|---:|---:|---:|
| 1 | 500 | 300 | 100 de cada |
| 2 | 1.000 | 600 | 200 de cada |
| 3 | 2.000 | 1.200 | 400 de cada |
| 4 | 3.500 | 2.200 | 700 de cada |
| 5 | 5.500 | 3.500 | 1.100 de cada |
| 6 | 9.000 | 6.000 | 1.800 de cada |
| 7 | 15.000 | 10.000 | 3.000 de cada |
| 8 | 25.000 | 17.000 | 5.000 de cada |

Melhorias do celeiro 2–5 custam, respectivamente: 80 madeira/50 pedra/15 ferro; 150/100/40; 300/220/90/30 ouro; 500/400/160/80 ouro. Do nível 5 em diante os custos são: N6 2.500 madeira, 1.800 pedra, 750 ferro, 350 ouro e 2.000 comida; N7 5.500, 4.500, 1.800, 850 e 5.000; N8 11.000, 9.000, 4.000, 2.000 e 12.000.

### Melhorias de outros edifícios

- Fazenda: N2 custa 35 madeira e 20 comida; N3 custa 60 madeira, 25 pedra e 40 comida. O nível aumenta a produção por colheita.
- Casa: N2 custa 70 madeira, 30 pedra e 500 comida; N3 custa 140 madeira, 80 pedra, 25 ferro e 2.500 comida. O consumo de comida a cada dez minutos é 10/50/250 por casa conforme o nível.
- Curral: N2 70 madeira/25 pedra; N3 120/55/15 ferro; N4 200/100/35 ferro; N5 320/170/65 ferro/25 ouro.
- Tecelagem: cinco níveis. Melhorias consomem ferramentas e aumentam quantidade e velocidade de tecidos/roupas.
- Torre: cada nível libera uma vaga de arqueiro; máximo quatro no nível 4. Arqueiros guarnecidos deixam o mapa e cada um aumenta o dano da torre.
- Ferraria: quatro patamares de tecnologia militar: Bronze, Ferro, Ouro e Aço Reforçado. Cada melhoria tem custo e tempo próprios e aumenta dano/defesa/equipamento.

## Aldeões e tarefas

A vila começa com um explorador e um aldeão. Novos aldeões custam 30 comida e levam 45 segundos cada; podem entrar numa fila no Centro Urbano. Casas definem o limite populacional.

Aldeões podem construir, cultivar, cuidar de um curral ou coletar um recurso. O explorador também pode receber ordens de trabalho. O quartel reserva um aldeão livre para cada soldado ou arqueiro treinado: a população total não cresce com o treinamento. Desmobilizar devolve o trabalhador à vida civil e guarda arma, roupa e armadura no estoque. Soldados e arqueiros podem se mover e atacar criaturas. Aldeões, explorador, soldados e arqueiros têm vida; armaduras e pesquisa de armadura reduzem dano.

As unidades procuram rota até o objetivo, evitam água, relevo, estruturas, depósitos e criaturas e voltam ao estoque para entregar a carga. Se o destino estiver bloqueado, o comando é recusado com motivo.

## Coleta e movimentação de recursos

Recursos naturais são distribuídos no mapa e não aparecem em posições aleatórias a cada coleta. A madeira vem de árvores (240 por árvore); árvore esgotada desaparece e pode ser replantada por um aldeão (30 segundos de plantio, 10 minutos até crescer). Galhos também dão madeira. Depósitos de pedra têm 300, ferro 80 e ouro 240. Pedra, ferro e ouro regeneram no mesmo lugar cinco minutos após esgotarem.

A capacidade básica de carga é 8. Pesquisa de transporte e ferramentas aumentam o limite para materiais leves. Pedra e ouro têm peso maior: a carga efetiva é cerca de um terço da capacidade e o excesso reduz bastante a velocidade de caminhada. O jogo mostra custo faltante e estimativa de viagens em construções.

## Agricultura, animais e comida

Cada fazenda ocupa 2×2, recebe até quatro trabalhadores e passa por plantio, crescimento e colheita. Cenoura cresce em 30 segundos, trigo em 45 e batata em 36, antes dos bônus de pesquisa e poço. Sem trabalhador, o ciclo pausa. Os trabalhadores carregam e entregam a produção no celeiro.

| Animal | Comida para comprar | Crescimento | Produção por coleta |
|---|---:|---:|---|
| Porco | 25 | 120 s | 40 comida |
| Vaca | 40 | 180 s | 45 comida + 8 leite |
| Ovelha | 30 | 150 s | 30 comida + 8 lã |
| Galinha | 15 | 90 s | 18 comida + 6 ovos + 3 penas |

O ciclo de coleta animal leva oito segundos de trabalho. Com aldeão responsável e espaço, o curral reproduz um animal a cada dez minutos, consumindo 15 comida. Cada curral guarda uma única espécie escolhida; para espécies distintas, construa currais separados. O consumo de comida considera aldeões, tropas, animais e casas a cada dez minutos.

## Oficinas, itens e comércio

| Item | Receita base | Tempo base |
|---|---|---:|
| Pregos ×5 | 8 ferro + 2 madeira | 20 s |
| Tecido ×3 | 5 madeira + 4 lã | 30 s |
| Roupa ×1 | 4 comida + 2 tecidos | 35 s |
| Ferramenta ×1 | 15 ferro + 12 madeira + 2 pregos | 50 s |
| Arma ×1 | 20 ferro + 10 madeira + 5 ouro + 3 pregos | 60 s |
| Armadura ×1 | 25 ferro + 8 ouro + 3 pregos + 2 tecidos | 75 s |

O Centro Urbano troca lotes de 10: venda rende 1 moeda por comida, 2 por madeira, 3 por pedra e 5 por ferro; comprar custa o dobro. Produtos de oficinas e animais também podem ser vendidos. Ouro minerado permanece material, separado das moedas do tesouro, mas pode ser trocado no mercado em lotes de 10. A caravana compra até 1.000 moedas por ciclo financeiro de 30 minutos. Sementes e treinamento usam moedas. Pesquisa abre cestos/carrinho/carroça, arados, compostagem, adubação e irrigação, com três níveis cada.

## Tesouro e sociedade

O Centro Urbano tem a aba Cidade. Ela mostra moedas, satisfação, confiança, salários, soldos, impostos e entradas/saídas de cada recurso na última hora de jogo. A cada 30 minutos de simulação, a cidade cobra impostos sobre a produção recente de comida (limitados pela população trabalhadora) e paga 2 moedas por aldeão ativo e 4 por soldado ou arqueiro. Salários civis começam na Era do Comércio. Insuficiência de moedas gera atraso e reduz a satisfação gradualmente. Enquanto ninguém está conectado, a satisfação não cai abaixo de 50 e a confiança não cai abaixo de 45 por esse sistema.

Há cinco políticas tributárias, de isenção a impostos abusivos; a política só pode ser alterada uma vez a cada dez minutos de jogo. Um festival consome 100 comida e 20 moedas para elevar satisfação e confiança; só pode ocorrer uma vez por ciclo financeiro. A satisfação modifica a eficiência dos trabalhadores, sem impedir a coleta básica.

## Combate e PvP

A vila tem combate PvE: um lobo ou urso aparece nos cantos do mapa; criaturas são passivas até serem atacadas. Depois, perseguem o atacante e podem ferir unidades. Só há uma criatura ativa por vez; após derrotá-la, outra surge em cinco minutos de jogo. Torres com arqueiros atacam ameaças hostis ao alcance.

**PvP entre jogadores ainda não está implementado.** Hoje o servidor mantém uma vila em uma sessão, sem contas, visitas a outros reinos ou duas partidas independentes de batalha. O desenho futuro deve exigir aceite dos dois jogadores, criar uma instância isolada de batalha, espelhar os exércitos e estruturas sem expor/alterar a vila original, definir duração/regras/recompensas e registrar o resultado no servidor. Esses requisitos precisam estar no código antes de divulgar PvP como disponível.

## Próximos sumidouros de recursos sugeridos

Os níveis 6–8 do Centro Urbano e do celeiro já consomem os estoques de fim de jogo. Para dar propósito contínuo aos recursos depois disso, a ordem recomendada é: (1) encomendas comerciais que consumam comida, tecido, roupas, ferramentas e armas em troca de reputação; (2) projetos únicos de Reino/Império, como palácio, grande muralha ou monumento, com pedra/ferro/ouro e bônus visíveis; (3) frota de expedição com custo de construção, provisões e reparo em madeira/ferro/comida; (4) manutenção opcional de tropas/estruturas para criar decisão estratégica sem bloquear a coleta básica.

## Fonte de verdade

Este guia resume o estado do protótipo; parâmetros numéricos e validações vivem em `shared/village/config.ts`, ordens e ciclos em `shared/village/simulation.ts`, tipos salvos em `shared/village/types.ts`, e painéis em `web/src/views/village/`. Ao mudar uma regra, atualize o guia junto com o código.
