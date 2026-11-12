# Implementação da proposta de economia e sociedade

Fonte: [proposta de design](PROPOSTA_ECONOMIA_SOCIEDADE_EXERCITO.md). Este arquivo distingue os sistemas já jogáveis das etapas de expansão descritas na proposta.

## Jogável nesta etapa

- Tesouro em moedas para impostos, festivais e treinamento militar. Mercado e sementes usam diretamente o ouro minerado, que também serve para construções e oficinas.
- Fluxo de madeira, pedra, comida, ferro e ouro na última hora de simulação, com entradas, saídas e saldo líquido na aba Cidade do Centro Urbano.
- Folha financeira a cada 30 minutos de jogo: 2 moedas por aldeão civil a partir do Comércio e 4 por unidade militar. Impostos vinculados à comida produzida, com limite por população produtiva. Cinco políticas tributárias e intervalo mínimo entre mudanças.
- Satisfação e confiança graduais, com motivos visíveis. A satisfação altera a eficiência dos trabalhadores. Sem clientes conectados, esse sistema limita as quedas a 50 de satisfação e 45 de confiança e mantém até dois ciclos de atraso.
- Festival da colheita como gasto opcional de comida e moedas para elevar satisfação e confiança.
- Vendas de recursos, itens das oficinas e produtos animais acrescentam ouro ao estoque. A caravana tem orçamento de 1.000 de ouro por ciclo financeiro.
- O quartel reserva aldeões livres e os transforma em soldados ou arqueiros. Desmobilizar devolve o aldeão e o kit ao estoque.
- O Centro Urbano avança imediatamente ao entregar os materiais e cumprir os objetivos; processos de fabricação e outras obras conservam seu tempo de trabalho.

## Próximas etapas da proposta

As cadeias de serraria, pedreiro, fundição, padaria, curtume e boticário exigem novas estruturas, sprites, estoques e receitas com usos claros. Depois vêm equipamento por tipo de tropa, arsenal e reparos; saúde, curandeiro e doenças; contratos de caravana e preços variáveis; expedições. PvP entre jogadores requer primeiro contas, propriedade de cidade e inventários separados.

O balanceamento de salários, impostos, rendimento e capacidade de mercado usa valores iniciais da proposta. Deve ser ajustado com partidas curtas, longas e offline antes de ampliar a quantidade de recursos.

A checagem de tipos e os cenários dirigidos de migração, comércio, folha, treinamento e desmobilização passaram. A suíte histórica completa ainda contém cenários de versões anteriores do mapa, do celeiro inicial e das regras de consumo; ela precisa ser atualizada para as regras atuais antes de servir como critério geral de regressão.
