import { useEffect, useState } from "react";
import { api, ApiError, baht, getSession, setSession, type Menu, type Order, type Rewards, type User } from "./api";
import Customizer, { type Config } from "./Customizer";
import Cup from "./Cup";

export const STAFF_REFRESH_MS = 10_000;
export const ORDER_REFRESH_MS = 10_000;
const Err = ({ msg }: { msg: string }) => (msg ? <p role="alert" style={{ color: "#b00020" }}>{msg}</p> : null);
type Shell = { shop: string; table: string };

function Login({ staff, onDone }: { staff: boolean; onDone: (u: User) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } }); setSession({ token: r.token, kind: "user" }); onDone(r.user); }
    catch (x) { setErr((x as Error).message); }
  }
  return (<form onSubmit={submit} className="card login" >
    <h3>{staff ? "Staff sign in" : "Member sign in (points & promotions)"}</h3>
    <label>Email<br /><input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} /></label><br />
    <label>Password<br /><input aria-label="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} /></label><br /><br />
    <button className="btn" type="submit">Sign in</button><Err msg={err} /></form>);
}

function OrderCard({ o, onAccept, onOpen }: { o: Order; onAccept?: () => void; onOpen?: () => void }) {
  return (<div className="card" data-testid={`order-${o.id}`}>
    <b>{o.callName ? `“${o.callName}” · ` : ""}Table {o.table.label}</b> · {o.shop.name} · <b data-testid="status">{o.status}</b> · {baht(o.totalCents)}{" "}
    {o.discountCents ? <small className="order-reward">Saved {baht(o.discountCents)} · used {o.pointsRedeemed} points{ o.pointsEarned ? ` · earned ${o.pointsEarned}` : ""}</small> : o.pointsEarned ? <small className="order-reward">Earned {o.pointsEarned} points</small> : null}
    {onOpen && <a href="#" onClick={(e) => { e.preventDefault(); onOpen(); }}>details</a>}
    <ul style={{ margin: "6px 0" }}>{o.items.map((l) => (<li key={l.menuItemId}>{l.quantity}× {l.itemName}{l.toppings.length ? ` + ${l.toppings.map((t) => t.toppingName).join(", ")}` : ""}{l.note ? ` (${l.note})` : ""} — {baht(l.lineTotalCents)}</li>))}</ul>
    {onAccept && o.status === "PLACED" && <button className="btn" onClick={onAccept}>Accept</button>}</div>);
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

export function MemberRewards() {
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { let active = true; api<Rewards>("/auth/rewards").then((r) => { if (active) setRewards(r); }).catch((e) => { if (active) setErr((e as Error).message); }); return () => { active = false; }; }, []);
  return <section className="card rewards-card" aria-label="Member rewards">
    <div className="rewards-head"><div><h3>My rewards</h3><p>Earn 1 point for every ฿10 you spend.</p></div><strong className="points-balance">{rewards ? `${rewards.points} points` : "Loading points…"}</strong></div>
    <p className="reward-rate">100 points = ฿10 off</p>
    {err && <Err msg={err} />}
    {rewards?.history.length ? <div><b>Recent rewards</b><ul className="reward-history">{rewards.history.map((h) => <li key={h.id}>{new Date(h.createdAt).toLocaleDateString()} · Earned {h.pointsEarned} points{h.pointsRedeemed ? ` · used ${h.pointsRedeemed} points · saved ${baht(h.discountCents)}` : ""}</li>)}</ul></div> : rewards && <p>No reward activity yet. Place an order to start earning.</p>}
  </section>;
}

