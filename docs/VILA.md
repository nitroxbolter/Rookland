# Vila e economia de RookLand

Abra `http://127.0.0.1:8080/crops_farm`. O laboratório original continua em
`/crops_laboratory` e o editor em `/farm_laboratory`.

## Abertura e eras

Em uma vila nova, faça o primeiro celeiro pelo menu **Construir** para receber
comida. Depois, use **Tarefas**, selecione um trabalhador e toque na fazenda
inicial. A primeira colheita e a primeira entrega liberam trigo, poço, curral
de porcos e recrutamento.

Para chegar ao **Comércio**, tenha uma casa pronta, um celeiro pronto, dois
aldeões atribuídos à produção e 60 comidas colhidas. O avanço custa 120 madeira,
80 pedra e 100 comida, e leva 3 minutos de jogo. O Comércio libera ferro,
mercado e novas cadeias produtivas. A mineração de ouro também exige Cestos
de coleta. O Centro N4 marca a Era da Fortaleza, N6 o Reino e N8 o Império.
As melhorias N6, N7 e N8 levam, respectivamente, 20, 30 e 45 minutos de jogo.

Saves anteriores mantêm as estruturas, as ordens e os desbloqueios de abertura.
A era é apresentada pelo nível do Centro da Vila. Em celular, arraste para
mover a câmera, use pinça para aproximar e toque no início e no fim de uma
linha para construir muros.

## Fazendas de 4×4

Cada fazenda ocupa **4×4 quadrados** e recebe até **quatro trabalhadores**.
O explorador também pode ocupar uma vaga. Selecione uma unidade e clique na fazenda,
ou desmarque a unidade e clique na fazenda para abrir seu painel.

Para atribuir trabalho, selecione o aldeão ou explorador e clique na fazenda.
Depois que a ordem é aceita, a unidade é desmarcada automaticamente. O painel
Construir aparece apenas ao selecionar uma unidade diretamente no mapa, e permanece
visível durante o posicionamento de uma construção. Sem seleção, os painéis ficam ocultos. Clicar em
outra fazenda abre apenas seu botão **Remover**, sem trocar a tarefa anterior.
O limite de quatro trabalhadores continua sendo validado pelo servidor.

Cada ciclo tem três fases, seguidas pela entrega:

1. **Plantio:** 8 segundos de trabalho de um aldeão. Sem trabalhador, não começa.
2. **Crescimento:** plantas crescem enquanto houver um aldeão trabalhando na fazenda.
3. **Colheita:** 6 segundos de trabalho antes de gerar a carga de comida.
4. **Entrega:** o aldeão leva a carga ao celeiro e volta para plantar novamente.

Mais trabalhadores dividem o plantio e a colheita e aceleram os cuidados durante o
crescimento. Sem aldeões na fazenda, o ciclo fica pausado e retoma quando alguém
volta a trabalhar nela. Pesquisas e eficiência dos aldeões continuam valendo. O ciclo para
quando o servidor está desligado ou o jogo está pausado. Os tempos são de jogo e
acompanham ×2, ×4 e ×10.

Cada construção de fazenda e cada novo ciclo consomem uma semente do cultivo
escolhido. Sementes de cenoura, trigo, batata e árvore podem ser compradas na aba
**Sementes** do centro urbano. Para replantar árvores, selecione **Plantar árvores**
no painel de construção e clique nos espaços livres; cada muda cresce em 10 minutos
de jogo, com todas as mudas avançando ao mesmo tempo.

| Cultivo | Crescimento base | Comida por trabalhador no nível 1 |
| --- | --- | --- |
| Cenoura | 30 segundos | 6 |
| Trigo | 45 segundos | 10 |
| Batata | 36 segundos | 8 |

Os tempos de caminhada são adicionais. A comida só aparece no estoque quando
chega ao celeiro. O aldeão mostra **Plantando**, **Aguardando crescimento** ou
**Colhendo**, sem acrescentar informações ao painel simples de remover a fazenda.

O nível da fazenda multiplica a colheita. Melhorar para nível 2 custa 35 madeira
e 20 comida; nível 3 custa 60 madeira, 25 pedra e 40 comida.

O painel da fazenda mostra apenas a ação **Remover**. A produção continua sendo
calculada pelo servidor; o indicador `+…/s` no recurso Comida mostra a média das
entregas que chegaram ao estoque nos últimos 30 segundos de jogo.

