# Assets da vila

`cabin.svg`, `barn.svg`, `hero.svg`, `villager.svg` e `branches.svg` foram criados para esta
implementação como vetores com grade de pixels e `shape-rendering="crispEdges"`.
Seguem a licença MIT do projeto. Não têm dependência de serviços externos.

Terreno, água, árvores, pedras, troncos e plantas reutilizam os sprites já
presentes no Lofi Valley Engine. Os créditos e a licença originais foram preservados.

## Estruturas por nível

Centro Urbano e Celeiro têm sprites individuais dos níveis 1 a 8. A progressão
visual é palha, palha com madeira, madeira, madeira com pedra, pedra, pedra com
ferro, ferro reforçado e ferro com acabamentos nobres. Tecelagem segue a mesma
sequência até o nível 5, terminando em pedra com maquinário de ferro.
Serralheria tem três artes próprias: palha e madeira, madeira trabalhada e
pedra com maquinário de ferro. Cada nível acelera a produção de tábuas e
palanques de madeira.

Casa, Curral, Torre, Portão e Muro (horizontal e vertical) também têm um PNG
para cada nível alcançável. A Fazenda usa arte procedural: os canteiros ganham
borda de madeira no nível 2 e de pedra no nível 3.

Os novos sprites PNG foram criados para esta implementação com fundo
transparente. Os arquivos em `web/public/spritesheets/village/` são os usados
diretamente pelo jogo e pelo gerenciador de assets.

## Facção rival

`enemy/farmer`, `enemy/soldier` e `enemy/archer` contêm as mesmas sequências de
animação dos aldeões e militares do jogador. Somente os pixels azuis dos
uniformes, capas e escudos foram trocados por tons vermelhos; rosto, armadura,
madeira e detalhes dourados permanecem iguais. Para refazer as variantes,
execute `scripts/create-enemy-sprites.ps1` na raiz do projeto.
