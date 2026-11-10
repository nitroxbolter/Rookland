# ROOKLAND — Documento de Design: Economia, Sociedade, Equipamentos e Exército

**Versão:** 1.0 — proposta de design (10/11/2026)  
**Objetivo:** criar uma fazendinha medieval com economia profunda, desenvolvimento livre de cidade, população viva, indústria, comércio, preparação militar e futuramente exploração e saques.  
**Status:** propostas para implementação e balanceamento. Os valores numéricos abaixo são *pontos de partida*, não parâmetros comprovados do código existente.

> **Princípio inegociável:** o avanço NÃO exige esperar dias, comprar aceleração nem aguardar cronômetros artificiais. A progressão depende de planejamento, cadeias produtivas, decisões e materiais. Produção pode levar tempo normal de simulação, mas não há bloqueio de calendário para passar de nível.

---

## 1. Diagnóstico e visão

O ciclo atual tende a gerar estoque demais: coleta → celeiros cheios → custos de construção facilmente pagos → avanço rápido. Em vez de multiplicar preços indiscriminadamente, criar **saídas econômicas** competitivas: fabricação, habitação, alimentação, ferramentas de trabalho, serviços públicos, treinamento, armas, armaduras, salário, construção militar, comércio e expedições.

**Novo ciclo:** extrair → processar → distribuir → satisfazer população → arrecadar/comercializar → equipar soldados → conquistar/explorar → trazer recursos raros → pesquisar tecnologia → produzir itens melhores.

**Três escolhas simultâneas:** investir na cidade, no comércio ou na defesa. Especialização deve ser possível, mas não gratuita: um exército grande reduz a mão de obra disponível e gera despesas de soldo.

### 1.1 Regras de justiça
- Nenhum edifício essencial deve exigir exclusivamente loot aleatório; sempre fornecer rota de obtenção alternativa.
- Faltar comida, dinheiro ou remédios gera **avisos e perdas graduais**, não destruição instantânea.
- Jogador desconectado: simular produção normal, mas limitar penalidades graves acumuladas (ver §12).
- Sem punição aleatória inevitável: surtos e conflitos devem ter causas visíveis e formas claras de prevenção.
- Não introduzir manutenção em todos os objetos: concentrar gastos em categorias explicáveis para evitar microgerenciamento.
- Toda produção e consumo deve ser registrada e exibida por hora na interface.

---

## 2. Recursos e itens: catálogo extensível

### 2.1 Matérias-primas
| Categoria | Itens | Origem | Uso |
|---|---|---|---|
| Floresta | madeira, lenha, resina, carvão vegetal | lenhador, carvoaria | edifícios, fornos, armas, combustível |
| Pedreira | pedra bruta, calcário, argila, areia | pedreira, poço de argila | alvenaria, telhas, vidro |
| Mineração | cobre, estanho, ferro, carvão mineral, prata, ouro | minas de níveis/biomas diferentes | ligas, ferramentas, moeda, itens avançados |
| Agricultura | trigo, cevada, centeio, linho, legumes, frutas, ervas | fazendas, pomares, horta | comida, tecido, tratamentos |
| Pecuária | lã, couro bruto, leite, ovos, carne, gordura, ossos | curral, estábulo, abatedouro | tecidos, comida, couro, cola |
| Exploração (futuro) | sal, especiarias, enxofre, cristais, madeiras raras | regiões, ruínas, caravanas | conservação, comércio, tecnologias especiais |

**Atenção à complexidade:** começar com madeira, pedra, ferro, trigo, lã, couro, carvão e ervas; liberar demais minérios gradualmente. Não implementar 50 recursos antes de criar uso para os primeiros dez.

### 2.2 Materiais processados
| Produto | Receita inicial sugerida | Estrutura |
|---|---|---|
| Tábuas ×2 | madeira ×3 | serraria |
| Vigas ×1 | tábuas ×3 + ferro ×1 | carpintaria |
| Blocos de pedra ×2 | pedra bruta ×3 | pedreiro |
| Tijolos ×2 | argila ×3 + lenha ×1 | olaria |
| Lingote de ferro ×1 | minério de ferro ×3 + carvão ×1 | fundição |
| Lingote de bronze ×2 | cobre ×2 + estanho ×1 + carvão ×1 | fundição |
| Ferramentas comuns ×2 | lingote de ferro ×1 + tábuas ×1 | ferraria |
| Farinha ×2 | trigo ×3 | moinho |
| Pão ×3 | farinha ×2 + lenha ×1 | padaria |
| Tecido ×2 | lã ×3 **ou** linho ×3 | tecelagem |
| Couro tratado ×2 | couro bruto ×3 + água ×1 | curtume |
| Cordas ×2 | linho ×2 | oficina têxtil |
| Ataduras ×2 | tecido ×1 + ervas ×1 | boticário |

