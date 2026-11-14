import { useState } from "react";
import Cup, { ToppingIcon } from "./Cup";
import { baht, type Drink, type Topping } from "./api";

export const MAX_TOPPINGS = 3;
export type Config = { drink: Drink; quantity: number; toppingIds: string[]; note: string };
const G = "#0B7A46";

/** Drag a topping picture onto the cup to add it; tapping a topping also adds it, tapping an added one removes it. */
export default function Customizer({ drink, toppings, initial, onAdd, onClose }: { drink: Drink; toppings: Topping[]; initial?: Config; onAdd: (c: Config) => void; onClose: () => void }) {
  const [ids, setIds] = useState<string[]>(initial?.toppingIds ?? []);
  const [qty, setQty] = useState(initial?.quantity ?? 1);
  const [note, setNote] = useState(initial?.note ?? "");
  const [msg, setMsg] = useState("");
  const chosen = toppings.filter((t) => ids.includes(t.id));
  const unit = drink.priceCents + chosen.reduce((s, t) => s + t.priceCents, 0);

  function add(id: string) {
    if (ids.includes(id)) return;
    if (ids.length >= MAX_TOPPINGS) { setMsg(`Maximum ${MAX_TOPPINGS} toppings per drink`); return; }
    setMsg(""); setIds([...ids, id]);
  }
  const remove = (id: string) => { setMsg(""); setIds(ids.filter((x) => x !== id)); };
  const toggle = (id: string) => (ids.includes(id) ? remove(id) : add(id));

  return (
    <div role="dialog" aria-label={`Customize ${drink.name}`} style={{ border: `2px solid ${G}`, borderRadius: 12, padding: 12, background: "#fff", marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 8px" }}>{drink.name} — {baht(drink.priceCents)}</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div data-testid="cup-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) add(id); }}
          style={{ border: "2px dashed #9aa5a0", borderRadius: 12, padding: 8, textAlign: "center" }}>
          <Cup drinkKey={drink.imageKey} toppings={chosen.map((t) => t.imageKey)} />
          <div style={{ fontSize: 12, color: "#555" }}>Drag a topping here</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>Toppings</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0" }}>
            {toppings.map((t) => (
              <button key={t.id} type="button" draggable aria-pressed={ids.includes(t.id)} aria-label={`topping ${t.name}`}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} onClick={() => toggle(t.id)}
                style={{ border: ids.includes(t.id) ? `2px solid ${G}` : "1px solid #ccc", borderRadius: 10, background: "#fff", padding: 6, cursor: "grab", minWidth: 84 }}>
                <ToppingIcon imageKey={t.imageKey} /><div style={{ fontSize: 12 }}>{t.name}</div><div style={{ fontSize: 12 }}>+{baht(t.priceCents)}</div>
              </button>))}
          </div>
          {msg && <p role="alert" style={{ color: "#b00020", margin: "4px 0" }}>{msg}</p>}
          <label>Qty <input aria-label="quantity" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 56 }} /></label>{" "}
          <label>Note <input aria-label="note" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="less ice, 50% sweet…" /></label>
          <p>Estimated: <b data-testid="estimate">{baht(unit * qty)}</b> <small>(the server computes the final price)</small></p>
          <button style={{ background: G, color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px" }} onClick={() => onAdd({ drink, quantity: qty, toppingIds: ids, note })}>Add to cart</button>{" "}
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