Depois de posicionar uma construção com sucesso, a ferramenta é encerrada e o
mouse volta ao modo normal. O aldeão escolhido caminha até o local e constrói
até a barra completar. Fazendas levam 20 segundos de trabalho, casas 30,
celeiros 45 e poços **2 minutos**, além da caminhada. Se mudar a tarefa do
aldeão, a obra pausa; selecione outro aldeão e clique na obra para retomá-la.
O custo é pago no início, mas a construção só produz, armazena ou abre vagas
quando estiver pronta. O explorador não constrói. Se o local for inválido,
a prévia continua para escolher outro ponto. O painel **Construir** aparece ao selecionar uma unidade no mapa.
Os cards fixos de lista de unidades e de seleção vazia foram removidos.

## Destruir fazendas e realocar o centro urbano

A fazenda tem apenas a opção **Remover**. Confirme para removê-la permanentemente,
sem reembolso e sem gerar uma construção reutilizável. O espaço fica livre e a
equipe é liberada. Cargas já colhidas são preservadas e entregues. Construir outra
fazenda custa normalmente 15 madeira e começa no nível 1.

**Realocar centro urbano** está disponível somente no centro, pelo seu menu ou
painel. Escolha o novo espaço livre de 4×4. O centro permanece no lugar atual
até confirmar um destino válido com um clique. **Esc** cancela sem mudar nada.
Pesquisas, recrutamento, aldeões e recursos são mantidos; a mudança não tem custo.
Não é permitido sobrepor fazendas, celeiros, unidades, recursos naturais ou água.

## Celeiros com estoques independentes

Cada recurso tem uma capacidade própria. **Comida cheia não bloqueia pedra,
madeira, ferro ou ouro**. Os números abaixo são limites de armazenamento, não
recursos concedidos ao jogador.

O Centro da Vila guarda até **100 madeira, 100 pedra e 100 ouro**. Os limites
dos celeiros prontos somam a essa reserva e habilitam as entregas de comida
e ferro.

| Nível | Comida | Madeira | Pedra | Ferro | Ouro |
| --- | --- | --- | --- | --- | --- |
| 1 | 500 | 500 | 300 | 300 | 300 |
| 2 | 1.000 | 1.000 | 600 | 600 | 600 |
| 3 | 2.000 | 2.000 | 1.200 | 1.200 | 1.200 |
| 4 | 3.500 | 3.500 | 2.200 | 2.200 | 2.200 |
| 5 | 5.500 | 5.500 | 3.500 | 3.500 | 3.500 |
| 6 | 9.000 | 9.000 | 6.000 | 6.000 | 6.000 |
| 7 | 15.000 | 15.000 | 10.000 | 10.000 | 10.000 |
| 8 | 25.000 | 25.000 | 17.000 | 17.000 | 17.000 |

Pode construir vários celeiros de 3×3: os limites se somam **separadamente para
cada recurso**. Dois celeiros de nível 1 guardam até 1.000 comida, 1.000 madeira,
600 pedra, 600 ferro e 600 ouro, todos ao mesmo tempo.
Cada celeiro evolui individualmente: melhorar um não altera os outros. O custo é pago
ao iniciar, e a capacidade nova só fica disponível ao terminar a barra de melhoria.
Os níveis 6–8 exigem que o Centro Urbano alcance o mesmo nível do celeiro.

| Ação | Custo |
| --- | --- |
| Construir celeiro | 60 madeira + 25 pedra |
| Evoluir para nível 2 | 80 madeira + 50 pedra + 15 ferro |
| Evoluir para nível 3 | 150 madeira + 100 pedra + 40 ferro |
| Evoluir para nível 4 | 300 madeira + 220 pedra + 90 ferro + 30 ouro |
| Evoluir para nível 5 | 500 madeira + 400 pedra + 160 ferro + 80 ouro |
| Evoluir para nível 6 | 2.500 madeira + 1.800 pedra + 750 ferro + 350 ouro + 2.000 comida |
| Evoluir para nível 7 | 5.500 madeira + 4.500 pedra + 1.800 ferro + 850 ouro + 5.000 comida |
| Evoluir para nível 8 | 11.000 madeira + 9.000 pedra + 4.000 ferro + 2.000 ouro + 12.000 comida |

O topo mostra o estoque atual e o limite de cada recurso. Clique no armazém ou
em um celeiro para ver todas as barras e a capacidade desse celeiro. Ao atingir
um limite, apenas as entregas daquele recurso aguardam: a unidade mantém a carga.
Outros recursos seguem sendo coletados e armazenados normalmente.

### Destruir celeiro

O painel do celeiro tem **Destruir celeiro**, com confirmação. O estoque guardado
não é perdido, mesmo que fique acima da capacidade restante. As próximas entregas
daquele recurso aguardam espaço. Se o último celeiro for destruído, o Centro
ainda recebe madeira, pedra e ouro até seus limites. Recursos já guardados
continuam disponíveis para pagar construções.

