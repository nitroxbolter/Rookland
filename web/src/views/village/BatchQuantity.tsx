export function BatchQuantity({ value, onChange, max = 10, label = "Quantidade" }: {
  value: number
  onChange: (value: number) => void
  max?: number
  label?: string
}) {
  return <label className="batch-quantity">
    <span>{label}</span>
    <button type="button" disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Diminuir quantidade">−</button>
    <input type="number" min={1} max={max} value={value} onChange={(event) => {
      const parsed = Number(event.target.value)
      if (Number.isInteger(parsed)) onChange(Math.max(1, Math.min(max, parsed)))
    }} />
    <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Aumentar quantidade">+</button>
  </label>
}
