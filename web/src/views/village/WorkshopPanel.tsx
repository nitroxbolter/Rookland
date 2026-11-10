import { useState, type ReactNode } from "react"
import {
  Anvil, ArrowUp, Box, ChevronDown, Clock3, Coins, Droplets, Hammer, LockKeyhole,
  Egg, Feather, Mountain, Pickaxe, Shield, Shirt, Spool, Swords, TreePine, Wheat,
  type LucideIcon,
} from "lucide-react"
import { sendCommand } from "@/services/gameClient"
import {
  CRAFT_RECIPES, FORGE_UPGRADES, MAX_FORGE_LEVEL, IMPROVEMENT_SECONDS, RESOURCE_NAMES,
  WEAVING_UPGRADES, craftOutput,
} from "../../../../shared/village/config"
import { townLevel, unlockReason } from "../../../../shared/village/progression"
import type { Building, CraftItem, Resource, VillageState } from "../../../../shared/village/types"

type Material = Resource | CraftItem | "milk" | "wool" | "eggs" | "feathers"
type Materials = Partial<Record<Material, number>>
type Upgrade = "tools" | "weapons" | "armor"

const ITEMS: Record<Material, { label: string; Icon: LucideIcon }> = {
  wood: { label: RESOURCE_NAMES.wood, Icon: TreePine },
  stone: { label: RESOURCE_NAMES.stone, Icon: Mountain },
  food: { label: RESOURCE_NAMES.food, Icon: Wheat },
  iron: { label: RESOURCE_NAMES.iron, Icon: Anvil },
  gold: { label: RESOURCE_NAMES.gold, Icon: Coins },
  milk: { label: "Leite", Icon: Droplets },
  wool: { label: "Lã", Icon: Spool },
  eggs: { label: "Ovos", Icon: Egg },
  feathers: { label: "Penas", Icon: Feather },
  nails: { label: "Pregos", Icon: Hammer },
  cloth: { label: "Panos", Icon: Spool },
  clothing: { label: "Roupas", Icon: Shirt },
  tools: { label: "Ferramentas", Icon: Pickaxe },
  weapons: { label: "Armas", Icon: Swords },
  armor: { label: "Armaduras", Icon: Shield },
}

const CRAFT_ART: Record<CraftItem, ReactNode> = {
  nails: <>
    <path d="m5 7 3-3 8 8-3 3zM10 12l4-4 12 12 2 8-8-2z" fill="#9eb6c4" />
    <path d="m22 5 5 4-3 4-5-4zM21 10l4 3-10 13-6 2 1-7z" fill="#e0e8e8" />
    <path d="m11 24 11-13" stroke="#98adb6" />
  </>,
  tools: <>
    <path d="m9 25 10-15 5 3-10 16z" fill="#cd8c52" />
    <path d="m5 13 7-8 9-1 8 6-4 5-7-5-6 2-4 5z" fill="#d7e5eb" />
    <path d="m8 13 6-5 8-2" fill="none" stroke="#f5f3d9" />
  </>,
  weapons: <>
    <path d="m8 20 13-13 7-3-2 7-13 13z" fill="#d7e6ef" />
    <path d="m13 24 13-13 2-7-7 7" fill="#95b7cb" />
    <path d="m5 25 5-5 4 4-5 5z" fill="#ad7043" />
    <path d="m7 18 2-2 8 8-2 2z" fill="#ffd579" />
  </>,
  armor: <>
    <path d="m4 8 12-5 12 5v9c0 6-6 10-12 13C10 27 4 23 4 17z" fill="#e9c57e" />
    <path d="m8 10 8-3 8 3v7c0 4-4 7-8 10-4-3-8-6-8-10z" fill="#6fb2bf" />
    <path d="M16 8v17" stroke="#b8e6e4" strokeWidth="2" />
  </>,
  cloth: <>
    <path d="M6 7h16l5 5-3 12H8c-4 0-5-3-4-6z" fill="#9cc3ec" />
    <path d="M8 7h14l5 5H8a3 3 0 0 1 0-5z" fill="#d2e9fa" />
    <path d="M6 18h18m-18 4h17" stroke="#5a87ae" />
  </>,
  clothing: <>
    <path d="m3 10 8-5 5 2 5-2 8 5-4 8-4-2v12H11V16l-4 2z" fill="#91bbd9" />
    <path d="m11 5 5 5 5-5m-5 5v16m-5 0h10" fill="none" stroke="#dcebf4" />
  </>,
}