## Mercado do centro urbano

Abra o centro urbano e selecione **Mercado**. Ajuste o slider para escolher lotes
de 10 recursos. Você pode comprar ou vender; comprar custa o dobro do valor recebido
na venda:

| Recurso | Lote base | Ouro recebido |
| --- | --- | --- |
| Comida | 10 | 1 |
| Madeira | 10 | 2 |
| Pedra | 10 | 3 |
| Ferro | 10 | 5 |

O ouro minerado é também a moeda do mercado: compras e sementes gastam o ouro
guardado, e vendas de recursos, produtos de oficinas e animais acrescentam ouro
ao mesmo estoque. A caravana compra até 1.000 de ouro em mercadorias por ciclo
financeiro de 30 minutos. O limite de armazenamento de ouro também vale para
vendas.
Se não houver estoque ou orçamento, a transação é recusada por inteiro.

## Centro da vila

Clique na cabana para abrir as abas de pesquisas, o Mercado e o catálogo de animais.
Cada pesquisa tem três níveis. O custo é pago ao iniciar; o bônus entra em vigor
quando termina a barra: **nível 1 em 1 minuto, nível 2 em 3 minutos e nível 3
em 5 minutos de jogo**. Pausar congela o tempo, e o progresso sobrevive ao salvamento.
As melhorias do centro urbano e das casas seguem 3 e 5 minutos para os níveis 2 e 3.

