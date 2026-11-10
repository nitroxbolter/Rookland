# RookLand: servidor e navegador

## Estrutura

```text
server/src/       Backend HTTP e simulação autoritativa (Node.js)
server/data/      Mundo e fazendas salvos, fora do Git
server/test/      Teste de integração com processos reais
web/src/         Interface React, entrada do jogador e renderização
web/public/      Sprites, imagens e sons originais
web/dist/        Página compilada para Apache/Nginx ou servidor web incluído
shared/src/      Motor original, regras, tipos e dados utilizados pelos dois lados
shared/protocol.ts Contrato de comandos e snapshots
scripts/         Compilação e execução portáveis
deploy/          Exemplos de Apache, Nginx e systemd
src-tauri/       Arquivos desktop originais; não usados no modo servidor web
```

O navegador **não inicia GameLoop**. Ele manda comandos ao backend por HTTP e recebe
snapshots por Server-Sent Events (`/api/events`). O backend valida posições,
ferramentas, sementes disponíveis, slots e velocidades, e executa as regras do motor.
Relógio, crescimento, rega, colheita e inventário são controlados pelo servidor.
A seleção de ferramenta, hotbars, câmera, janelas e animações visuais ficam no cliente.

O modo RookLand agora abre em `/crops_farm`, com cabana, explorador, aldeão,
plantações, coleta e celeiros. O [guia da vila](VILA.md) descreve essa jogabilidade.
O laboratório original de cultivos foi preservado em `/crops_laboratory`.

O laboratório continua sendo um editor de layouts, com rascunhos na memória da aba.
Salvar, carregar, listar e excluir fazendas usa a API e arquivos no servidor.
Um layout salvo no laboratório não substitui automaticamente o mundo de cultivos.
Entrar no editor não pausa o mundo dos demais clientes.

## Windows: começar

Node.js **24.10 ou superior** e npm. Node 24.14 já estava instalado nesta máquina
durante a preparação. Não precisa Rust, Visual C++, PHP ou MySQL para jogar na web.

Na pasta do projeto:

```powershell
npm ci
npm run build
npm start
```

Acesse **http://127.0.0.1:8080**; fazenda: **http://127.0.0.1:8080/crops_farm**.
Também pode abrir `iniciar.bat`, que instala as dependências se necessário,
compila e inicia os dois processos. A janela deve permanecer aberta.
Encerre com **Ctrl+C**. Não execute duas instâncias nas mesmas portas/pasta de dados.

Portas padrão:

| Processo | Endereço |
| --- | --- |
| Página web | `127.0.0.1:8080` |
| Backend | `127.0.0.1:3001` |
| Diagnóstico pela página | `http://127.0.0.1:8080/api/health` |

Para desenvolver com atualização automática da interface:

```powershell
npm run dev
```

O backend é compilado ao iniciar `dev`. Após editar backend ou motor, reinicie
`npm run dev`. Alterações visuais da interface usam HMR do Vite.

Para executar em terminais separados:

```powershell
# Terminal 1
npm run start:server
# Terminal 2
npm run start:web
```

Para alterar portas, copie `.env.example` para `.env` e ajuste os valores.
`WEB_PORT`, `WEB_HOST`, `SERVER_PORT`, `SERVER_HOST`, `API_TARGET` e `DATA_DIR`
são configuráveis. `API_TARGET` é o destino interno do proxy, sem `/api` no final.
O padrão escuta apenas na própria máquina.

## XAMPP opcional

O projeto já inclui o servidor da página e funciona sem XAMPP. Se quiser usar Apache:

1. Compile com `npm run build`.
2. Inicie apenas o backend com `npm run start:server`.
3. Ajuste e inclua `deploy/apache-xampp.conf.example` no Apache e habilite os módulos
   indicados no arquivo. Reinicie o Apache.
4. Aponte `127.0.0.1 rookland.local` no arquivo hosts do Windows.
5. Abra `http://rookland.local`.

O exemplo é um VirtualHost local. Apenas copiar os arquivos para `htdocs` não conecta
a simulação: `/api/` precisa ser encaminhado ao Node.js. Nenhuma configuração do
XAMPP instalado na máquina foi modificada nesta entrega.

## Mundo da vila no MariaDB do XAMPP

No XAMPP, deixe **MySQL** iniciado. O backend Node usa esse serviço diretamente.
O Apache pode continuar como servidor de páginas se estiver configurado como proxy.

Para configurar outra instalação, aplique
[`server/schema/world-mariadb.sql`](../server/schema/world-mariadb.sql) com uma
conta administrativa. Crie um usuário local do aplicativo com permissões
`SELECT`, `INSERT` e `UPDATE` somente em `rookland.world_saves`. Preencha no
`.env` as opções de banco indicadas em [`.env.example`](../.env.example) e
use `WORLD_STORAGE=mysql`. O arquivo `.env` fica fora do Git.

Na primeira inicialização, se a tabela ainda não tiver o mundo `local`, o
servidor importa o `world.json` existente após validar e restaurar o conteúdo.
Também é possível importar com o jogo parado, após compilar o backend:

