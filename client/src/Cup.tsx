const LIQUID: Record<string, string> = {
  "thai-milk-tea": "#e39a52", "taiwan-milk-tea": "#c58a5a", "matcha-latte": "#9bc17a",
  "peach-oolong": "#f4a67c", "lychee-green": "#cfe6a8", americano: "#3b2a20", "mango-sago": "#f7c948", latte: "#d9b38c",
};

/** Cup picture: the drink colour plus one layer per topping. The picture changes as toppings are dropped in. */
export default function Cup({ drinkKey, toppings }: { drinkKey: string; toppings: string[] }) {
  const has = (k: string) => toppings.includes(k);
  return (
    <svg viewBox="0 0 140 220" width="140" height="220" role="img" aria-label={`cup ${drinkKey} with ${toppings.join(", ") || "no toppings"}`} data-toppings={toppings.join(",")}>
      <defs><clipPath id="cupclip"><path d="M22 40 L118 40 L106 200 Q105 208 96 208 L44 208 Q35 208 34 200 Z" /></clipPath></defs>
      <path d="M22 40 L118 40 L106 200 Q105 208 96 208 L44 208 Q35 208 34 200 Z" fill="#f5f7f6" stroke="#9aa5a0" strokeWidth="3" />
      <g clipPath="url(#cupclip)">
        <rect x="10" y={has("cream-cheese") ? 68 : 52} width="120" height="160" fill={LIQUID[drinkKey] ?? "#d9b38c"} data-testid="liquid" />
        {has("cream-cheese") && (
          <g data-testid="layer-cream-cheese">
            <rect x="10" y="40" width="120" height="30" fill="#fffaf0" />
            <path d="M22 66 Q40 78 58 66 T94 66 T130 66 L130 52 L10 52 Z" fill="#fffaf0" />
          </g>
        )}
        {has("boba") && <g data-testid="layer-boba" fill="#2b1b17">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={46 + (i % 4) * 16} cy={192 - Math.floor(i / 4) * 14} r="6.5" />)}</g>}
        {has("strawberry") && <g data-testid="layer-strawberry" fill="#e0334c">{[[56, 110], [84, 130], [66, 150]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q8 -4 10 6 q-4 12 -10 14 q-6 -2 -10 -14 q2 -10 10 -6z`} />)}</g>}
        {has("lychee-jelly") && <g data-testid="layer-lychee" fill="#fdfdfb" fillOpacity="0.85" stroke="#d6d9d0">{[[50, 100], [76, 118], [90, 96], [62, 138]].map(([x, y], i) => <rect key={i} x={x} y={y} width="14" height="14" rx="3" />)}</g>}
      </g>
      <rect x="16" y="32" width="108" height="10" rx="4" fill="#dfe6e2" stroke="#9aa5a0" strokeWidth="2" />
      <line x1="84" y1="6" x2="98" y2="34" stroke="#0B7A46" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function ToppingIcon({ imageKey }: { imageKey: string }) {
  const c: Record<string, string> = { "cream-cheese": "#fffaf0", boba: "#2b1b17", strawberry: "#e0334c", "lychee-jelly": "#f4f4ee", aloe: "#b9e0b0", whipped: "#ffffff" };
  return <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill={c[imageKey] ?? "#ddd"} stroke="#9aa5a0" strokeWidth="2" /></svg>;
}
