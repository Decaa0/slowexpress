import { useState } from "react";
import Cup, { ToppingIcon } from "./Cup";
import { baht, type Drink, type Topping } from "./api";

export const MAX_TOPPINGS = 3;
export type Config = { drink: Drink; quantity: number; toppingIds: string[]; note: string };

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
    <div role="dialog" aria-label={`Customize ${drink.name}`} className="customizer">
      <h3 className="cz-title">{drink.name} — {baht(drink.priceCents)}</h3>
      <div className="cz-body">
        <div data-testid="cup-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) add(id); }}
          className="cup-drop">
          <Cup drinkKey={drink.imageKey} toppings={chosen.map((t) => t.imageKey)} />
          <div className="cup-hint">Drag a topping here</div>
        </div>
        <div className="cz-side">
          <b>Toppings</b>
          <div className="topping-list">
            {toppings.map((t) => (
              <button key={t.id} type="button" draggable aria-pressed={ids.includes(t.id)} aria-label={`topping ${t.name}`}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} onClick={() => toggle(t.id)}
                className={ids.includes(t.id) ? "topping on" : "topping"}>
                <ToppingIcon imageKey={t.imageKey} /><span className="t-name">{t.name}</span><span className="t-price">+{baht(t.priceCents)}</span>
              </button>))}
          </div>
          {msg && <p role="alert" className="cz-alert">{msg}</p>}
          <label>Qty <input aria-label="quantity" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="qty" /></label>{" "}
          <label>Note <input aria-label="note" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="less ice, 50% sweet…" /></label>
          <p>Estimated: <b data-testid="estimate">{baht(unit * qty)}</b> <small>(the server computes the final price)</small></p>
          <button className="btn" onClick={() => onAdd({ drink, quantity: qty, toppingIds: ids, note })}>Add to cart</button>{" "}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