function MenuView({ tableCode, onPlaced }: { tableCode: string | null; onPlaced: (id: string) => void }) {
  const [menu, setMenu] = useState<Menu | null>(null); const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null); const [cart, setCart] = useState<Config[]>([]); const [callName, setCallName] = useState("");
  const [rewards, setRewards] = useState<Rewards | null>(null); const [redeemPoints, setRedeemPoints] = useState(false);
  useEffect(() => { if (getSession()?.kind === "user") api<Rewards>("/auth/rewards").then(setRewards).catch(() => setRewards(null)); else setRewards(null); }, []);
  useEffect(() => { api<Menu>(`/menu${getSession()?.kind === "user" && tableCode ? `?tableCode=${tableCode}` : ""}`).then(setMenu).catch((e) => setErr(e.message)); }, [tableCode]);
  if (!menu) return <><Err msg={err} /><p>Loading menu…</p></>;
  const tById = new Map(menu.toppings.map((t) => [t.id, t]));
  const lineTotal = (c: Config) => (c.drink.priceCents + c.toppingIds.reduce((s, id) => s + (tById.get(id)?.priceCents ?? 0), 0)) * c.quantity;
  const estimate = cart.reduce((s, c) => s + lineTotal(c), 0);
  const pointsRedeemedPreview = redeemPoints && rewards ? Math.min(rewards.points, Math.floor(estimate / 10)) : 0;
  const discountPreview = pointsRedeemedPreview * 10;
  const drinks = menu.categories.flatMap((c) => c.items);
  async function place() {
    setErr("");
    try {
      const body = { tableCode: getSession()?.kind === "user" ? tableCode : undefined, callName: callName || undefined, redeemPoints,
        items: cart.map((c) => ({ menuItemId: c.drink.id, quantity: c.quantity, toppingIds: c.toppingIds, note: c.note || undefined })) };
      const o = await api<Order>("/orders", { method: "POST", body }); setCart([]); onPlaced(o.id);
    } catch (x) { setErr((x as ApiError).message); }
  }
  const editDrink = drinks.find((d) => d.id === editing);
  return (<div><h2>{menu.shop.name} menu</h2>
    {editDrink && <Customizer key={editDrink.id} drink={editDrink} toppings={menu.toppings} initial={cart.find((c) => c.drink.id === editDrink.id)}
      onClose={() => setEditing(null)} onAdd={(c) => { setCart([...cart.filter((x) => x.drink.id !== c.drink.id), c]); setEditing(null); }} />}
    {menu.categories.length === 0 && <p>No drinks available right now.</p>}
    {menu.categories.map((cat) => (<section key={cat.name} className="menu-section"><h3 className="menu-cat">{cat.name}</h3>
      <div className="menu-grid">{cat.items.map((d) => (
        <button key={d.id} className="drink-card" onClick={() => setEditing(d.id)} aria-label={`drink ${d.name}`}>
          <span className="drink-pic"><Cup height={122} drinkKey={d.imageKey} toppings={cart.find((c) => c.drink.id === d.id)?.toppingIds.map((id) => tById.get(id)!.imageKey) ?? []} /></span>
          <span className="drink-name">{d.name}</span><b className="drink-price">{baht(d.priceCents)}</b></button>))}</div></section>))}
    <div className="card"><h3>Cart</h3>{cart.length === 0 && <p>Your cart is empty. Tap a drink.</p>}
      {cart.map((c) => (<div key={c.drink.id}>{c.quantity}× {c.drink.name}{c.toppingIds.length ? ` + ${c.toppingIds.map((id) => tById.get(id)?.name).join(", ")}` : ""} — {baht(lineTotal(c))}{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); setCart(cart.filter((x) => x !== c)); }}>remove</a></div>))}
      <p><label>Name for calling you <input aria-label="call name" maxLength={20} value={callName} onChange={(e) => setCallName(e.target.value)} placeholder="e.g. Mint" /></label></p>
      <p>Estimated subtotal: <b>{baht(estimate)}</b> <small>(the server computes the final price)</small></p>
      {getSession()?.kind === "user" && rewards && <div className="redeem-box"><label><input type="checkbox" aria-label="Use reward points" disabled={rewards.points === 0 || estimate === 0} checked={redeemPoints} onChange={(e) => setRedeemPoints(e.target.checked)} /> Use points ({rewards.points} available)</label><small>100 points = ฿10 off. Discount applies to this order only.</small>{redeemPoints && <p className="redeem-preview">Using {pointsRedeemedPreview} points · discount −{baht(discountPreview)} · total {baht(Math.max(0, estimate - discountPreview))}</p>}</div>}
      <button className="btn" disabled={cart.length === 0} onClick={place}>Place order</button><Err msg={err} /></div></div>);
}