function ItemIcon({ item, size = 20 }: { item: Material; size?: number }) {
  if (size >= 21 && item in CRAFT_ART) {
    return <svg className="workshop-item" width={size} height={size} viewBox="0 0 32 32"
      stroke="#34251d" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      {CRAFT_ART[item as CraftItem]}
    </svg>
  }
  const { Icon } = ITEMS[item]
  return <Icon className={`workshop-item item-${item}`} size={size} aria-hidden="true" />
}

function stock(village: VillageState, item: Material) {
  if (item === "milk" || item === "wool" || item === "eggs" || item === "feathers") return village.animalProducts?.[item] ?? 0
  if (item in RESOURCE_NAMES) return village.resources[item as Resource]
  return village.crafts?.[item as CraftItem] ?? 0
}

function MaterialChips({ village, cost, batches = 1 }: { village: VillageState; cost: Materials; batches?: number }) {
  return <ul className="workshop-costs" aria-label="Materiais necessários">
    {(Object.entries(cost) as [Material, number][]).map(([item, perBatch]) => {
      const required = perBatch * batches
      const available = stock(village, item)
      const description = `${ITEMS[item].label}: ${available} de ${required} disponíveis`
      return <li key={item} className={available < required ? "missing" : ""} title={description} aria-label={description}>
        <ItemIcon item={item} size={16} /><strong>{required}</strong>
      </li>
    })}
  </ul>
}

function canPay(village: VillageState, cost: Materials, batches = 1) {
  return (Object.entries(cost) as [Material, number][])
    .every(([item, count]) => stock(village, item) >= count * batches)
}

const recipesFor = (kind: Building["kind"]) => (Object.keys(CRAFT_RECIPES) as CraftItem[])
  .filter((item) => CRAFT_RECIPES[item].building === kind)

function recipeLock(village: VillageState, item: CraftItem) {
  if (item !== "armor") return null
  return unlockReason(village, { kind: "armor" }) ??
    (townLevel(village) < 3 ? "Requer Centro da Vila nível 3." : null)
}

const UPGRADES: Upgrade[] = ["tools", "weapons", "armor"]
const UPGRADE_COMMANDS = { tools: "upgradeTools", weapons: "upgradeWeapons", armor: "upgradeArmor" } as const

