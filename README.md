# RookLand

Baseada no [Lofi Valley Engine](https://github.com/Leoocast/lofi-valley-engine), com servidor de jogo Node.js e interface web separados.

- `server/`: simulação, API e salvamentos.
- `web/`: página React e recursos visuais.
- `shared/`: motor, dados e protocolo utilizados pelos dois lados.

## Rodar no Windows ou Linux

Requer Node.js 24.10+ e npm.

```bash
npm ci
npm run build
npm start
```

Abra **http://127.0.0.1:8080**. No Windows também pode executar **iniciar.bat**.
O backend usa a porta 3001. XAMPP é opcional.

O modo **RookLand** em `/crops_farm` começa com centro urbano, explorador, aldeão
e fazenda de 2×2 para até quatro trabalhadores. Construa um celeiro para habilitar
os estoques. O centro e os celeiros avançam até o nível 8.
Fazendas e celeiros podem ser destruídos; somente o centro urbano pode ser realocado.
A agricultura tem plantio, crescimento e colheita; o Mercado permite vender recursos por ouro.
Consulte o [guia da vila](docs/VILA.md) e o [guia completo do jogo](docs/GUIA_COMPLETO_DO_JOGO.md)
para estruturas, níveis, produção, animais, itens e estado do PvP.

O jogo roda no backend e continua com o navegador fechado. O navegador desenha o mapa e envia ações. Mundo e inventário são compartilhados; ainda não existem contas individuais.

Leia o [guia em português](docs/SERVIDOR.md) para configuração, desenvolvimento, XAMPP, backups e VPS Linux com Nginx/systemd. Os exemplos de implantação estão em `deploy/`.

## Desenvolvimento e testes

```bash
npm run dev
npm run check
npm test
```

Os saves ficam em `server/data/` (ignorados pelo Git). Faça backup dessa pasta.

O projeto original é uma prévia. Seu [README original](README.upstream.md) e a [licença MIT](LICENSE) foram preservados.
