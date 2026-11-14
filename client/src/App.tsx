import { useEffect, useState } from "react";
import { api, ApiError, baht, getSession, setSession, type Menu, type Order, type User } from "./api";
import Customizer, { type Config } from "./Customizer";
import Cup from "./Cup";

export const STAFF_REFRESH_MS = 10_000;
export const ORDER_REFRESH_MS = 10_000;
const G = "#0B7A46";
const card: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 10, background: "#fff" };
const btn: React.CSSProperties = { background: G, color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", cursor: "pointer" };
const Err = ({ msg }: { msg: string }) => (msg ? <p role="alert" style={{ color: "#b00020" }}>{msg}</p> : null);
type Shell = { shop: string; table: string };

function Login({ staff, onDone }: { staff: boolean; onDone: (u: User) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } }); setSession({ token: r.token, kind: "user" }); onDone(r.user); }
    catch (x) { setErr((x as Error).message); }
  }
  return (<form onSubmit={submit} style={{ ...card, maxWidth: 340 }}>
    <h3>{staff ? "Staff sign in" : "Member sign in (points & promotions)"}</h3>
    <label>Email<br /><input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} /></label><br />
    <label>Password<br /><input aria-label="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} /></label><br /><br />
    <button style={btn} type="submit">Sign in</button><Err msg={err} /></form>);
}

function OrderCard({ o, onAccept, onOpen }: { o: Order; onAccept?: () => void; onOpen?: () => void }) {
  return (<div style={card} data-testid={`order-${o.id}`}>
    <b>{o.callName ? `“${o.callName}” · ` : ""}Table {o.table.label}</b> · {o.shop.name} · <b data-testid="status">{o.status}</b> · {baht(o.totalCents)}{" "}
    {onOpen && <a href="#" onClick={(e) => { e.preventDefault(); onOpen(); }}>details</a>}
    <ul style={{ margin: "6px 0" }}>{o.items.map((l) => (<li key={l.menuItemId}>{l.quantity}× {l.itemName}{l.toppings.length ? ` + ${l.toppings.map((t) => t.toppingName).join(", ")}` : ""}{l.note ? ` (${l.note})` : ""} — {baht(l.lineTotalCents)}</li>))}</ul>
    {onAccept && o.status === "PLACED" && <button style={btn} onClick={onAccept}>Accept</button>}</div>);
}

export function Orders({ staff, onOpen }: { staff: boolean; onOpen: (id: string) => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null); const [err, setErr] = useState("");
  const load = () => api<Order[]>("/orders").then(setOrders).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    if (!staff) return;
    const timer = setInterval(load, STAFF_REFRESH_MS); // issue #1: new orders appear without a reload
    return () => clearInterval(timer);
  }, [staff]);
  async function accept(id: string) { setErr(""); try { await api(`/orders/${id}/accept`, { method: "POST" }); await load(); } catch (x) { setErr((x as Error).message); } }
  if (!orders) return <><Err msg={err} /><p>Loading orders…</p></>;
  return (<div><h2>{staff ? "Incoming orders" : "My orders"} {staff && <button onClick={() => load()}>Refresh</button>}</h2><Err msg={err} />
    {orders.length === 0 && <p>No orders yet.</p>}
    {orders.map((o) => <OrderCard key={o.id} o={o} onOpen={staff ? undefined : () => onOpen(o.id)} onAccept={staff ? () => accept(o.id) : undefined} />)}</div>);
}

export function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [o, setO] = useState<Order | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setInterval> | undefined;
    const load = () => api<Order>(`/orders/${id}`).then((x) => {
      if (stopped) return;
      setO(x);
      if (x.status !== "PLACED" && timer) { clearInterval(timer); timer = undefined; } // issue #5: stop once the status has moved on
    }).catch((e) => { if (stopped) return; setErr(e.message); if (timer) { clearInterval(timer); timer = undefined; } }); // an error (e.g. 404) ends polling
    load();
    timer = setInterval(load, ORDER_REFRESH_MS);
    return () => { stopped = true; if (timer) clearInterval(timer); };
  }, [id]);
  return (<div><button onClick={onBack}>← Back</button><h2>Order</h2><Err msg={err} />
    {o && <><OrderCard o={o} /><p data-testid="server-total"><b>Total (computed by server): {baht(o.totalCents)}</b> · Payment: {o.paymentStatus}</p></>}</div>);
}