export function WorkshopPanel({ village, building }: { village: VillageState; building: Building }) {
  const recipes = recipesFor(building.kind)
  const [selected, setSelected] = useState<CraftItem>(recipes[0])
  const [batches, setBatches] = useState(1)
  const [pending, setPending] = useState(false)
  const recipe = CRAFT_RECIPES[selected]
  const output = craftOutput(selected, building.level)
  const cost: Materials = {
    ...recipe.resources,
    ...recipe.crafts,
    ...("products" in recipe ? recipe.products : {}),
  }
  const locked = recipeLock(village, selected)
  const ready = canPay(village, cost, batches)
  const weavingImprovement = building.kind === "weaving" && village.improvements?.some(
    (item) => item.kind === "building" && item.buildingId === building.id,
  )
  const blocked = locked ?? (building.construction ? "Em construção" :
    weavingImprovement ? "Melhoria em andamento" :
    building.production ? "Produção em andamento" : !ready ? "Faltam materiais" : null)

  return <>
    <div className="workshop-slots" role="group" aria-label="Receitas">
      {recipes.map((item) => {
        const lock = recipeLock(village, item)
        const label = `${ITEMS[item].label}, ${stock(village, item)} em estoque${lock ? `. ${lock}` : ""}`
        return <button key={item} type="button" className={`workshop-slot${lock ? " is-locked" : ""}`}
          aria-label={label} title={label} aria-pressed={item === selected} onClick={() => setSelected(item)}>
          <ItemIcon item={item} size={27} />
          <span className="workshop-stock" aria-hidden="true">{stock(village, item)}</span>
          {lock && <LockKeyhole className="workshop-lock" size={13} aria-hidden="true" />}
        </button>
      })}
    </div>
    <section className="workshop-recipe" aria-label={ITEMS[selected].label}>
      <div className="workshop-recipe-heading">
        <h3>{ITEMS[selected].label} <span>×{output.yield * batches}</span></h3>
        <span className="workshop-time" aria-label={`${output.seconds * batches} segundos`}><Clock3 size={14} aria-hidden="true" />{output.seconds * batches}s</span>
      </div>
      <MaterialChips village={village} cost={cost} batches={batches} />
      {!locked && <label className="workshop-quantity">
        <Box size={16} aria-hidden="true" />
        <input type="range" min={1} max={20} value={batches} onChange={(event) => setBatches(Number(event.target.value))}
          aria-label="Quantidade de lotes" aria-valuetext={`${batches} lotes, ${output.yield * batches} unidades`} />
        <output title="Lotes">{batches}</output>
      </label>}
      <button className="workshop-make" type="button" disabled={!!blocked || pending} onClick={async () => {
        setPending(true)
        try {
          await sendCommand({ type: "craftItem", buildingId: building.id, item: selected, amount: batches })
        } finally {
          setPending(false)
        }
      }}>
        {locked ? <LockKeyhole size={16} aria-hidden="true" /> : <Hammer size={16} aria-hidden="true" />}
        {blocked ?? (pending ? "Enviando…" : "Produzir")}
      </button>
    </section>
    {building.kind === "blacksmith" && <WorkshopUpgrades village={village} construction={!!building.construction} />}
    {building.kind === "weaving" && <WeavingUpgrade village={village} building={building} improving={!!weavingImprovement} />}
  </>
}

function WeavingUpgrade({ village, building, improving }: { village: VillageState; building: Building; improving: boolean }) {
  const [pending, setPending] = useState(false)
  const nextLevel = (building.level + 1) as 2 | 3 | 4 | 5
  const upgrade = WEAVING_UPGRADES[nextLevel]
  const cost: Materials = upgrade ? { ...upgrade.cost, tools: upgrade.tools } : {}
  const blocked = building.construction ? "Em construção"
    : improving ? "Melhoria em andamento"
    : building.production ? "Aguarde a produção"
    : townLevel(village) < nextLevel ? `Requer Centro N${nextLevel}`
    : !canPay(village, cost) ? "Faltam materiais" : null
  return <details className="workshop-upgrades">
    <summary><ArrowUp size={16} aria-hidden="true" /> Melhorias <ChevronDown size={15} aria-hidden="true" /></summary>
    <div className="workshop-recipe">
      <div className="workshop-recipe-heading">
        <h3>{upgrade?.name ?? "Tear Mecânico"}</h3>
        <span>{upgrade ? `N${nextLevel}` : "N5 · Máximo"}</span>
      </div>
      {upgrade && <>
        <ul className="workshop-costs" aria-label="Rendimento por lote após a melhoria">
          <li title="Panos por lote"><ItemIcon item="cloth" size={16} />×{craftOutput("cloth", nextLevel).yield}</li>
          <li title="Roupas por lote"><ItemIcon item="clothing" size={16} />×{craftOutput("clothing", nextLevel).yield}</li>
          <li title="Redução do tempo por lote"><Clock3 size={15} aria-hidden="true" />−{upgrade.timeReduction}%</li>
        </ul>
        <MaterialChips village={village} cost={cost} />
        <button className="workshop-make" type="button" disabled={!!blocked || pending}
          onClick={async () => {
            setPending(true)
            try {
              await sendCommand({ type: "upgradeWeaving", buildingId: building.id })
            } finally {
              setPending(false)
            }
          }}><ArrowUp size={16} aria-hidden="true" />{blocked ?? (pending ? "Enviando…" : `Melhorar · ${IMPROVEMENT_SECONDS[nextLevel] / 60} min`)}</button>
      </>}
    </div>
  </details>
}