Valores são unidades abstratas. Usar regras consistentes de rendimento, definir capacidade e tempo de ciclo por indústria e testar a geração líquida.

### 2.3 Alimentos e necessidades
- **Básicos:** trigo, farinha, pão, raízes, legumes, peixe.
- **Intermediários:** queijo, carne cozida, sopa, ovos, frutas.
- **Valiosos:** refeições completas, carne salgada, cerveja, banquetes.
- **Saúde:** ervas, ataduras, remédios, água tratada (água poderá ser serviço simplificado, sem inventário físico no MVP).
- **Conforto:** roupas simples, mantas, móveis e itens de decoração; opcionais no início, relevantes em cidades grandes.

Em vez de exigir dezenas de alimentos, criar **variedade alimentar**: a presença de 2–3 grupos distintos melhora saúde/satisfação; a falta temporária diminui bônus, sem eliminar moradores imediatamente.

---

## 3. Estruturas e saídas de recursos

| Edifício/sistema | Entrada | Saída/função | Por que gastar nele |
|---|---|---|---|
| Fazenda/horta | sementes, ferramentas | alimento/fibras | base da vila |
| Serraria | toras, ferramenta | tábuas | construções e escudos |
| Carpintaria | tábuas, ferro | vigas, arcos, móveis | estruturas e armas |
| Pedreiro | pedras, ferramentas | blocos | fortificação |
| Olaria | argila, lenha | tijolos, telhas | construções melhores |
| Carvoaria | madeira | carvão | metalurgia |
| Fundição | minério, carvão | lingotes | fabricação avançada |
| Ferraria | lingotes, madeira | ferramentas, pontas, ferragens | produção e tropas |
| Curtume | couro bruto | couro tratado | armaduras e botas |
| Tecelagem | lã/linho | tecidos | roupas e gambesões |
| Armaria | ferro, couro, tecido | armaduras, escudos, capacetes | exército |
| Oficina de armas | metal, madeira | espadas, lanças, machados | exército |
| Arqueria | tábuas, corda, ferro | arcos, flechas | arqueiros |
| Estábulo | alimentação, madeira | cavalos preparados | cavalaria |
| Quartel | armas, armaduras, ouro, provisões | unidades recrutadas | proteção e guerra |
| Arsenal | armas, armaduras | armazenamento/reserva | equipamentos para tropas |
| Mercado | produtos | moeda, encomendas | retira excedentes |
| Taverna | alimentos, bebida | satisfação | retenção da população |
| Capela/praça | madeira, pedra, materiais | confiança/serviço social | identidade da vila |
| Curandeiro/enfermaria | ervas, ataduras, moedas | tratamento | reduz afastamentos |
| Escola/oficina de aprendiz | livros/recursos, moedas | habilidades/eficiência | desenvolvimento |
| Muralhas/torres | pedra, vigas, ferro | defesa e prestígio | cidade mais segura |
| Estradas/ponte | pedra, madeira | logística e acesso | movimentação e eficiência |
| Academia/biblioteca | ouro, ferramentas, produtos | pesquisas | desbloqueio tecnológico |

**Construção por etapas:** projeto → fundação (materiais brutos) → acabamento (processados) → conclusão. Permitir entregas parciais ao canteiro, sem obrigar tudo a caber simultaneamente no celeiro.

### 3.1 Melhorias laterais em vez de apenas “prédio +1”
- Moinho: engrenagens melhores, eficiência em farinha, menor consumo de lenha.
- Ferreiro: forja melhor, qualidade de armamento, menor desperdício.
- Celeiro: ampliação física, separação de alimentos, conservação.
- Casas: palha → madeira → pedra, conforto e capacidade da família.
- Torres: madeira → pedra → balista/arqueiros, a depender da era.
- Praça: beleza, festivais, prestígio e satisfação.

---

## 4. Armazenamento e logística

**Sugestão:** celeiro = comida/insumos agrícolas; armazém = madeira/pedra/minério/materiais; arsenal = equipamentos militares; tesouro = moedas. Não dividir estoques sem necessidade de jogo: compatibilizar migrando itens antigos com segurança.

