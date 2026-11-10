import { useState } from "react"
import {
  ArrowUp,
  Check,
  Circle,
  Clock3,
  Egg,
  Feather,
  Flag,
  Sprout,
  Users,
  Warehouse,
  X,
  RotateCcw,
  Trash2,
  Coins,
  Home,
  PawPrint,
  Hammer,
  Shirt,
  ShieldCheck,
  Swords,
  Scissors,
  Spool,
  TreePine,
  Mountain,
  Wheat,
  Pickaxe,
  Droplets,
} from "lucide-react"
import type {
  Building,
  CraftItem,
  Improvement,
  Resources,
  SeedKind,
  VillageState,
} from "../../../../shared/village/types"
import {
  HOUSE_CAPACITIES,
  HOUSE_UPKEEP_PER_LEVEL,
  HOUSE_UPGRADE_COSTS,
  TOWN_UPGRADE_COSTS,
  WELL_RADIUS_TILES,
  wellAffectsFarm,
  populationCapacity,
  IMPROVEMENT_SECONDS,
  MARKET_RATES,
  MARKET_BUY_RATES,
  MARKET_PRODUCT_RATES,
  MARKET_CYCLE_BUDGET,
  SEED_PRICES,
  SEED_BUNDLE_SIZE,
  BARN_UPGRADE_COSTS,
  RECRUIT_COST,
  RECRUIT_SECONDS,
  RESEARCH,
  RESOURCE_NAMES,
  storageCapacities,
  UPKEEP_INTERVAL,
  upkeepCost,
  productStorageCapacities,
  UPKEEP_PER_ANIMAL,
  UPKEEP_PER_SOLDIER,
  UPKEEP_PER_VILLAGER,
  FINANCE_INTERVAL,
  TAX_RATES,
  CIVILIAN_WAGE,
  MILITARY_WAGE,
} from "../../../../shared/village/config"
import { sendCommand } from "@/services/gameClient"
import { commerceGoals, ERA_NAMES, townLevel, unlockReason, villageEra } from "../../../../shared/village/progression"
import { recruitmentCheck } from "../../../../shared/village/simulation"
import { AtlasSprite, animalSprites } from "./sprites"
import { BatchQuantity } from "./BatchQuantity"

const afford = (s: VillageState, cost: Partial<Resources>) =>
  Object.entries(cost).every(([k, n]) => s.resources[k as keyof Resources] >= n)