Inspiradas nas linhas econômicas de Age of Empires II, a aba **Moinho** oferece
Colar de cavalo, Arado pesado e Rotação de culturas. Aqui elas aumentam a comida
por colheita em 15/30/45% e a velocidade de crescimento em 10/20/30%.
A aba **Aldeões** oferece Cestos de coleta, Carrinho de mão e Carroça de mão,
com mais velocidade, carga por viagem e comida colhida. Esses efeitos foram
adaptados ao ciclo de fazenda de RookLand, que não esgota a terra como em AoE II.
Referência: [guia oficial de economia do AoE II](https://www.ageofempires.com/learn-to-play/military-and-economy-aoe2/).

| Aba | Bônus por nível |
| --- | --- |
| Aldeões | +15% de velocidade, +2 itens por coleta natural e +10% de colheita dos aldeões |
| Moinho | +15% de comida por colheita e +10% de crescimento |
| Adubo | +20% de comida por colheita e +15% de crescimento |
| Água | +20% de crescimento |

Os custos do próximo nível aparecem no menu. As pesquisas usam combinações de
comida, madeira, pedra e ferro; o servidor bloqueia compras sem saldo suficiente.

Na aba **Aldeões**, **Recrutar** cria de 1 a 10 aldeões por **30 comidas cada**, desde que existam
saídas livres ao redor do centro e vagas na capacidade de população.

## Casas e população

A vila começa com capacidade 5, para até quatro aldeões e o explorador.
Casas ocupam **2×2 quadrados** e custam 35 madeira e 10 pedra. Cada casa tem
capacidade individual: **nível 1 +2 pessoas, nível 2 +6, nível 3 +15**.
Melhorar uma casa custa 70 madeira e 30 pedra para nível 2; 140 madeira, 80 pedra
e 25 ferro para nível 3. Destruir uma casa não remove moradores existentes, mas
impede novos recrutamentos enquanto a população estiver acima do limite.

## Poços

O poço ocupa **2×2 quadrados**, custa 40 madeira e 30 pedra, e precisa ser
construído perto de uma fazenda. Seu alcance é de oito quadrados a partir da
borda, equivalente a duas fazendas de 4×4 para cada lado. Fazendas alcançadas
crescem **2× mais rápido** na fase de crescimento. Vários poços não acumulam
o bônus. O painel do poço mostra quantas fazendas ele alcança e permite destruí-lo.

## Sprites

O atlas transparente em `web/public/spritesheets/village/village-atlas.png`
usa os três visuais do centro urbano, os três do celeiro, o poço, o fazendeiro
e o explorador. Porco, vaca e ovelha aparecem nos currais; a galinha permanece
apenas no atlas.
Os personagens usam os quadros laterais da folha enquanto andam; sua imagem
fica centrada sobre a sombra da unidade.

## Alimentação

Na política padrão, cada aldeão recebe **50 comidas por hora de jogo** e cada
soldado ou arqueiro recebe **100 comidas por hora**. A ração é cobrada a cada
minuto de jogo, em parcelas inteiras que somam exatamente esses valores ao fim
de uma hora; a aba Economia permite ajustá-la. O soldo em ouro continua cobrado
a cada 60 minutos de jogo. O
explorador não entra nessa conta. Separadamente, cada animal vivo no curral
consome **2 comidas a cada 10 minutos**, e cada casa pronta consome 10, 50 ou
250 comidas nesse intervalo, conforme o nível. O centro urbano mostra a
manutenção de casas e animais; a aba Economia mostra a ração horária das unidades.

Se a comida não cobrir a refeição, o estoque para em zero e os aldeões ficam com
**50% de velocidade de caminhada, coleta e contribuição ao crescimento**. Não
morrem nem perdem a tarefa. Uma próxima refeição paga integralmente restaura a
eficiência. Isso permite recuperar a produção depois de uma falta de comida.

Pausa interrompe produção e alimentação. As velocidades ×2, ×4 e ×10 aceleram
ambas. Em ×10, a manutenção de 10 minutos de jogo ocorre aproximadamente a cada
minuto real, e a ração é cobrada aproximadamente a cada seis segundos reais. O
tempo para quando o backend está desligado.

## Curral e produção em lotes

O curral ocupa 2×2 quadrados. A capacidade por nível é **2, 4, 6, 8 e 10
animais**. Cada curral pode ser melhorado individualmente até o nível 5, com
custo e tempo de melhoria crescentes.
Comprar animais consome comida uma vez por animal. Após o crescimento, o ícone
acima do curral indica quantos estão adultos. Selecione um aldeão e clique no
curral para ele coletar os animais maduros. Porcos entregam comida; vacas,
comida e leite; ovelhas, comida e lã. Leite e lã têm limites independentes em
cada celeiro, e a tecelagem consome lã para produzir panos.

O centro urbano recruta aldeões em lotes. Ferraria e tecelagem produzem lotes de
itens, e o quartel transforma aldeões livres em soldados ou arqueiros. Os custos
do lote inteiro são pagos ao iniciar, e cada unidade ou produto fica pronto ao
fim do seu próprio tempo. Desmobilizar devolve o trabalhador e guarda o kit.
As fazendas pagam a semente quando são colocadas e continuam replantando após
cada colheita, mesmo que o estoque de sementes chegue a zero.

Em vilas novas, a ilha mede 80 × 160 terrenos e se estende bem mais ao sul.
As árvores começam concentradas na floresta do oeste e em bosques menores;
há novas árvores, pedras, ferro, ouro e arbustos no sul. Jazidas e arbustos
esgotados recuperam sua carga na mesma posição após cinco minutos de jogo.
O terreno desses recursos fica reservado durante a recuperação.
Árvores derrubadas somem e podem ser repostas pelo plantio de mudas. Construir
perto de um recurso não muda sua posição.

No sul há um acampamento rival. Seus aldeões coletam e entregam recursos ao
acampamento; a facção usa esse estoque para evoluir até o nível 3, erguer postos
avançados e recrutar soldados e arqueiros. Os guardas permanecem na região e
só revidam depois que uma unidade rival é atingida; soldados próximos ao alvo
atacado também entram na defesa. Selecione uma unidade sua
e clique em um rival para ordenar o ataque. Vilas antigas mantêm a posição da
cidade ao receber a expansão e a facção rival.

## Recursos e controles

Selecione uma unidade e clique em árvores, pedras grandes, ferro ou ouro para coletar.
O mapa mantém apenas pedras grandes e não gera galhos ou pedrinhas pequenas. Arraste o mapa
com o botão esquerdo ou central para mover a câmera. **WASD** também move; a roda aproxima;
**G** alterna a grade; **Esc** cancela ou desmarca. Dar uma nova ordem a uma unidade carregada
inicia a tarefa imediatamente e preserva a carga para entrega posterior.

## Progresso e migração

O servidor controla construções, destruição, realocação do centro e espaço livre
por recurso. Estoques e progresso existentes são preservados. O formato atual é
v4 e o backup anterior fica em `server/data/world.json.pre-cycle-v4.bak`.

Se um save da versão anterior tiver fazendas já desmontadas aguardando realocação,
o investimento dessas fazendas é devolvido uma única vez na migração. Elas não
ficam como construções reutilizáveis. Isso não devolve recursos de fazendas
**destruídas na versão atual**, que seguem a regra de destruição definitiva.

`npm run build` verifica e compila. `npm test` cobre limites independentes,
coleta com comida cheia, upgrades, destruição, realocação do centro, economia,
migração e persistência. O mundo continua compartilhado entre as abas.

Na migração para v4, pedrinhas e galhos são retirados do mapa existente. Ordens
apontando para esses objetos são canceladas, mas cargas já coletadas permanecem
com as unidades. Fazendas já crescendo mantêm seu progresso; as maduras entram
na fase de colheita. Plantio, crescimento e colheita são salvos entre reinícios.