- Produção e consumo passam por estoques com *capacidade por categoria*, não necessariamente por item.
- Estruturas produtivas possuem pequeno estoque de entrada/saída, ajudando a desafogar armazenamento.
- Canteiros podem receber recursos antecipadamente e assim liberar armazéns.
- Mercado oferece **pedidos de caravana** e ordens locais; preços dinâmicos com limites para impedir arbitragem infinita.
- Se um celeiro enche, o jogador vê o gargalo e três ações recomendadas: processar, vender ou construir.
- Nunca descartar automaticamente produtos raros; excedentes comuns só podem virar compostagem/ração com autorização do jogador.
- Rotas logísticas e trabalhadores transportadores podem ser introduzidos depois; MVP pode continuar com depósito global para evitar sobrecarga técnica.

---

## 5. Equipamentos, armas e armaduras

### 5.1 Armas, progressão e receitas iniciais
| Arma | Materiais de exemplo | Uso | Desbloqueio |
|---|---|---|---|
| Clava | madeira ×3 | milícia barata | inicial |
| Lança de madeira | madeira ×3 + corda ×1 | lanceiro fraco | inicial |
| Lança de ferro | tábuas ×2 + lingote de ferro ×1 | anti-cavalaria | ferraria I |
| Machado simples | madeira ×2 + lingote de ferro ×1 | infantaria, ferramenta | ferraria I |
| Espada curta | lingotes de ferro ×2 + couro ×1 | infantaria | ferraria II |
| Espada longa | lingotes de ferro ×3 + couro ×1 | soldado pesado | ferraria III |
| Arco curto | tábuas ×2 + corda ×1 | arqueiro básico | carpintaria I |
| Arco longo | madeira selecionada ×3 + corda ×2 | alcance maior | arqueria II |
| Besta | tábuas ×3 + ferro ×2 + corda ×2 | dano/recarga lenta | tecnologia avançada |
| Maça de guerra | ferro ×3 + madeira ×1 | antiblindagem | ferraria III |
| Alabarda | ferro ×3 + vigas ×1 | tropa de elite | tecnologia avançada |
| Flechas (lote) | madeira ×2 + ferro ×1 | munição | arqueria |
| Virotes (lote) | madeira ×2 + ferro ×2 | munição de besta | arqueria II |

### 5.2 Peças defensivas
| Slot | Nível simples | Intermediário | Avançado |
|---|---|---|---|
| Cabeça | gorro acolchoado | capacete de couro | elmo de ferro/aço |
| Peito | túnica grossa | gambesão/couro reforçado | cota de malha/peitoral de placas |
| Pernas | calças de tecido | perneiras de couro | grevas metálicas |
| Braços | tecido grosso | braçadeiras de couro | braçadeiras metálicas |
| Escudo | escudo de madeira | escudo reforçado | escudo de ferro |
| Calçados | sapatos comuns | botas de couro | botas reforçadas |
| Montaria | — | arreios simples | armadura de cavalo |

**Receitas-modelo:** gambesão = tecido ×4 + couro ×1; cota de malha = lingotes de ferro ×5 + couro ×2; escudo reforçado = tábuas ×3 + ferro ×1; elmo = ferro ×2 + couro ×1.

**Mecânica recomendada:** equipamento determina *tipo de unidade* e seus atributos. Uma espada sem armadura não cria automaticamente um cavaleiro. Não exigir seis slots para todos os recrutas: no MVP, usar pacotes de **arma principal + proteção corporal**; capacetes, escudos e botas são melhorias opcionais até sistemas avançados.

### 5.3 Qualidade e desgaste
- Três graus inicialmente: comum, bom, superior; qualidade depende de pesquisa, estrutura e habilidade.
- Equipamentos não evaporam por tempo parado. Sofrem desgaste **no combate**, podendo ser reparados por materiais + trabalho.
- Derrota não deve eliminar automaticamente 100% do equipamento: parte retorna danificada, parte pode ser saqueada pelo vencedor.
- Evitar criar armas infinitas por ciclo de venda/compra; conferir custos e limites do mercado.

---

## 6. Recrutamento: soldado exige equipamento + sustento

**Regra central:** criar soldado exige (a) aldeão disponível, (b) vaga de quartel, (c) treinamento, (d) kit de equipamento, (e) provisões iniciais e (f) dinheiro para o soldo. O soldado deixa de trabalhar como aldeão enquanto estiver mobilizado.