const CRAFT_NAMES: Record<CraftItem, string> = {
  nails: "Pregos",
  cloth: "Panos",
  clothing: "Roupas",
  tools: "Ferramentas",
  weapons: "Armas",
  armor: "Armaduras",
}
const CRAFT_ICONS: Record<CraftItem, typeof Hammer> = {
  nails: Hammer,
  cloth: Spool,
  clothing: Shirt,
  tools: Scissors,
  weapons: Swords,
  armor: ShieldCheck,
}
const RESOURCE_ICONS: Record<keyof Resources, typeof Hammer> = {
  wood: TreePine,
  stone: Mountain,
  food: Wheat,
  iron: Pickaxe,
  gold: Coins,
}
function ImprovementProgress({
  item,
  elapsed,
  label,
}: {
  item: Improvement
  elapsed: number
  label: string
}) {
  const duration = item.finishAt - item.startedAt
  const remaining = Math.max(0, Math.ceil(item.finishAt - elapsed))
  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, "0")
  const percent = Math.min(100, Math.max(0, ((elapsed - item.startedAt) / duration) * 100))
  return (
    <div className="improvement-progress" role="status">
      <div><strong>{label}</strong><span>{minutes}:{seconds} restantes</span></div>
      <div
        className="improvement-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(percent)}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
export function Costs({ cost, available }: { cost: Partial<Resources>; available?: Resources }) {
  return (
    <span className="economy-costs">
      {Object.entries(cost).map(([k, n]) => (
        <span key={k} className={available && available[k as keyof Resources] < n ? "is-missing" : ""}>
          {n} {RESOURCE_NAMES[k as keyof Resources].toLowerCase()}
        </span>
      ))}
    </span>
  )
}

export function FarmManagement({
  village,
  farm,
  onDestroyed,
}: {
  village: VillageState
  farm: Building
  onDestroyed: () => void
}) {
  const [assigning, setAssigning] = useState(false)
  const workers = village.units.filter((unit) => unit.job.kind === "farm" && unit.job.targetId === farm.id)
  const idle = village.units.filter((unit) => unit.kind === "villager" && unit.job.kind === "idle" && !unit.carrying)
    .sort((a, b) => Math.abs(a.x - farm.x) + Math.abs(a.y - farm.y) - Math.abs(b.x - farm.x) - Math.abs(b.y - farm.y))[0]
  const phase = farm.construction ? "Em construção"
    : workers.length === 0 ? "Parada sem aldeão"
      : farm.farmCycle?.phase === "planting" ? "Plantando"
        : farm.farmCycle?.phase === "growing" ? "Crescendo" : "Colhendo"
  return <>
    <div className="farm-staffing">
      <span><Users size={15} aria-hidden="true" /> <strong>{workers.length}/4</strong> aldeões <small>{phase}</small></span>
      {!farm.construction && workers.length < 4 && <button type="button" disabled={!idle || assigning}
        onClick={async () => {
          if (!idle) return
          setAssigning(true)
          try { await sendCommand({ type: "assignUnit", unitId: idle.id, targetId: farm.id }) }
          finally { setAssigning(false) }
        }}>
        <Users size={14} aria-hidden="true" /> {assigning ? "Enviando…" : "Adicionar aldeão"}
      </button>}
    </div>
    {!farm.construction && workers.length < 4 && !idle &&
      <p className="economy-caption">Sem aldeão livre. Selecione um aldeão no mapa e toque nesta fazenda.</p>}
    <BuildingRemoval building={farm} onDestroyed={onDestroyed} />
  </>
}
function BuildingRemoval({
  building,
  onDestroyed,
}: {
  building: Building
  onDestroyed: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const barn = building.kind === "barn"
  const house = building.kind === "house"
  const well = building.kind === "well"
  async function remove() {
    if (busy) return
    setBusy(true)
    if (
      await sendCommand({
        type: barn ? "demolishBarn" : house ? "demolishHouse" : well ? "demolishWell" : "demolishFarm",
        buildingId: building.id,
      })
    )
      onDestroyed()
    else setBusy(false)
  }
  return (
    <div className="farm-remove-panel">
      {confirm ? (
        <>
          <p>
            {barn
              ? "Destruir este celeiro? Os recursos guardados serão preservados, mas novas entregas precisam de espaço em outro celeiro."
              : house
                ? "Destruir esta casa? Os moradores continuam na vila, mas a capacidade de população diminui."
                : well
                  ? "Destruir este poço? As fazendas próximas perderão o bônus de crescimento."
              : "Remover esta fazenda?"}
          </p>
          <div className="relocate-buttons">
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Cancelar
            </button>
            <button
              className="confirm-demolish"
              disabled={busy}
              onClick={() => {
                void remove()
              }}
            >
              {busy ? "Removendo…" : "Confirmar remoção"}
            </button>
          </div>
        </>
      ) : (
        <button className="relocate-action" onClick={() => setConfirm(true)}>
          <Trash2 size={14} />
          {barn ? "Destruir celeiro" : house ? "Destruir casa" : well ? "Destruir poço" : "Remover"}
        </button>
      )}
    </div>
  )
}

export function HouseManagement({ village, house, onDestroyed }: {
  village: VillageState
  house: Building
  onDestroyed: () => void
}) {
  const improvement = village.improvements?.find(
    (item) => item.kind === "building" && item.buildingId === house.id,
  )
  return (
    <div className="economy-panel">
      <p className="selection-description">
        Esta casa abriga {house.construction ? 0 : HOUSE_CAPACITIES[house.level as 1 | 2 | 3]} pessoas.
        População da vila: {village.units.length} / {populationCapacity(village)}.
      </p>
      {house.construction ? (
        <p className="economy-caption">As vagas ficam disponíveis quando o aldeão concluir a obra.</p>
      ) : improvement ? (
        null
      ) : house.level < 3 ? (
        <button className="upgrade-action"
          disabled={!!unlockReason(village, { kind: "house", level: house.level + 1 }) || !afford(village, HOUSE_UPGRADE_COSTS[(house.level + 1) as 2 | 3])}
          onClick={() => { void sendCommand({ type: "upgradeHouse", buildingId: house.id }) }}>
          <ArrowUp size={15} />
          Melhorar casa · {HOUSE_CAPACITIES[(house.level + 1) as 2 | 3]} vagas
          <small>{IMPROVEMENT_SECONDS[(house.level + 1) as 2 | 3] / 60} min</small>
          <Costs cost={HOUSE_UPGRADE_COSTS[(house.level + 1) as 2 | 3]} available={village.resources} />
          <small>{unlockReason(village, { kind: "house", level: house.level + 1 })}</small>
        </button>
      ) : <p className="economy-caption">Capacidade máxima desta casa: 15 pessoas.</p>}
      <BuildingRemoval building={house} onDestroyed={onDestroyed} />
    </div>
  )
}

export function WellManagement({ village, well, onDestroyed }: {
  village: VillageState
  well: Building
  onDestroyed: () => void
}) {
  const affected = well.construction ? [] : village.buildings.filter((b) => b.kind === "farm" && wellAffectsFarm(well, b))
  return (
    <div className="economy-panel">
      <p className="selection-description">
        Poços dobram o crescimento das fazendas a até {WELL_RADIUS_TILES} quadrados (duas fazendas) de distância. Bônus de vários poços não se acumula.
      </p>
      {well.construction && <p className="economy-caption">O bônus começa após 2 minutos de trabalho do aldeão.</p>}
      <p className="economy-caption">{affected.length} fazendas alcançadas por este poço.</p>
      <BuildingRemoval building={well} onDestroyed={onDestroyed} />
    </div>
  )
}

export function BarnManagement({
  village,
  barn,
  onDestroyed,
}: {
  village: VillageState
  barn: Building
  onDestroyed: () => void
}) {
  const improvement = village.improvements?.find(
    (item) => item.kind === "building" && item.buildingId === barn.id,
  )
  const barnNextLevel = barn.level + 1
  const barnUpgradeLocked = barnNextLevel >= 6 && townLevel(village) < barnNextLevel
  const crafts = village.crafts ?? { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
  return (
    <div className="economy-panel">
      <div className="resource-storage-list">
        {Object.keys(RESOURCE_NAMES).map((key) => {
          const r = key as keyof Resources
          const limit = storageCapacities(village)[r]
          const Icon = RESOURCE_ICONS[r]
          return (
            <div key={r} title={`${RESOURCE_NAMES[r]}: ${village.resources[r]} de ${limit}`}>
              <span className="storage-item-name"><Icon size={13} />{RESOURCE_NAMES[r]}</span>
              <strong>{village.resources[r]}<small>/{limit}</small></strong>
              <i aria-hidden="true">
                <b
                  style={{
                    width: `${Math.min(100, (village.resources[r] / Math.max(1, limit)) * 100)}%`,
                  }}
                />
              </i>
            </div>
          )
        })}
        {(["milk", "wool", "eggs", "feathers"] as const).map((kind) => {
          const limit = productStorageCapacities(village)[kind]
          const stock = village.animalProducts?.[kind] ?? 0
          const label = { milk: "Leite", wool: "Lã", eggs: "Ovos", feathers: "Penas" }[kind]
          const Icon = { milk: Droplets, wool: PawPrint, eggs: Egg, feathers: Feather }[kind]
          return <div key={kind} title={`${label}: ${stock} de ${limit}`}><span className="storage-item-name"><Icon size={13} />{label}</span><strong>{stock}<small>/{limit}</small></strong><i aria-hidden="true"><b style={{ width: `${Math.min(100, stock / Math.max(1, limit) * 100)}%` }} /></i></div>
        })}
        {(Object.keys(CRAFT_NAMES) as CraftItem[]).map((item) => {
          const Icon = CRAFT_ICONS[item]
          return <div className="crafted-stock" key={item} title={`${CRAFT_NAMES[item]}: ${crafts[item]}`}><span className="storage-item-name"><Icon size={13} />{CRAFT_NAMES[item]}</span><strong>{crafts[item]}</strong></div>
        })}
      </div>
      {barn.construction ? (
        <p className="economy-caption">O espaço de armazenamento fica disponível ao concluir a construção.</p>
      ) : improvement ? (
        null
      ) : barn.level < 8 ? (
        <button
          className="upgrade-action"
          disabled={!afford(village, BARN_UPGRADE_COSTS[barnNextLevel]) || barnUpgradeLocked}
          onClick={() => {
            void sendCommand({ type: "upgradeBarn", buildingId: barn.id })
          }}
        >
          <ArrowUp size={15} />
          Melhorar · N{barnNextLevel}
          <small className={barnUpgradeLocked ? "is-missing" : undefined}>{barnUpgradeLocked ? `Requer Centro Urbano N${barnNextLevel}` : `${IMPROVEMENT_SECONDS[barnNextLevel as 2 | 3 | 4 | 5 | 6 | 7 | 8] / 60} min`}</small>
          <Costs cost={BARN_UPGRADE_COSTS[barnNextLevel]} available={village.resources} />
        </button>
      ) : (
        <p className="economy-caption">
          Nível máximo
        </p>
      )}
      <BuildingRemoval building={barn} onDestroyed={onDestroyed} />
    </div>
  )
}

type TownTab = "era" | "workers" | "agriculture" | "market" | "seeds" | "animals" | "society"
const TABS: { id: TownTab; label: string; icon: typeof Users }[] = [
  { id: "era", label: "Era", icon: Flag },
  { id: "workers", label: "Aldeões", icon: Users },
  { id: "agriculture", label: "Moinho", icon: Wheat },
  { id: "market", label: "Mercado", icon: Coins },
  { id: "seeds", label: "Sementes", icon: Sprout },
  { id: "animals", label: "Animais", icon: PawPrint },
  { id: "society", label: "Cidade", icon: Users },
]

function TownCost({ cost, available }: { cost: Partial<Resources>; available?: Resources }) {
  return <span className="town-cost" aria-label="Custo">
    {(Object.entries(cost) as [keyof Resources, number][]).map(([resource, amount]) => {
      const Icon = RESOURCE_ICONS[resource]
      const label = `${amount} ${RESOURCE_NAMES[resource].toLowerCase()}`
      return <span key={resource} className={available ? available[resource] >= amount ? "is-covered" : "is-missing" : undefined}
        title={available ? `${label} necessários · você tem ${available[resource]}` : label} aria-label={label}>
        <Icon size={14} aria-hidden="true" />{amount}
      </span>
    })}
  </span>
}

export function TownCenterMenu({
  village,
  onClose,
  onRelocate,
}: {
  village: VillageState
  onClose: () => void
  onRelocate: () => void
}) {
  const [tab, setTab] = useState<TownTab>("era")
  const [recruitAmount, setRecruitAmount] = useState(1)
  const research = tab === "agriculture" ? "agriculture" : "workers"
  const spec = RESEARCH[research]
  const level = village.research[research]
  const improvement = village.improvements?.find(
    (item) => item.kind === "research" && item.research === research,
  )
  const villagers = village.units.filter((u) => u.kind === "villager")
  const civilians = village.units.filter((u) => u.kind !== "soldier" && u.kind !== "archer").length
  const soldiers = village.units.filter((u) => u.kind === "soldier" || u.kind === "archer").length
  const animals = village.buildings.reduce((total, building) => total + (building.ranch?.animals.length ?? 0), 0)
  const houseUpkeep = village.buildings
    .filter((building) => building.kind === "house" && !building.construction)
    .reduce((total, house) => total + HOUSE_UPKEEP_PER_LEVEL[house.level as 1 | 2 | 3], 0)
  const center = village.buildings.find((b) => b.kind === "townCenter")
  const hasBarn = village.buildings.some((b) => b.kind === "barn" && !b.construction)
  const era = villageEra(village)
  const goals = commerceGoals(village)
  const marketLocked = unlockReason(village, { kind: "market" })
  const recruitLocked = unlockReason(village, { kind: "recruit" })
  const recruitBlocked = tab === "workers" ? recruitmentCheck(village, recruitAmount).reason : null
  const recruitment = village.recruitment
  const researchLocked = unlockReason(village, { kind: "research", value: research, level: level + 1 })
  const centerImprovement = village.improvements?.find(
    (item) => item.kind === "building" && item.buildingId === center?.id,
  )
  const nextTownCost = center && center.level < 8
    ? TOWN_UPGRADE_COSTS[(center.level + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8]
    : null
  const missingGoals = goals.filter((goal) => !goal.done)
  const missingTownResources = nextTownCost
    ? (Object.entries(nextTownCost) as [keyof Resources, number][])
      .filter(([resource, amount]) => village.resources[resource] < amount)
    : []
  const missingGoalText = missingGoals.map((goal) => goal.label === "Casa pronta"
    ? "construa uma casa"
    : goal.label === "Celeiro pronto"
      ? "construa um celeiro"
      : goal.label.toLowerCase()).join(" · ")
  return (
    <div className="village-modal-backdrop" onClick={onClose}>
      <section
        className="town-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Centro da vila"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="town-menu-heading">
          <span className="town-center-art-preview"><AtlasSprite sprite={`town${Math.min(3, center?.level ?? 1)}` as "town1" | "town2" | "town3"} scale={0.15} /></span>
          <div>
            <h1>Centro da vila</h1>
            <p><Flag size={13} aria-hidden="true" /> {ERA_NAMES[era]} · N{center?.level ?? 1}</p>
          </div>
          <div className="town-header-actions">
            <button type="button" title="Realocar centro urbano" aria-label="Realocar centro urbano" onClick={onRelocate}><RotateCcw size={17} /></button>
            <button type="button" title="Fechar" aria-label="Fechar centro da vila" onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <details className="town-upkeep">
          <summary>
            <span title="População"><Users size={16} aria-hidden="true" /><strong>{village.units.length}/{populationCapacity(village)}</strong></span>
            <span title="Consumo de comida"><Wheat size={16} aria-hidden="true" />{upkeepCost(village)} / 10 min</span>
          </summary>
          <p>Aldeões e explorador {civilians * UPKEEP_PER_VILLAGER} · soldados {soldiers * UPKEEP_PER_SOLDIER} · animais {animals * UPKEEP_PER_ANIMAL} · casas {houseUpkeep}. Próxima refeição em {Math.ceil((UPKEEP_INTERVAL - village.economy.upkeepElapsed) / 60)} min.</p>
        </details>
        <nav className="research-tabs" role="tablist" aria-label="Centro da vila">
          {TABS.filter((t) => !marketLocked || (t.id !== "market" && t.id !== "seeds")).map((t) => (
            <button type="button" key={t.id} id={`town-tab-${t.id}`} role="tab"
              aria-controls="town-tab-content" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              <t.icon size={21} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>
        <div id="town-tab-content" className="research-content" role="tabpanel" aria-labelledby={`town-tab-${tab}`}>
        {tab === "era" ? center && (
          <div className="town-upgrade">
            {recruitLocked && <p className="economy-caption">{hasBarn ? "Envie um trabalhador à fazenda inicial." : "Construa o primeiro celeiro e cultive a fazenda inicial."}</p>}
            {goals.length > 0 && !centerImprovement && (
              <ul className="era-goals" aria-label="Objetivos para a Era do Comércio">
                {goals.map((goal) => <li key={goal.label} className={goal.done ? "is-done" : ""}>
                  {goal.done ? <Check size={15} aria-label="Concluído" /> : <Circle size={13} aria-label="Pendente" />}
                  {goal.label}
                </li>)}
              </ul>
            )}
            {centerImprovement ? (
              <p className="town-status"><Clock3 size={16} aria-hidden="true" /> Melhoria em andamento</p>
            ) : center.level < 8 ? (
              <><button className="upgrade-action"
                disabled={missingGoals.length > 0 || missingTownResources.length > 0}
                title={missingGoals.length ? `Para avançar: ${missingGoalText}` : missingTownResources.length
                  ? `Faltam recursos: ${missingTownResources.map(([resource, amount]) => `${amount - village.resources[resource]} ${RESOURCE_NAMES[resource].toLowerCase()}`).join(", ")}` : undefined}
                onClick={() => { void sendCommand({ type: "upgradeTownCenter" }) }}>
                <Home size={15} /> {center.level === 1 ? "Avançar para Comércio" : center.level === 3 ? "Avançar para Fortaleza" : center.level === 5 ? "Avançar para Reino" : center.level === 7 ? "Avançar para Império" : `Melhorar centro urbano · nível ${center.level + 1}`}
                <TownCost cost={nextTownCost!} available={village.resources} />
                <small>Avanço imediato quando todos os materiais estiverem disponíveis.</small>
                {center.level === 1 && <small>Libera ferro, mercado, oficinas e quartel.</small>}
              </button>
              {missingGoals.length > 0 && <p className="town-upgrade-reason">Para avançar: {missingGoalText}.</p>}
              {missingTownResources.length > 0 && <p className="town-upgrade-reason">Faltam recursos: {missingTownResources.map(([resource, amount]) => `${amount - village.resources[resource]} ${RESOURCE_NAMES[resource].toLowerCase()}`).join(", ")}.</p>}
              </>
            ) : <p className="economy-caption">Centro urbano no nível máximo.</p>}
          </div>
        ) : tab === "society" ? (
            <SocietyPanel village={village} />
          ) : tab === "market" ? (
            <MarketPanel village={village} />
          ) : tab === "seeds" ? (
            <SeedPanel village={village} />
          ) : tab === "animals" ? (
            <div className="animal-catalog">
              <h2>Animais da fazenda</h2>
              <p>{recruitLocked ? "Conclua a primeira colheita e entrega." : "Escolha os animais no curral."}</p>
              <div>{animalSprites.filter((animal) => animal.id !== "chicken" && !unlockReason(village, { kind: "animal", value: animal.id })).map((animal) => (
                <span key={animal.id}><AtlasSprite sprite={animal.id} scale={0.65} /><strong>{animal.name}</strong></span>
              ))}</div>
            </div>
          ) : (
            <>
              {tab === "workers" && (
                <div className="recruit-card">
                  <div>
                    <h2>Recrutar aldeão</h2>
                    <p>
                      {villagers.length} aldeões · população {village.units.length}/{populationCapacity(village)}
                    </p>
                    {recruitBlocked && <small className="population-warning">{recruitBlocked}</small>}
                  </div>
                  <BatchQuantity value={recruitAmount} onChange={setRecruitAmount} max={10} />
                  <button
                    className="primary-action"
                    disabled={!!recruitBlocked}
                    onClick={() => {
                      void sendCommand({ type: "recruitVillager", amount: recruitAmount })
                    }}
                  >
                    <Users size={16} />
                    Recrutar {recruitAmount}
                    <TownCost cost={{ food: RECRUIT_COST.food * recruitAmount }} available={village.resources} />
                    <small><Clock3 size={13} /> {recruitAmount * RECRUIT_SECONDS}s · {RECRUIT_SECONDS}s por aldeão</small>
                  </button>
                  {!!recruitment?.remaining && <div className="recruit-queue" role="status">
                    <span><Users size={15} /> {recruitment.remaining} na fila</span>
                    <strong><Clock3 size={14} /> {Math.ceil(RECRUIT_SECONDS - recruitment.progress)}s para o próximo</strong>
                    <i><b style={{ width: `${recruitment.progress / RECRUIT_SECONDS * 100}%` }} /></i>
                  </div>}
                </div>
              )}
              <div className="research-card">
                <span className="hud-eyebrow">
                  Pesquisa · N{level}/3
                </span>
                <h2>{level < 3 ? spec.levelNames[(level + 1) as 1 | 2 | 3] : spec.name}</h2>
                <p>{level < 3 ? spec.levelEffects[(level + 1) as 1 | 2 | 3] : spec.description}</p>
                {improvement ? (
                  <ImprovementProgress
                    item={improvement}
                    elapsed={village.economy.elapsed}
                    label={`${spec.levelNames[improvement.targetLevel as 1 | 2 | 3]} · nível ${improvement.targetLevel}`}
                  />
                ) : level < 3 ? (
                  <button
                    className="primary-action"
                    disabled={!!researchLocked || !afford(village, spec.costs[level + 1])}
                    onClick={() => {
                      void sendCommand({ type: "research", research })
                    }}
                  >
                    <ArrowUp size={16} />
                    Pesquisar nível {level + 1}
                    <TownCost cost={spec.costs[level + 1]} available={village.resources} />
                    <small>{IMPROVEMENT_SECONDS[(level + 1) as 1 | 2 | 3] / 60} min</small>
                    {researchLocked && <small>{researchLocked}</small>}
                  </button>
                ) : (
                  <p className="research-complete">
                    Pesquisa concluída. O bônus já está ativo em toda a vila.
                  </p>
                )}
              </div>
              {tab !== "workers" && (
                <p className="economy-caption">
                  O bônus vale para todas as fazendas existentes e futuras. Cada
                  fazenda de 4×4 recebe até quatro trabalhadores.
                </p>
              )}
              {village.economy.foodShortage && (
                <p className="selection-warning">
                  Faltou comida na última refeição. Os aldeões trabalham e
                  caminham a 50% até uma refeição completa.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function SeedPanel({ village }: { village: VillageState }) {
  const seeds: { id: SeedKind; name: string }[] = [
    { id: "carrot", name: "Cenoura" },
    { id: "wheat", name: "Trigo" },
    { id: "potato", name: "Batata" },
    { id: "tree", name: "Árvore" },
  ]
  return (
    <div className="market-panel">
      <div className="market-heading">
        <div>
          <h2>Sementes</h2>
          <p>Compre sementes para escolher o cultivo e replantar árvores.</p>
        </div>
        <span><Coins size={18} /> {village.city?.treasury ?? 40} moedas</span>
      </div>
      <div className="seed-list">
        {seeds.map(({ id, name }) => {
          const cost = SEED_PRICES[id] * SEED_BUNDLE_SIZE
          return (
            <div key={id}>
              <span><strong>{name}</strong><small>{village.seeds[id]} em estoque · {SEED_PRICES[id]} moedas cada</small></span>
              <button
                className="primary-action"
                disabled={(village.city?.treasury ?? 40) < cost}
                onClick={() => { void sendCommand({ type: "buySeeds", seed: id, amount: SEED_BUNDLE_SIZE }) }}
              >
                Comprar {SEED_BUNDLE_SIZE} · {cost} moedas
              </button>
            </div>
          )
        })}
      </div>
      <p className="economy-caption">Cada novo ciclo da fazenda consome uma semente. Plante várias árvores para que cresçam ao mesmo tempo; cada muda leva 10 minutos de jogo.</p>
    </div>
  )
}

function MarketPanel({ village }: { village: VillageState }) {
  const [amounts, setAmounts] = useState<Record<string, number>>({
    food: 10,
    wood: 10,
    stone: 10,
    iron: 10,
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const capacity = storageCapacities(village)
  const caravanRoom = Math.max(0, MARKET_CYCLE_BUDGET - (village.city?.tradeRevenue ?? 0))
  async function trade(resource: keyof typeof MARKET_RATES, amount: number, side: "buy" | "sell") {
    if (busy) return
    setBusy(true)
    setMessage("")
    if (side === "sell" && await sendCommand({ type: "sellResource", resource, amount }))
      setMessage(`Venda concluída: +${(amount / MARKET_RATES[resource].amount) * MARKET_RATES[resource].gold} moedas.`)
    else if (side === "buy" && await sendCommand({ type: "buyResource", resource, amount }))
      setMessage(`Compra concluída: ${amount} ${RESOURCE_NAMES[resource].toLowerCase()} por ${(amount / MARKET_BUY_RATES[resource].amount) * MARKET_BUY_RATES[resource].gold} moedas.`)
    setBusy(false)
  }
  return (
    <div className="market-panel">
      <div className="market-heading">
        <div>
          <h2>Mercado da vila</h2>
          <p>Ouro minerado é material. Vendas rendem moedas para o tesouro.</p>
        </div>
        <span>
          <Coins size={20} />
          {village.city?.treasury ?? 40} moedas
        </span>
      </div>
      <div className="market-list">
        {(Object.keys(MARKET_RATES) as (keyof typeof MARKET_RATES)[]).map(
          (resource) => {
            const rate = MARKET_RATES[resource]
            const buyRate = MARKET_BUY_RATES[resource]
            const maxSell = Math.min(
              Math.floor(village.resources[resource] / rate.amount) * rate.amount,
              Math.floor(caravanRoom / rate.gold) * rate.amount,
            )
            const maxBuy = Math.min(
              Math.floor((village.city?.treasury ?? 40) / buyRate.gold) * buyRate.amount,
              Math.floor((capacity[resource] - village.resources[resource]) / buyRate.amount) * buyRate.amount,
            )
            const maxAmount = Math.max(maxSell, maxBuy)
            const amount = Math.min(amounts[resource] ?? 0, maxAmount)
            const sellGold = (amount / rate.amount) * rate.gold
            const buyGold = (amount / buyRate.amount) * buyRate.gold
            return (
              <div key={resource}>
                <div>
                  <strong>{RESOURCE_NAMES[resource]}</strong>
                  <small>
                    Estoque {village.resources[resource]} · quantidade {amount}
                  </small>
                  <input
                    className="market-quantity-slider"
                    type="range"
                    min={0}
                    max={maxAmount}
                    step={rate.amount}
                    value={amount}
                    aria-label={`Quantidade de ${RESOURCE_NAMES[resource].toLowerCase()} para vender`}
                    disabled={busy || maxAmount === 0}
                    onChange={(event) =>
                      setAmounts((current) => ({
                        ...current,
                        [resource]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="market-trades">
                  <button className="market-buy" disabled={busy || amount === 0 || amount > maxBuy} onClick={() => void trade(resource, amount, "buy")}>
                    Comprar · {buyGold} moedas
                  </button>
                  <button className="market-sell" disabled={busy || amount === 0 || amount > maxSell} onClick={() => void trade(resource, amount, "sell")}>
                    Vender · +{sellGold} moedas
                  </button>
                </div>
              </div>
            )
          },
        )}
      </div>
      <p className="economy-caption">Caravana: {caravanRoom}/{MARKET_CYCLE_BUDGET} moedas disponíveis neste ciclo financeiro.</p>
      <div className="city-market-products">
        {(Object.keys(MARKET_PRODUCT_RATES) as (keyof typeof MARKET_PRODUCT_RATES)[]).map((item) => {
          const quote = MARKET_PRODUCT_RATES[item]
          const stock = item in (village.crafts ?? {})
            ? village.crafts?.[item as keyof NonNullable<VillageState["crafts"]>] ?? 0
            : village.animalProducts?.[item as keyof NonNullable<VillageState["animalProducts"]>] ?? 0
          const name = ({ nails: "Pregos", cloth: "Tecido", clothing: "Roupa", tools: "Ferramenta", weapons: "Arma", armor: "Armadura", milk: "Leite", wool: "Lã", eggs: "Ovos", feathers: "Penas" } as const)[item]
          return <button key={item} type="button" disabled={busy || stock < quote.amount || caravanRoom < quote.coins}
            onClick={async () => {
              setBusy(true)
              if (await sendCommand({ type: "sellProduct", item, amount: quote.amount })) setMessage(`Vendido: ${quote.amount} ${name.toLowerCase()} · +${quote.coins} moedas.`)
              setBusy(false)
            }}>{name} {stock} · vender {quote.amount} por {quote.coins} moedas</button>
        })}
      </div>
      <button type="button" className="primary-action" disabled={busy || village.resources.gold < 10 || caravanRoom < 10}
        onClick={async () => {
          setBusy(true)
          if (await sendCommand({ type: "mintGold", amount: 10 })) setMessage("10 ouros minerados trocados por 10 moedas.")
          setBusy(false)
        }}>Trocar 10 ouros minerados por 10 moedas</button>
      {message && (
        <p className="market-message" role="status">
          {message}
        </p>
      )}
      <p className="economy-caption">
        O mercado usa moedas do tesouro. Ouro extraído continua no estoque para construções e oficinas.
      </p>
    </div>
  )
}

const TAX_LABELS = { exempt: "Isento", low: "Baixo", normal: "Normal", high: "Alto", abusive: "Abusivo" } as const

function SocietyPanel({ village }: { village: VillageState }) {
  const city = village.city
  if (!city) return <p>Preparando a economia da cidade…</p>
  const civilians = village.units.filter((unit) => unit.kind === "villager").length
  const military = village.units.filter((unit) => unit.kind === "soldier" || unit.kind === "archer").length
  const wages = (townLevel(village) >= 2 ? civilians * CIVILIAN_WAGE : 0)
  const soldierPay = military * MILITARY_WAGE
  const windowStart = village.economy.elapsed - 3600
  const flows = (Object.keys(RESOURCE_NAMES) as (keyof Resources)[]).map((resource) => {
    const entries = city.flows.filter((entry) => entry.resource === resource && entry.at > windowStart)
    return { resource, received: entries.filter((entry) => entry.delta > 0).reduce((sum, entry) => sum + entry.delta, 0),
      spent: -entries.filter((entry) => entry.delta < 0).reduce((sum, entry) => sum + entry.delta, 0) }
  })
  const causes = [
    village.economy.foodShortage ? "Comida insuficiente reduz satisfação e trabalho." : "Comida suficiente melhora a satisfação.",
    city.unpaidCycles ? `Pagamento incompleto por ${city.unpaidCycles} ciclo(s). Venda excedentes no mercado.` : "Salários e soldos em dia.",
    city.taxPolicy === "high" || city.taxPolicy === "abusive" ? "Impostos altos reduzem a satisfação." : "Impostos moderados preservam a confiança.",
  ]
  const taxLocked = village.economy.elapsed - city.lastTaxChangeAt < UPKEEP_INTERVAL
  return <div className="town-upgrade city-economy-panel">
    <h2>Cidade e tesouro</h2>
    <div className="city-economy-stats">
      <span><Coins size={16} /> <strong>{city.treasury}</strong> moedas</span>
      <span><Users size={16} /> <strong>{Math.round(city.satisfaction)}</strong>/100 satisfação</span>
      <span><ShieldCheck size={16} /> <strong>{Math.round(city.trust)}</strong>/100 confiança</span>
    </div>
    <p>Próximo ciclo financeiro em {Math.ceil((FINANCE_INTERVAL - city.financeElapsed) / 60)} min de jogo · salários {wages} · soldos {soldierPay} moedas.</p>
    <p>Último ciclo: +{city.lastCycle.taxes} impostos · -{city.lastCycle.paid}/{city.lastCycle.wages + city.lastCycle.military} pagos.</p>
    {city.treasury < wages + soldierPay && <p className="town-upgrade-reason">Faltam {wages + soldierPay - city.treasury} moedas para a próxima folha. Venda recursos no mercado.</p>}
    <div className="city-tax-policies" aria-label="Política tributária">
      {(Object.keys(TAX_RATES) as (keyof typeof TAX_RATES)[]).map((policy) =>
        <button key={policy} type="button" aria-pressed={city.taxPolicy === policy}
          disabled={taxLocked && city.taxPolicy !== policy}
          title={`${Math.round(TAX_RATES[policy] * 100)}% sobre a atividade produtiva`}
          onClick={() => void sendCommand({ type: "setTaxPolicy", policy })}>{TAX_LABELS[policy]} · {Math.round(TAX_RATES[policy] * 100)}%</button>)}
    </div>
    <p className="economy-caption">Impostos incidem sobre a produção de comida, limitados pela população trabalhadora. Uma alteração por ciclo de 10 min.</p>
    <button type="button" className="primary-action" disabled={village.resources.food < 100 || city.treasury < 20 || village.economy.elapsed - city.festivalAt < FINANCE_INTERVAL}
      onClick={() => void sendCommand({ type: "holdFestival" })}>Festival da colheita · 100 comida · 20 moedas · +8 satisfação</button>
    <div className="city-flow-list" aria-label="Fluxo de recursos na última hora de jogo">
      {flows.map(({ resource, received, spent }) => <span key={resource}>
        <strong>{RESOURCE_NAMES[resource]}</strong> +{received} · -{spent} <small>líquido {received - spent >= 0 ? "+" : ""}{received - spent}/h</small>
      </span>)}
    </div>
    <p className="economy-caption">{causes.join(" ")}</p>
  </div>
}