```powershell
node --env-file-if-exists=.env server/dist/index.mjs --import-world
```

Com o banco ativo, os próximos salvamentos do mundo vão para a tabela. O
`world.json` permanece como cópia da migração. O campo `owner_account_id` fica
vazio para o mundo atual e permite associar mundos a contas futuramente. O
editor de layouts continua usando `server/data/farms.json`.

O backend reserva uma trava no banco para impedir duas instâncias de gravar
o mundo local ao mesmo tempo. Se a gravação falhar, o jogo interrompe a simulação
e a API informa a falha. Se o XAMPP perdeu a conexão, inicie o serviço MySQL
novamente e reinicie o RookLand para restabelecer a sessão. Para backup do
progresso atual no modo MariaDB, exporte a tabela `world_saves`.

## Dados e backup no modo JSON

Sem `WORLD_STORAGE=mysql`, `server/data/world.json` guarda o mundo.
O salvamento ocorre a cada **5 segundos** nos dois modos.
`server/data/farms.json` guarda os layouts ao clicar em Salvar no laboratório.
As gravações usam arquivo temporário e renomeação. O backend também tenta salvar
ao receber SIGINT/SIGTERM. No Windows, encerramento forçado pode perder os últimos
5 segundos; no Linux, o systemd envia SIGTERM para encerramento normal.

O mundo continua enquanto o processo do backend estiver ligado, mesmo sem abas.
Quando o processo é desligado, o tempo de jogo para; não há avanço retroativo
durante o período desligado. A pausa explícita também persiste no salvamento.

Faça backup da pasta de dados. Arquivos inválidos causam falha na inicialização
com uma mensagem, preservando o conteúdo em vez de sobrescrevê-lo com um mundo novo.
Execute apenas **uma instância do backend por pasta de dados**. O armazenamento
JSON é adequado ao protótipo e não foi projetado para múltiplos processos escrevendo.

## VPS Linux

Os mesmos fontes e comandos funcionam em Windows e Linux. O processo Node mantém
o jogo; Nginx entrega `web/dist` e encaminha `/api/`. Não use o servidor Vite de
desenvolvimento para publicar o jogo.

Pré-requisitos: Node.js 24.10+ com npm, Nginx e permissão administrativa.
O exemplo abaixo considera os arquivos em `/opt/rookland`, Node em `/usr/bin/node`
(`command -v node` para conferir) e uma conta de serviço `rookland`.

```bash
cd /opt/rookland
npm ci
npm run build
npm test

sudo useradd --system --user-group --no-create-home --shell /usr/sbin/nologin rookland
sudo install -d -o rookland -g rookland /var/lib/rookland
sudo cp deploy/rookland.service /etc/systemd/system/rookland.service
sudo systemctl daemon-reload
sudo systemctl enable --now rookland
sudo systemctl status rookland
```

O usuário de serviço precisa ler `/opt/rookland`, suas dependências e o bundle.
O usuário do Nginx precisa ler `web/dist`. Ajuste caminhos e permissões conforme
a instalação. Se houver `.env`, use `DATA_DIR=/var/lib/rookland` na VPS.

Para levar seus testes do Windows à VPS, com os backends parados copie os arquivos
de `server/data/` para `/var/lib/rookland/` e ajuste o proprietário para `rookland`.

Configure Nginx a partir de `deploy/nginx.conf.example`, alterando domínio e raiz.
O exemplo usa senha de acesso para o teste privado; crie o arquivo indicado com
`htpasswd -c /etc/nginx/rookland.htpasswd seu_usuario` (utilitário apache2-utils).
Ative o site conforme a distribuição, valide com `sudo nginx -t`, configure HTTPS
para o domínio e recarregue Nginx. O backend permanece em loopback na porta 3001.
O proxy precisa deixar buffering desligado para os eventos chegarem imediatamente.

Logs e reinício:

```bash
sudo journalctl -u rookland -f
sudo systemctl restart rookland
```

Na atualização do código, compile antes de reiniciar. Evite mudar o formato do
salvamento sem migrar os arquivos existentes.

## Limites atuais

Esta é uma base de testes derivada do protótipo original. Existe **um mundo e um
inventário compartilhados por todas as conexões**, sem contas ou permissões por
jogador. O explorador e o aldeão da vila também são compartilhados entre as abas.
Pausa e velocidade são globais.
Isso demonstra sincronização de estado, mas não implementa um MMO completo.
O exemplo Nginx mantém o acesso privado até adicionarmos autenticação e sessões.
O motor original e suas mecânicas ainda são de prévia; não foram reescritos.

## Verificação

```bash
npm run check
npm run build
npm test
```

O teste usa porta livre e pasta temporária, sem tocar nos saves reais. Verifica:
tempo e pausa, entradas inválidas, duas conexões SSE, arar, plantar, consumir
sementes, regar, crescer sem navegador, mover inventário, CRUD de fazendas,
restaurar mundo/inventário/terreno após reinício e preservar arquivos corrompidos.
A compilação e os testes foram executados no Windows; o exemplo Linux está preparado
para a implantação futura, sem uma VPS conectada nesta etapa.