| Unidade | Equipamento mínimo | Custo extra de treinamento* | Papel |
|---|---|---|---|
| Miliciano | clava + túnica | 5 comida + 5 moedas | defesa emergencial |
| Lanceiro | lança de ferro + gambesão | 10 comida + 12 moedas | linha defensiva |
| Espadachim | espada curta + escudo + couro | 14 comida + 20 moedas | infantaria geral |
| Arqueiro | arco + lote de flechas + gambesão | 12 comida + 18 moedas | suporte distante |
| Besteiro | besta + virotes + couro | 16 comida + 25 moedas | ataque pesado à distância |
| Guarda pesado | espada longa + cota + elmo | 20 comida + 35 moedas | linha de elite |
| Cavaleiro | lança/espada + cota + cavalo + arreios | 25 comida + 60 moedas | mobilidade e impacto |
| Engenheiro militar | ferramentas + equipamento leve | 16 comida + 30 moedas | cercos e máquinas |

*Moedas são custo único de treinamento, **não** substituem soldo recorrente. Os valores devem ser testados em conjunto com a receita da cidade.

**Sistema de reserva:** um aldeão treinado pode voltar à vida civil e guardar o kit no arsenal; ao ser convocado, mobiliza mais rápido. Isso evita que todos os soldados precisem consumir soldo integral permanentemente.

### 6.1 Custos de campanhas (futuro)
- Provisões por distância/tamanho do exército: pão, carne conservada, água abstraída.
- Flechas/virotes e materiais de cerco são consumidos em combate.
- Feridos exigem tratamento; armas danificadas pedem reparo.
- Saque é uma recompensa variável, não uma garantia que sempre paga a guerra.
- Expedições curtas disponíveis antes de PvP: bandidos, ruínas e minas antigas.

---

## 7. Salários, soldos, impostos e tesouro

### 7.1 Modelo de moeda
- **Tesouro da cidade** paga soldos e serviços públicos.
- **Moedas das famílias** (opcional futuro) explicam consumo e impostos; no MVP, manter saldo agregado e um fluxo financeiro diário, sem microcontabilidade para cada NPC.
- Ouro de mineração não precisa virar dinheiro automaticamente: fundição/casa da moeda, mercado ou impostos geram moedas.
- Fontes monetárias: comércio externo, contratos, saques, impostos, recompensas de missão.
- Destinos monetários: soldos, salários, pesquisas, importação de itens, serviços, festivais, recuperação de tropas.

### 7.2 Pagamento por dia de jogo, não por dia real
Usar **ciclos econômicos da simulação**, com cadência configurável. Exemplo de teste: 1 ciclo financeiro a cada 30 minutos de tempo de jogo simulado, mas nunca cobrar dezenas de ciclos punitivos retroativamente quando o usuário retorna. A duração é detalhe de balanceamento, não bloqueio de progressão.

| Profissão | Remuneração sugerida por ciclo | Observação |
|---|---:|---|
| Agricultor/lenhador/minerador | 2 moedas | trabalho comum |
| Artesão/ferreiro/padeiro | 3 moedas | produção especializada |
| Curandeiro/professor | 4 moedas | serviço público |
| Miliciano em reserva | 1 moeda | pequena retenção opcional |
| Lanceiro/arqueiro ativo | 4 moedas | soldo ativo |
| Espadachim/guarda | 5 moedas | soldo ativo |
| Guarda pesado/besteiro | 7 moedas | custo alto |
| Cavaleiro | 10 moedas | alto custo; cavalo também consome ração |

**Importante:** moedas, salários e receitas precisam fechar matematicamente; sem fontes suficientes de dinheiro, não aplicar salários constantes altos a uma vila iniciante. No início, permitir subsistência com **moradia + alimentação + pequeno pagamento** e aumentar a monetização conforme surgem mercado e impostos.

### 7.3 Impostos e legitimidade do líder
| Política | Receita tributária | Satisfação |
|---|---:|---:|
| Isento | 0% sobre a base | +8 |
| Baixo | 5% | +3 |
| Normal | 10% | 0 |
| Alto | 15% | -8 |
| Abusivo | 20% | -20 |

*Percentuais e pontos são ilustrativos.* A base tributária deve representar atividade econômica/população produtiva, não imprimir moedas sem limite. **Evitar exploração por alternar impostos a cada segundo:** aplicar média de uma janela de tempo e período mínimo de mudança.

### 7.4 Falta de pagamento
1. Primeiro ciclo sem pagamento: aviso, pequena perda de confiança.
2. Segundo ciclo: produtividade/moral reduzida; inicia reclamação.
3. Persistência: paralisação parcial e deserção gradual de soldados profissionais.
4. Recuperação: pagar atrasados ou renegociar, restaurar confiança gradualmente.