export default function App() {
  const path = window.location.pathname;
  const qrCode = path.startsWith("/t/") ? decodeURIComponent(path.slice(3)) : null;
  const staffPage = path.startsWith("/staff");
  const [tableCode, setTableCode] = useState<string | null>(qrCode ?? sessionStorage.getItem("tableCode"));
  const [shell, setShell] = useState<Shell | null>(null); const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"menu" | "orders" | "login" | { order: string }>(staffPage ? "orders" : "menu");
  const [, rerender] = useState(0); const [err, setErr] = useState(""); const [ready, setReady] = useState(false); const [invalidQr, setInvalidQr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (qrCode) {
          const t = await api<{ shop: { name: string }; table: { label: string } }>(`/tables/${encodeURIComponent(qrCode)}`);
          setShell({ shop: t.shop.name, table: t.table.label });
          // DEF-SE-01: a guest session is bound to the table it was created for. A different table link must not reuse it.
          if (getSession()?.kind === "guest" && sessionStorage.getItem("tableCode") !== qrCode) setSession(null);
          sessionStorage.setItem("tableCode", qrCode);
          if (!getSession()) { const g = await api<{ token: string }>("/guest-sessions", { method: "POST", body: { tableCode: qrCode } }); setSession({ token: g.token, kind: "guest" }); }
        }
        if (getSession()?.kind === "user") {
          try { setUser(await api<User>("/auth/me")); }
          catch (e) {
            // A saved member login that the server no longer accepts: drop it and, on a table link, carry on as a guest.
            if (!(e instanceof ApiError && e.status === 401)) throw e;
            setSession(null);
            if (qrCode) { const g = await api<{ token: string }>("/guest-sessions", { method: "POST", body: { tableCode: qrCode } }); setSession({ token: g.token, kind: "guest" }); }
          }
        }
      } catch (e) {
        // issue #6: a bad or inactive table code is a normal situation, not a crash. No guest session is created for it.
        if (qrCode && e instanceof ApiError && e.status === 404) { setInvalidQr(true); setReady(true); return; }
        if (!(e instanceof ApiError && e.status === 401)) setErr((e as Error).message); setSession(null);
      }
      setReady(true);
    })();
  }, []);

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* already invalid or the request was aborted: still sign out locally */ }
    setSession(null); setUser(null); setView(staffPage ? "orders" : "menu");
    // DEF-SE-02: on a table page, go back to a guest session so the menu and "Member sign in" keep working.
    if (!staffPage && tableCode) {
      try { const g = await api<{ token: string }>("/guest-sessions", { method: "POST", body: { tableCode } }); setSession({ token: g.token, kind: "guest" }); } catch { /* the table link is no longer valid: stay signed out */ }
      rerender((n) => n + 1);
    }
  }
  if (!ready) return <p>Loading…</p>;
  const staff = user?.role === "OPERATOR";
  return (<div className="app">
    <header className="topbar">
      <h1 className="brand"><svg className="brand-logo" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#F2B300" /><path d="M7 8h10l-1.2 9a2 2 0 0 1-2 1.7h-3.6a2 2 0 0 1-2-1.7z" fill="#2f2200" /><path d="M13.5 3.5l1 4" stroke="#2f2200" strokeWidth="1.6" strokeLinecap="round" /></svg><span>{(!staffPage && shell?.shop) || user?.shopName || "Slow Express"}{shell && !staffPage ? <span className="brand-table"> · Table {shell.table}</span> : ""}</span></h1>
      <span className="who">{user ? <>{user.fullName} ({user.role}) <button className="btn ghost" onClick={logout}>Logout</button></> : !staffPage && <button className="btn ghost" onClick={() => setView("login")}>Member sign in</button>}</span></header>
    <Err msg={err} />
    {!staffPage && user?.role === "MEMBER" && <MemberRewards key={typeof view === "object" ? view.order : view} />}
    {invalidQr && <div role="alert" className="card"><h2 style={{ marginTop: 0 }}>This QR code is not valid</h2>
      <p>It may be damaged or switched off. Please ask the staff for help, or scan the code on another table.</p></div>}
    {staffPage && !staff && <Login staff onDone={(u) => { setUser(u); setView("orders"); }} />}
    {staffPage && staff && <Orders staff onOpen={() => {}} />}
    {!staffPage && !invalidQr && !getSession() && <p>Scan a table QR code to start ordering.</p>}
    {!staffPage && !invalidQr && getSession() && <>
      <nav className="tabs"><button className={view === "menu" ? "tab on" : "tab"} aria-current={view === "menu" ? "page" : undefined} onClick={() => setView("menu")}>Menu</button><button className={view === "orders" ? "tab on" : "tab"} aria-current={view === "orders" ? "page" : undefined} onClick={() => setView("orders")}>My orders</button></nav>
      {view === "login" && <Login staff={false} onDone={(u) => { setUser(u); setView("menu"); }} />}
      {view === "menu" && <MenuView tableCode={tableCode} onPlaced={(id) => setView({ order: id })} />}
      {view === "orders" && <Orders staff={false} onOpen={(id) => setView({ order: id })} />}
      {typeof view === "object" && <OrderDetail id={view.order} onBack={() => setView("orders")} />}</>}
  </div>);
}
