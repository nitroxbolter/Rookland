import { useState } from "react"
import { ArrowUp, Clock3, Heart, PawPrint, Trash2, UserRound, Wheat } from "lucide-react"
import type { AnimalKind, Building, Resources, VillageState } from "../../../../shared/village/types"
import {
  ANIMALS, IMPROVEMENT_SECONDS, RANCH_BREED_FOOD_COST, RANCH_BREED_SECONDS,
  RANCH_CAPACITIES, RANCH_UPGRADE_COSTS, RESOURCE_NAMES,
} from "../../../../shared/village/config"
import { unlockReason } from "../../../../shared/village/progression"
import { sendCommand } from "@/services/gameClient"
import { AtlasSprite } from "./sprites"

const BIRTHS_PER_MINUTE = (60 / RANCH_BREED_SECONDS).toLocaleString("pt-BR")
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

export function RanchPanel({ village, building, onDestroyed }: { village: VillageState; building: Building; onDestroyed: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const animals = building.ranch?.animals ?? []
  const capacity = RANCH_CAPACITIES[building.level]
  const species = building.ranch?.kind
  const keeper = village.units.find((unit) =>
    unit.kind === "villager" && unit.job.kind === "ranch" && unit.job.targetId === building.id,
  )
  const availableKeeper = village.units.find((unit) => unit.kind === "villager" && unit.job.kind === "idle")
    ?? village.units.find((unit) => unit.kind === "villager")
  const improvement = village.improvements?.some((item) => item.kind === "building" && item.buildingId === building.id)
  const nextLevel = building.level + 1
  const cost = RANCH_UPGRADE_COSTS[nextLevel]
  const canUpgrade = cost && Object.entries(cost).every(([resource, count]) =>
    village.resources[resource as keyof Resources] >= count,
  )
  const breedingElapsed = building.ranch?.breedingElapsed ?? 0
  const remaining = Math.max(0, Math.ceil(RANCH_BREED_SECONDS - breedingElapsed))
  const breedingBlocked = building.construction ? "Em construção"
    : animals.length >= capacity ? "Curral cheio"
    : animals.length === 0 ? "Escolha o animal"
    : !keeper ? "Sem responsável"
    : remaining === 0 && village.resources.food < RANCH_BREED_FOOD_COST ? "Falta comida"
    : null

  return <div className="economy-panel ranch-panel">
    <div className="ranch-herd">
      <span className="ranch-portrait">
        {species ? <AtlasSprite sprite={species} scale={0.48} /> : <PawPrint size={25} aria-hidden="true" />}
      </span>
      <div><strong>{species ? ANIMALS[species].name : "Escolha um animal"}</strong><small>Nível {building.level} · capacidade {capacity}</small></div>
      <strong className="ranch-capacity" aria-label={`${animals.length} de ${capacity} animais`}>{animals.length}/{capacity}</strong>
    </div>

    <div className="ranch-breeding">
      <div className="ranch-breeding-rate" title={`Ritmo ativo: ${BIRTHS_PER_MINUTE} animais por minuto de jogo`}>
        <Heart size={16} aria-hidden="true" />
        <strong>{breedingBlocked ? "0" : BIRTHS_PER_MINUTE} animais/min</strong>
      </div>
      <span className="ranch-breeding-status">
        {breedingBlocked ?? <><Clock3 size={13} aria-hidden="true" /> Próximo em {formatTime(remaining)}</>}
      </span>
      {!breedingBlocked && <progress value={Math.min(RANCH_BREED_SECONDS, breedingElapsed)} max={RANCH_BREED_SECONDS} aria-label="Progresso até o próximo nascimento" />}
      <small className="ranch-breeding-cost" title="Comida por nascimento">
        <Wheat size={13} aria-hidden="true" /> {RANCH_BREED_FOOD_COST} por nascimento
      </small>
    </div>

    <div className="ranch-worker">
      {keeper ? <span><UserRound size={16} aria-hidden="true" />{keeper.name} · 1 por curral</span>
        : <button className="primary-action" disabled={!availableKeeper || !!building.construction}
          title={availableKeeper?.name ?? "Nenhum aldeão disponível"}
          onClick={() => availableKeeper && void sendCommand({ type: "assignUnit", unitId: availableKeeper.id, targetId: building.id })}>
          <UserRound size={16} aria-hidden="true" /> Designar aldeão · 1 por curral
        </button>}
    </div>

    {animals.length === 0 && !building.construction && <>
      <div className="ranch-options">
        {(Object.keys(ANIMALS) as AnimalKind[]).filter((value) => !unlockReason(village, { kind: "animal", value })).map((kind) => {
          const animal = ANIMALS[kind]
          return <button key={kind} disabled={village.resources.food < animal.foodCost}
            onClick={() => void sendCommand({ type: "stockRanch", buildingId: building.id, animal: kind })}>
            <span className="ranch-sprite"><AtlasSprite sprite={kind} scale={0.42} /></span>
            <strong>{animal.name}</strong>
            <small className={village.resources.food < animal.foodCost ? "is-missing" : ""}><Wheat size={12} aria-hidden="true" /> {animal.foodCost} · reprodução automática</small>
          </button>
        })}
      </div>
    </>}

    {cost && !improvement && !building.construction && <button className="upgrade-action ranch-upgrade" disabled={!canUpgrade}
      onClick={() => void sendCommand({ type: "upgradeRanch", buildingId: building.id })}>
      <ArrowUp size={15} aria-hidden="true" /> N{nextLevel} · {RANCH_CAPACITIES[nextLevel]} vagas · {IMPROVEMENT_SECONDS[nextLevel as 2 | 3 | 4 | 5] / 60} min
      <small className={!canUpgrade ? "is-missing" : ""}>{Object.entries(cost).map(([resource, count]) => `${count} ${RESOURCE_NAMES[resource as keyof Resources].toLowerCase()}`).join(" · ")}</small>
    </button>}

    {confirm ? <div className="relocate-buttons">
      <button onClick={() => setConfirm(false)}>Cancelar</button>
      <button className="confirm-demolish" onClick={async () => {
        if (await sendCommand({ type: "demolishBuilding", buildingId: building.id })) onDestroyed()
      }}>Destruir curral</button>
    </div> : <button className="workshop-demolish" aria-label="Destruir curral" title="Destruir curral" onClick={() => setConfirm(true)}>
      <Trash2 size={17} aria-hidden="true" />
    </button>}
  </div>
}