Prioridade configurável do tesouro: saúde/alimentação essencial → serviços vitais → soldos de defesa → salários gerais → obras/pesquisas, ou permitir perfis definidos pelo jogador. Nunca retirar recursos de forma invisível: painel com previsão de saldo.

---

## 8. Sociedade medieval e satisfação

### 8.1 Estado civil e ocupacional da população
**Cada habitante/família:** profissão, casa, saúde, satisfação, necessidades, educação/competência, grupo social (camponês, artesão, comerciante, soldado) e histórico recente. Para desempenho, simular por **famílias ou grupos** quando a cidade crescer, com NPCs visíveis representativos.

### 8.2 Satisfação de 0–100
Começa em **60 (estável)**. Exemplo de composição por janela de avaliação:

`Satisfação-alvo = 50 + alimentação + moradia + salário + saúde + serviços + segurança - impostos - desemprego - atrasos - doenças`

Limitar 0–100, amortecer mudanças no tempo e mostrar as **3 principais causas** no painel. Bônus/punições devem ter teto por categoria para evitar empilhamento descontrolado.

| Fator | Exemplo de efeito |
|---|---:|
| Comida suficiente | +8 |
| Variedade de alimentos | +5 |
| Casa adequada | +8 |
| Salários em dia | +6 |
| Curandeiro acessível | +4 |
| Praça/festival/taverna | +3 a +6 |
| Segurança contra ataques | +5 |
| Casas insuficientes | -12 |
| Falta de comida | -18 |
| Soldos/salários atrasados | -12 |
| Doença sem tratamento | -10 |
| Impostos altos | -8 |
| Derrota militar recente | -5 |

### 8.3 Faixas e consequências
| Satisfação | Estado | Efeito sugerido |
|---:|---|---|
| 85–100 | Leal | +10% produtividade, atração de famílias |
| 70–84 | Contente | +5% produtividade |
| 50–69 | Estável | normal |
| 35–49 | Insatisfeito | -10% produtividade, reclamações |
| 20–34 | Revoltado | -25% produtividade, greves parciais |
| 0–19 | Crise social | greves, emigração e deserção gradual, com aviso |

**Greves:** afetam apenas parte dos setores por ciclo, e serviços vitais mantêm uma produtividade mínima para não criar um *softlock*. Sem punição irreversível para quem ficou offline.

### 8.4 Confiança no governante: valor diferente de satisfação
- **Satisfação:** condição atual da vida (comida, moradia, serviços).
- **Confiança/legitimidade:** percepção do líder ao longo do tempo (promessas cumpridas, impostos, segurança, decisões difíceis).
- Cidade rica pode estar revoltada por impostos abusivos; cidade simples pode ser fiel por boa distribuição.
- A confiança se recupera mais lentamente do que a satisfação para evitar explorar o sistema de eventos.

### 8.5 Decisões e eventos sociais
| Evento | Decisões do jogador | Consequências |
|---|---|---|
| Colheita ruim | importar grãos / distribuir reserva / racionar | moeda ou satisfação |
| Pedido de aumento | aumentar salários / melhorar alimentação / recusar | custos ou risco de greve |
| Epidemia local | investir em enfermaria / isolamento temporário | recursos ou produção |
| Bandoleiros próximos | montar patrulha / pagar escolta / ignorar | soldo ou risco de saque |
| Festival da colheita | realizar / adiar | consome comida e ouro, melhora confiança |
| Refugiados | acolher / limitar entrada | mão de obra vs pressão sobre moradia |
| Corrupção no mercado | fiscalizar / tolerar | custo curto prazo vs confiança |

Eventos devem mostrar causa, opções, previsão de consequências e janela para agir. Não disparar três crises graves simultâneas.

---

## 9. Saúde, higiene, doenças e recuperação

**Separar saúde de satisfação.** Povo feliz pode adoecer; povo saudável pode protestar contra impostos.

- Saúde depende de alimentação variada, habitação, acesso ao curandeiro, higiene e risco sazonal/ambiental.
- Doença tem estágios: suscetível → doente leve → doente grave → recuperação.
- Doentes leves trabalham menos; graves ficam afastados por alguns ciclos. Curandeiro e ervas/ataduras aceleram recuperação.
- Sem sistema de mortalidade no MVP; considerar mortes apenas em modo avançado, com opção clara e balanceamento.
- Surtos devem ter chance moderada dependente de riscos reais; não gerar epidemias apenas porque o jogo ficou aberto.
- UI precisa exibir número de doentes, causa principal e estoque de medicina.
- Serviços propostos: poço, latrina/esgoto simplificado, enfermaria, boticário, banho público (fases avançadas).