function WorkshopUpgrades({ village, construction }: { village: VillageState; construction: boolean }) {
  const [selected, setSelected] = useState<Upgrade>("tools")
  const [pending, setPending] = useState(false)
  const levels = { tools: village.toolLevel ?? 0, weapons: village.weaponLevel ?? 0, armor: village.armorLevel ?? 0 }
  const level = levels[selected]
  const next = (level + 1) as 1 | 2 | 3 | 4
  const tier = level >= MAX_FORGE_LEVEL ? null : FORGE_UPGRADES[next]
  const cost: Materials | null = tier ? { ...tier.costs[selected], [selected]: 1 } : null
  const improvement = village.improvements?.find((item) => item.kind === "forge" && item.track === selected)
  const remaining = improvement ? Math.max(0, Math.ceil(improvement.finishAt - village.economy.elapsed)) : 0
  const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`
  return <details className="workshop-upgrades">
    <summary><ArrowUp size={16} aria-hidden="true" /> Melhorias <ChevronDown size={15} aria-hidden="true" /></summary>
    <div className="workshop-slots" role="group" aria-label="Melhorias da ferraria">
      {UPGRADES.map((item) => (
        <button key={item} type="button" className="workshop-slot" aria-pressed={item === selected}
          aria-label={`Melhorar ${ITEMS[item].label.toLowerCase()}, nível ${levels[item]} de ${MAX_FORGE_LEVEL}`} onClick={() => setSelected(item)}>
          <ItemIcon item={item} size={21} /><span className="workshop-stock">{levels[item]}/{MAX_FORGE_LEVEL}</span>
        </button>
      ))}
    </div>
    <div className="workshop-recipe">
      <div className="workshop-recipe-heading"><h3>{ITEMS[selected].label} · {tier?.name ?? "Máximo"}</h3><span>N{level} {cost ? `→ N${next}` : "· Máximo"}</span></div>
      <div className="forge-tiers" aria-label="Etapas da ferraria">
        {([1, 2, 3, 4] as const).map((stage) =>
          <span key={stage} className={stage <= level ? "is-done" : stage === next ? "is-next" : ""}
            title={`Nível ${stage}: ${FORGE_UPGRADES[stage].name}`}>
            {FORGE_UPGRADES[stage].name}
          </span>)}
      </div>
      {improvement ? <div className="workshop-progress" role="status">
        <span><Clock3 size={14} aria-hidden="true" /> {FORGE_UPGRADES[improvement.targetLevel as 1 | 2 | 3 | 4].name} · {timeLabel(remaining)}</span>
        <progress max={improvement.finishAt - improvement.startedAt}
          value={Math.min(improvement.finishAt - improvement.startedAt, village.economy.elapsed - improvement.startedAt)} />
      </div> : cost && <>
        <MaterialChips village={village} cost={cost} />
        <span className="workshop-time"><Clock3 size={14} aria-hidden="true" /> {timeLabel(tier!.seconds)}</span>
        <button className="workshop-make" type="button" disabled={construction || pending || !canPay(village, cost)}
          onClick={async () => {
            setPending(true)
            try {
              await sendCommand({ type: UPGRADE_COMMANDS[selected] })
            } finally {
              setPending(false)
            }
          }}><ArrowUp size={16} aria-hidden="true" /> Melhorar</button>
      </>}
    </div>
  </details>
}