function MenuView({ tableCode, onPlaced }: { tableCode: string | null; onPlaced: (id: string) => void }) {
  const [menu, setMenu] = useState<Menu | null>(null); const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null); const [cart, setCart] = useState<Config[]>([]); const [callName, setCallName] = useState("");
  useEffect(() => { api<Menu>(`/menu${getSession()?.kind === "user" && tableCode ? `?tableCode=${tableCode}` : ""}`).then(setMenu).catch((e) => setErr(e.message)); }, [tableCode]);
  if (!menu) return <><Err msg={err} /><p>Loading menu…</p></>;
  const tById = new Map(menu.toppings.map((t) => [t.id, t]));
  const lineTotal = (c: Config) => (c.drink.priceCents + c.toppingIds.reduce((s, id) => s + (tById.get(id)?.priceCents ?? 0), 0)) * c.quantity;
  const estimate = cart.reduce((s, c) => s + lineTotal(c), 0);
  const drinks = menu.categories.flatMap((c) => c.items);
  async function place() {
    setErr("");
    try {
      const body = { tableCode: getSession()?.kind === "user" ? tableCode : undefined, callName: callName || undefined,
        items: cart.map((c) => ({ menuItemId: c.drink.id, quantity: c.quantity, toppingIds: c.toppingIds, note: c.note || undefined })) };
      const o = await api<Order>("/orders", { method: "POST", body }); setCart([]); onPlaced(o.id);
    } catch (x) { setErr((x as ApiError).message); }
  }
  const editDrink = drinks.find((d) => d.id === editing);
  return (<div><h2>{menu.shop.name} menu</h2>
    {editDrink && <Customizer key={editDrink.id} drink={editDrink} toppings={menu.toppings} initial={cart.find((c) => c.drink.id === editDrink.id)}
      onClose={() => setEditing(null)} onAdd={(c) => { setCart([...cart.filter((x) => x.drink.id !== c.drink.id), c]); setEditing(null); }} />}
    {menu.categories.length === 0 && <p>No drinks available right now.</p>}
    {menu.categories.map((cat) => (<div key={cat.name}><h3 style={{ color: G }}>{cat.name}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{cat.items.map((d) => (
        <button key={d.id} onClick={() => setEditing(d.id)} aria-label={`drink ${d.name}`} style={{ ...card, width: 130, textAlign: "center", cursor: "pointer" }}>
          <div style={{ transform: "scale(.55)", height: 120, marginTop: -40, marginBottom: -30 }}><Cup drinkKey={d.imageKey} toppings={cart.find((c) => c.drink.id === d.id)?.toppingIds.map((id) => tById.get(id)!.imageKey) ?? []} /></div>
          <div>{d.name}</div><b>{baht(d.priceCents)}</b></button>))}</div></div>))}
    <div style={card}><h3>Cart</h3>{cart.length === 0 && <p>Your cart is empty. Tap a drink.</p>}
      {cart.map((c) => (<div key={c.drink.id}>{c.quantity}× {c.drink.name}{c.toppingIds.length ? ` + ${c.toppingIds.map((id) => tById.get(id)?.name).join(", ")}` : ""} — {baht(lineTotal(c))}{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); setCart(cart.filter((x) => x !== c)); }}>remove</a></div>))}
      <p><label>Name for calling you <input aria-label="call name" maxLength={20} value={callName} onChange={(e) => setCallName(e.target.value)} placeholder="e.g. Mint" /></label></p>
      <p>Estimated total: <b>{baht(estimate)}</b> <small>(the server computes the final price)</small></p>
      <button style={btn} disabled={cart.length === 0} onClick={place}>Place order</button><Err msg={err} /></div></div>);
}

export default function App() {
  const path = window.location.pathname;
  const qrCode = path.startsWith("/t/") ? decodeURIComponent(path.slice(3)) : null;
  const staffPage = path.startsWith("/staff");
  const [tableCode, setTableCode] = useState<string | null>(qrCode ?? sessionStorage.getItem("tableCode"));
  const [shell, setShell] = useState<Shell | null>(null); const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"menu" | "orders" | "login" | { order: string }>(staffPage ? "orders" : "menu");
  const [err, setErr] = useState(""); const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (qrCode) {
          const t = await api<{ shop: { name: string }; table: { label: string } }>(`/tables/${encodeURIComponent(qrCode)}`);
          setShell({ shop: t.shop.name, table: t.table.label }); sessionStorage.setItem("tableCode", qrCode);
          if (!getSession()) { const g = await api<{ token: string }>("/guest-sessions", { method: "POST", body: { tableCode: qrCode } }); setSession({ token: g.token, kind: "guest" }); }
        }
        if (getSession()?.kind === "user") setUser(await api<User>("/auth/me"));
      } catch (e) { if (!(e instanceof ApiError && e.status === 401)) setErr((e as Error).message); setSession(null); }
      setReady(true);
    })();
  }, []);

  async function logout() { try { await api("/auth/logout", { method: "POST" }); } catch { /* already invalid */ } setSession(null); setUser(null); setView(staffPage ? "orders" : "menu"); }
  if (!ready) return <p>Loading…</p>;
  const staff = user?.role === "OPERATOR";
  return (<div style={{ fontFamily: "system-ui", maxWidth: 760, margin: "0 auto", padding: "10px 12px" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `3px solid ${G}`, marginBottom: 12, flexWrap: "wrap" }}>
      <h1 style={{ color: G, margin: 0, fontSize: 24 }}>Slow Express{shell ? ` · Table ${shell.table}` : ""}</h1>
      <span>{user ? <>{user.fullName} ({user.role}) <button onClick={logout}>Logout</button></> : !staffPage && <button onClick={() => setView("login")}>Member sign in</button>}</span></header>
    <Err msg={err} />
    {staffPage && !staff && <Login staff onDone={(u) => { setUser(u); setView("orders"); }} />}
    {staffPage && staff && <Orders staff onOpen={() => {}} />}
    {!staffPage && !getSession() && <p>Scan a table QR code to start ordering.</p>}
    {!staffPage && getSession() && <>
      <nav style={{ marginBottom: 12 }}><button onClick={() => setView("menu")}>Menu</button> <button onClick={() => setView("orders")}>My orders</button></nav>
      {view === "login" && <Login staff={false} onDone={(u) => { setUser(u); setView("menu"); }} />}
      {view === "menu" && <MenuView tableCode={tableCode} onPlaced={(id) => setView({ order: id })} />}
      {view === "orders" && <Orders staff={false} onOpen={(id) => setView({ order: id })} />}
      {typeof view === "object" && <OrderDetail id={view.order} onBack={() => setView("orders")} />}</>}
  </div>);
}