**Exemplo:** 20 aldeões, 3 doentes leves, 1 grave → produção equivalente a 17–18 trabalhadores, aproximadamente, dependendo da profissão. Não paralisar a vila inteira.

---

## 10. População, trabalho e desenvolvimento social

- **Famílias** exigem casas, comida e segurança; novas famílias chegam se houver vagas e boa reputação.
- **Crianças/aprendizes**: opcional futuro, sem forçar calendário de envelhecimento longo.
- Trabalhadores especializados ganham prática e melhoram rendimento; reconversão profissional tem custo baixo.
- Aldeões podem ser deslocados para exército, oficinas, transporte, medicina e construção.
- Separar trabalhadores disponíveis, empregados, doentes, mobilizados e desempregados.
- **Desemprego** moderado não é fatal: trabalhadores livres podem construir, transportar, limpar terrenos e participar de obras públicas.
- **Desigualdade** (fase futura): mercadores enriquecem, camponeses reclamam; ajustar com impostos progressivos, festivais e habitações, sem tornar o jogo um simulador político excessivo.

---

## 11. Tecnologias e eras — desbloquear fazendo, não esperando

| Trilha | Inicial | Intermediária | Avançada |
|---|---|---|---|
| Agricultura | sementes melhores | rotação de culturas | irrigação/moinhos superiores |
| Indústria | serraria/ferraria | bronze, ferro trabalhado | aço/forja avançada |
| Civil | casas de madeira | alvenaria, saneamento | escolas, hospitais, bairros |
| Militar | milícia, lanças | arcos, cota de malha, quartel | besteiros, cavalaria, máquinas de cerco |
| Economia | troca, mercado | caravanas, cunhagem | guildas, contratos regionais |
| Exploração | batedores | acampamentos e ruínas | fortalezas/territórios distantes |

**Exigências de tecnologia:** projeto concluído + recursos de pesquisa + evidência de uso (ex.: produzir 30 lingotes para estudar ferramentas aprimoradas). Evitar grind extremo de “produza 10.000 itens”. O jogador pode concentrar esforços e avançar na mesma sessão.

---

## 12. Simulação offline e proteção contra efeito bola de neve

O README do repositório informa que a simulação roda no backend mesmo com o navegador fechado. Por isso:

1. Definir um **limite configurável de ciclos de cobrança acumulados** por período sem atividade (ex.: máximo de 2 ciclos econômicos de penalidades de inadimplência offline; valores precisam teste).
2. Permitir produção e estoques seguirem funcionando, mas **nunca deixar satisfação, saúde e população zerarem automaticamente** em uma ausência.
3. Se faltar moeda, ativar **modo de crise**: suspender contratações e recrutamento, limitar gastos opcionais, informar déficit e aplicar penalidades graduais.
4. Armazéns cheios interrompem entradas, não provocam destruição arbitrária.
5. Restringir surgimento de surtos, deserções e greves graves durante longos períodos de ausência; persistir estado e resolver no retorno.
6. Calcular em lote por *tick* com quantidades e limites definidos: não iterar minuto por minuto em milhares de NPCs durante login.
7. Usar tempo de servidor confiável e transações atômicas para salários, produção e reservas de itens.

**Princípio:** offline pode render recursos e criar pequenos desafios, não punir o jogador por ter vida fora do jogo.

---

## 13. Modelo econômico e fórmulas para balancear

### 13.1 Fluxo de estoque
`estoque_final = min(capacidade, estoque_inicial + produção + compras + saques - consumo - vendas - construção - perdas)`

Calcular por categoria e pelo menos por hora de simulação. Mostrar excedente líquido e estimativa de saturação do armazém.

### 13.2 Fluxo monetário
`saldo_final = saldo_inicial + vendas_externas + contratos + tributos + saques - salários - soldos - importações - serviços - pesquisas`

**Cuidado com circularidade:** tributos representam recolhimento de renda da economia; não são geração infinita de dinheiro sem uma atividade tributável. Mercado NPC deve ter cotas/orçamentos de compra.

### 13.3 Tempo de objetivo sem timer artificial
`trabalho_necessário = custo_total_de_insumos + ciclos_de_processamento + realocação_de_trabalhadores + transporte`

