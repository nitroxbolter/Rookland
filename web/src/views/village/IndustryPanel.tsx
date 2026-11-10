import { useState } from "react"
import { Trash2 } from "lucide-react"
import type { Building, CraftItem, Resources, VillageState } from "../../../../shared/village/types"
import { ARCHER_COST, ARCHER_SECONDS, BUILDINGS, DEFENSE_UPGRADE_COSTS, IMPROVEMENT_SECONDS, RESOURCE_NAMES, SOLDIER_COST, SOLDIER_SECONDS, populationCapacity } from "../../../../shared/village/config"
import { sendCommand } from "@/services/gameClient"
import { BatchQuantity } from "./BatchQuantity"
import { WorkshopPanel } from "./WorkshopPanel"

const NAMES: Record<CraftItem, string> = {
  nails: "Pregos", cloth: "Panos", clothing: "Roupas",
  tools: "Ferramentas", weapons: "Armas", armor: "Armaduras",
}
const afford = (s: VillageState, cost: Partial<Resources>) =>
  Object.entries(cost).every(([resource, amount]) => s.resources[resource as keyof Resources] >= amount)

export function IndustryPanel({ village, building, selectedUnitId, onDestroyed }: { village: VillageState; building: Building; selectedUnitId?: string; onDestroyed: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [amount, setAmount] = useState(1)
  const production = building.production
  const elapsed = production ? Math.ceil(production.duration - production.progress) : 0
  const workshop = building.kind === "blacksmith" || building.kind === "weaving"
  const crafts = village.crafts ?? { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
  const defenseKind = (["wall", "gate", "tower"] as const).find((kind) => kind === building.kind)
  const defense = (building.kind === "tower" ? 30 : building.kind === "gate" ? 8 : 4) * building.level
  const defenseImprovement = defenseKind
    ? village.improvements?.find((item) => item.kind === "building" && item.buildingId === building.id)
    : undefined
  const defenseMaxLevel = building.kind === "tower" ? 4 : 3
  const defenseNextLevel = Math.min(defenseMaxLevel, building.level + 1) as 2 | 3 | 4
  const defenseCost = defenseKind && building.level < defenseMaxLevel
    ? DEFENSE_UPGRADE_COSTS[defenseKind][defenseNextLevel]
    : null
  return <div className="economy-panel industry-panel">
    {defenseKind ? (
      <>
        <p className="selection-description">Nível {building.level}/{defenseMaxLevel} · Defesa: {defense}. {building.kind === "tower" ? `Guarnição: ${building.level} arqueiro(s) · dano ${9 + building.level * 4 + (village.weaponLevel ?? 0) * 3} por arqueiro/s.` : building.kind === "gate" ? "Unidades aliadas atravessam este portão." : "Bloqueia a passagem de unidades pelo terreno."}</p>
        {defenseCost && !defenseImprovement && !building.construction && <button className="upgrade-action" disabled={!afford(village, defenseCost)} onClick={() => void sendCommand({ type: "upgradeDefense", buildingId: building.id })}>
          Melhorar para nível {defenseNextLevel} · defesa {(building.kind === "tower" ? 30 : building.kind === "gate" ? 8 : 4) * defenseNextLevel} · {IMPROVEMENT_SECONDS[defenseNextLevel] / 60} min
          <small className={!afford(village, defenseCost) ? "is-missing" : ""}>{Object.entries(defenseCost).map(([name, count]) => `${count} ${RESOURCE_NAMES[name as keyof Resources].toLowerCase()}`).join(" · ")}</small>
        </button>}
        {building.level >= defenseMaxLevel && <p className="economy-caption">Nível máximo alcançado.</p>}
        {building.kind === "tower" && !building.construction && <TowerGarrison village={village} tower={building} selectedUnitId={selectedUnitId} />}
      </>
    ) : building.kind === "barracks" ? (
      <>
        <p className="selection-description">Treine soldados de infantaria ou arqueiros. Cada unidade militar ocupa uma vaga e consome 5 comidas a cada 10 minutos.</p>
        <p>População: {village.units.length}/{populationCapacity(village)} · Armas: {crafts.weapons} · Roupas: {crafts.clothing}</p>
        <BatchQuantity value={amount} onChange={setAmount} max={10} />
        <button className={`primary-action${!afford(village, { food: SOLDIER_COST.food * amount, gold: SOLDIER_COST.gold * amount }) || crafts.weapons < amount || crafts.clothing < amount ? " is-missing" : ""}`} disabled={!!building.construction || !!production || village.units.length + amount > populationCapacity(village) || crafts.weapons < amount || crafts.clothing < amount || !afford(village, { food: SOLDIER_COST.food * amount, gold: SOLDIER_COST.gold * amount })} onClick={() => void sendCommand({ type: "trainSoldier", buildingId: building.id, amount })}>
          Treinar {amount} · {SOLDIER_SECONDS * amount}s · {SOLDIER_COST.food * amount} comida, {SOLDIER_COST.gold * amount} ouro, {amount} armas, {amount} roupas
        </button>
        <button className={`primary-action${!afford(village, { food: ARCHER_COST.food * amount, gold: ARCHER_COST.gold * amount }) || crafts.weapons < amount || crafts.clothing < amount ? " is-missing" : ""}`} disabled={!!building.construction || !!production || village.units.length + amount > populationCapacity(village) || crafts.weapons < amount || crafts.clothing < amount || !afford(village, { food: ARCHER_COST.food * amount, gold: ARCHER_COST.gold * amount })} onClick={() => void sendCommand({ type: "trainArcher", buildingId: building.id, amount })}>
          Treinar {amount} arqueiro{amount > 1 ? "s" : ""} · {ARCHER_SECONDS * amount}s · {ARCHER_COST.food * amount} comida, {ARCHER_COST.gold * amount} ouro, {amount} armas, {amount} roupas
        </button>
      </>
    ) : <WorkshopPanel village={village} building={building} />}
    {production && <div className="improvement-progress" role="status"><div><strong>{production.item === "soldier" || production.item === "archer" ? `Treinando ${production.item === "archer" ? "arqueiro" : "soldado"}` : `Produzindo ${NAMES[production.item]}`} · {(production.total ?? 1) - (production.remaining ?? 1)}/{production.total ?? 1}</strong><span>{elapsed}s até o próximo</span></div><div className="improvement-track"><i style={{ width: `${Math.min(100, production.progress / production.duration * 100)}%` }} /></div></div>}
    {!workshop && building.construction && <p>Disponível quando a construção terminar.</p>}
    {confirm ? <div className="relocate-buttons"><button onClick={() => setConfirm(false)}>Cancelar</button><button className="confirm-demolish" onClick={async () => { if (await sendCommand({ type: "demolishBuilding", buildingId: building.id })) onDestroyed() }}>Destruir {BUILDINGS[building.kind].name.toLowerCase()}</button></div> : <button className={workshop ? "workshop-demolish" : "demolish-action"} aria-label="Destruir estrutura" title="Destruir estrutura" onClick={() => setConfirm(true)}>{workshop ? <Trash2 size={17} aria-hidden="true" /> : "Destruir estrutura"}</button>}
  </div>
}

function TowerGarrison({ village, tower, selectedUnitId }: { village: VillageState; tower: Building; selectedUnitId?: string }) {
  const archers = village.units.filter((unit) => unit.kind === "archer" && unit.job.kind === "garrison" && unit.job.targetId === tower.id)
  const available = village.units.filter((unit) => unit.kind === "archer" && unit.job.kind !== "garrison")
  available.sort((a, b) => Number(b.id === selectedUnitId) - Number(a.id === selectedUnitId))
  return <div className="tower-garrison">
    <strong>Arqueiros na torre · {archers.length}/{Math.min(4, tower.level)}</strong>
    {archers.length < Math.min(4, tower.level) && available.map((archer) => <button className="primary-action" key={archer.id} onClick={() => void sendCommand({ type: "garrisonArcher", unitId: archer.id, towerId: tower.id })}><span>{archer.name}</span><small>Colocar na torre</small></button>)}
    {archers.map((archer) => <button key={archer.id} onClick={() => void sendCommand({ type: "ungarrisonArcher", unitId: archer.id })}><span>{archer.name}</span><small>Retirar da torre</small></button>)}
    {!available.length && !archers.length && <small>Treine arqueiros no quartel para defender a torre.</small>}
  </div>
}