O jogador pode acelerar otimizando produção, comerciando ou explorando, em vez de pagar para passar uma contagem regressiva.

### 13.4 Critérios de teste
- Novato consegue produzir primeiro kit de miliciano sem depender de itens raros.
- Produção não enche todo o armazenamento antes de existir pelo menos 2–3 maneiras acessíveis de gastar cada categoria principal.
- Jogador pode optar por comércio, crescimento urbano ou exército sem ficar insolvente imediatamente.
- Exército grande é investimento estratégico e não pode ser sustentado infinitamente só acumulando comida.
- Salários pagos + serviços não consomem toda receita média de uma cidade saudável.
- Uma falta pontual de moeda não gera greve instantânea; crises de longo prazo têm recuperação possível.
- Testar perfis: 15 minutos, 1 hora, 4 horas online, 24 horas offline; também 10, 50 e 200 habitantes.

### 13.5 Exemplo simplificado de um ciclo (valores hipotéticos)
| Item | Quantidade/moedas |
|---|---:|
| Receita de mercado e contratos | +120 moedas |
| Impostos | +30 moedas |
| Salários de 20 aldeões (2 cada) | -40 moedas |
| Soldo de 10 soldados (4 cada) | -40 moedas |
| Enfermaria e serviços públicos | -10 moedas |
| **Saldo livre para pesquisas e compras** | **+60 moedas** |

**Interpretar:** 10 soldados já consomem tanto dinheiro quanto 20 aldeões. Recrutar mais 20 soldados exigiria expandir economia, aumentar impostos (com custo social), abrir comércio ou desmobilizar unidades.

---

## 14. Experiência e interface do jogador

### 14.1 Painel da cidade
- Estoque: percentual do celeiro/armazém/arsenal + “tempo até lotar”.
- População: total, disponíveis, mobilizados, doentes, insatisfeitos.
- Tesouro: saldo, receitas/ciclo, salários/ciclo, soldos/ciclo, margem e atrasados.
- Satisfação: nota 0–100, tendência, três causas com ações recomendadas.
- Saúde: casos leves/graves, eficiência de atendimento, risco atual.
- Militar: kits completos disponíveis, unidades treinadas, custos de manutenção, provisões.

### 14.2 Ações em 1–2 cliques
- “Criar kit para 5 lanceiros” → oficina reserva automaticamente materiais e mostra faltantes.
- “Construir muralha” → mostra blocos/ferragens/ferramentas e progresso do canteiro.
- “Atender caravana” → converte excedentes em moeda e reputação.
- “Aumentar soldo em 10%” → mostra efeito previsto na moral e tesouro.
- “Tratar doentes” → mostra ervas/ataduras necessárias e profissionais disponíveis.

### 14.3 Alertas inteligentes
Somente alertas acionáveis: estoque cheio, tesouro insuficiente para próximo ciclo, risco sanitário, falta de ferramentas, kits militares incompletos, greve iminente. Alertas repetidos precisam de cooldown.

---

## 15. Roadmap: implementar em camadas

### Fase A — resolver o celeiro e os gastos (prioridade máxima)
1. Instrumentar geração/consumo por recurso; painel de excedente.
2. Criar serraria, fundição, ferraria, tecelagem e 10–15 materiais processados úteis.
3. Permitir construir por etapas, reservar recursos em obras e pedidos comerciais.
4. Ajustar capacidade de estoque e custos com base em métricas; não usar dias como trava.

### Fase B — armamento e recrutamento
1. Criar esquema de itens/equipamentos/receitas.
2. Equipar miliciano, lanceiro, arqueiro e espadachim com kits mínimos.
3. Exigir trabalhador disponível, kit, provisões e custo de treinamento.
4. Arsenal, manutenção pós-combate e retorno à vida civil.

### Fase C — salário e sociedade
1. Tesouro, fluxos de moeda, salários e soldos por ciclo.
2. Satisfação com causas visíveis, impostos e serviço urbano.
3. Doença simples, curandeiro e afastamentos sem morte.
4. Greves e deserções graduais com alertas e soluções.

### Fase D — expansão
1. Pesquisa medieval e tecnologias por trilhas.
2. Caravanas, contratos, reputação, guildas e decisões civis.
3. Expedições PvE, feridos, saque e manutenção militar.
4. Guerras de campo/PvP após identidades de jogador e persistência robusta.

**Alerta técnico:** o README público indica mundo/inventário compartilhados e ausência de contas individuais. Para PvP, comércio entre jogadores e disputas territoriais, implementar antes identidades, propriedade de cidades, autenticação e isolamento seguro de inventários.

---

## 16. Modelo de dados sugerido

```ts
interface CityEconomy {
  cityId: string;
  treasury: number;
  stocks: Record<string, number>;
  capacities: Record<string, number>;
  taxRate: number;
  wagesPerCycle: number;
  militaryPayrollPerCycle: number;
  socialServicesPerCycle: number;
  lastEconomyTick: number;
}

interface PopulationGroup {
  id: string;
  cityId: string;
  count: number;
  profession: string;
  assignedBuildingId?: string;
  satisfaction: number; // 0..100
  trust: number;        // 0..100
  health: number;       // 0..100
  sickness: 'healthy' | 'mild' | 'severe' | 'recovering';
  unpaidCycles: number;
  onStrike: boolean;
}

interface EquipmentItem {
  id: string;
  slot: 'weapon' | 'body' | 'head' | 'shield' | 'legs' | 'feet' | 'mount';
  quality: 'common' | 'good' | 'superior';
  durability: number;
  maxDurability: number;
}

interface MilitaryUnit {
  id: string;
  cityId: string;
  type: string;
  status: 'reserve' | 'training' | 'active' | 'wounded';
  equipmentItemIds: string[];
  salaryPerCycle: number;
  morale: number;
}
```

Implementar **transações de estoque** com logs (origem, destino, motivo, data), reservas para produção e prevenção de estoque negativo. Receitas e balanceamento devem ficar em dados configuráveis, não espalhados no código. Reaproveitar entidades e IDs existentes após inspeção detalhada do código.

---

## 17. Referências de jogos e o que adaptar

| Jogo | Inspiração de design | Adaptação para RookLand |
|---|---|---|
| **Hay Day** | cadeias de produtos e encomendas | transformar excedentes em pedidos de caravanas, sem espera obrigatória de dias |
| **Age of Empires** | aldeões, contrapartidas de investir em exército, tecnologia | mão de obra mobilizada deixa de produzir; equipamentos reais para recrutamento |
| **Manor Lords** | aprovação popular, necessidades das moradias, efeitos em imigração/milícia | satisfação 0–100 com bônus, penalidades e motivos visíveis |
| **Stronghold** | popularidade ligada a ração/impostos; economia militar | política tributária e gastos recorrentes de soldos |
| **Banished** | saúde, variedade de comida, roupas, ferramentas e empregos | doenças e produtividade ligadas a acesso a bens e serviços |
| **Songs of Syx** | visão de sociedade ampla, grupos e serviços | sociedades e especializações futuras, com simulação agregada escalável |

Não copiar mecânicas ou valores literalmente. As propostas acima combinam princípios dessas referências com um foco próprio: **cidade produtiva e social que sustenta um exército materialmente equipado**.

### Fontes para consulta
- Repositório RookLand: https://github.com/nitroxbolter/Rookland
- Manor Lords Wiki oficial — Approval: https://wiki.hoodedhorse.com/Manor_Lords/Approval
- Stronghold Wiki — Popularity: https://stronghold.fandom.com/wiki/Popularity
- Stronghold Wiki — Tax: https://stronghold.fandom.com/wiki/Tax
- Banished Wiki — Status Bar: https://www.banishedinfo.com/wiki/Status_Bar

---

## 18. Decisões de produto recomendadas

1. **MVP:** apenas quatro tipos de tropa, três níveis de equipamentos e poucas cadeias completas. Mais profundidade vale mais do que 100 itens sem utilidade.
2. **Sem cronômetros de evolução:** avanço por produção, projetos, comércio e tecnologias.
3. **Consumo com sentido:** todo item deve participar de construção, trabalho, conforto, comércio, armamento ou exploração.
4. **Soldo real:** exército grande precisa de cidade forte; reserva reduz gasto.
5. **Sociedade legível:** povo protesta por razões claras; saúde e confiança recuperam com medidas efetivas.
6. **Offline justo:** evitar falência social automática quando o jogador não estiver presente.
7. **Economia auditável:** produção, consumo e déficit sempre explicados em números.
8. **Próximo passo técnico:** levantar receitas e cadências atuais do código, comparar consumo contra produção, e ajustar os coeficientes das fases A–C conforme partidas de teste.

**Visão final:** o objetivo não é fazer o jogador aguardar uma evolução. É fazer com que ele queira usar a madeira para construir, fabricar escudos, melhorar casas, preparar caravanas ou financiar uma expedição — e, por isso, tenha decisões interessantes a cada sessão.
