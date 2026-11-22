import { useId } from "react";

const LIQUID: Record<string, string> = {
  "thai-milk-tea": "#e39a52", "taiwan-milk-tea": "#c58a5a", "matcha-latte": "#9bc17a",
  "peach-oolong": "#f4a67c", "lychee-green": "#cfe6a8", americano: "#3b2a20", "mango-sago": "#f7c948", latte: "#d9b38c",
  "brown-sugar-milk-tea": "#a9714b", "taro-milk-tea": "#c9a9d6", "strawberry-green": "#f08aa0", "passion-fruit": "#f2b632",
  cappuccino: "#b98a63", "iced-mocha": "#6b4a3a",
};

const BODY = "M24 46 L116 46 L106 198 Q105 208 95 208 L45 208 Q35 208 34 198 Z";
const STRAW = "#E8A200";

/** Cup picture: a lidded boba cup, the drink colour plus one layer per topping. The picture changes as toppings are dropped in.
 *  `height` sizes the picture by layout (no CSS transform), so small menu cards never overlap the text below. */
export default function Cup({ drinkKey, toppings, height = 220 }: { drinkKey: string; toppings: string[]; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const has = (k: string) => toppings.includes(k);
  const foam = has("cream-cheese");
  const top = foam ? 72 : 56; // where the drink surface starts
  const dy = foam ? 14 : 0;
  return (
    <svg viewBox="0 0 140 220" width={Math.round((height * 140) / 220)} height={height} role="img" aria-label={`cup ${drinkKey} with ${toppings.join(", ") || "no toppings"}`} data-toppings={toppings.join(",")}>
      <defs>
        <clipPath id={`${uid}-clip`}><path d={BODY} /></clipPath>
        <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.38" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.16" /></linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0.95" /><stop offset="0.5" stopColor="#f2f8f5" stopOpacity="0.7" /><stop offset="1" stopColor="#e6efe9" stopOpacity="0.95" /></linearGradient>
        <radialGradient id={`${uid}-ground`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#B07A00" stopOpacity="0.22" /><stop offset="1" stopColor="#0B7A46" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="70" cy="212" rx="44" ry="6" fill={`url(#${uid}-ground)`} />
      {/* straw goes behind the glass and out through the lid */}
      <line x1="92" y1="2" x2="84" y2="120" stroke={STRAW} strokeWidth="7" strokeLinecap="round" />
      <line x1="92" y1="2" x2="84" y2="120" stroke="#fff" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" opacity="0.7" />
      <path d={BODY} fill={`url(#${uid}-glass)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="10" y={top} width="120" height="170" fill={LIQUID[drinkKey] ?? "#d9b38c"} data-testid="liquid" />
        <rect x="10" y={top} width="120" height="170" fill={`url(#${uid}-shade)`} />
        {/* ice */}
        <g fill="#fff" fillOpacity="0.28" stroke="#fff" strokeOpacity="0.6" strokeWidth="1">
          <rect x="30" y={64 + dy} width="22" height="22" rx="6" transform={`rotate(-12 41 ${75 + dy})`} />
          <rect x="86" y={68 + dy} width="20" height="20" rx="6" transform={`rotate(10 96 ${78 + dy})`} />
          <rect x="58" y={88 + dy} width="18" height="18" rx="5" transform={`rotate(-6 67 ${97 + dy})`} />
        </g>
        {foam && (
          <g data-testid="layer-cream-cheese">
            <path d="M10 46 L130 46 L130 70 Q112 84 94 70 Q76 84 58 70 Q40 84 22 70 L10 70 Z" fill="#fffaf0" stroke="#efe0c0" strokeWidth="1.2" />
            <path d="M28 58 Q48 51 70 58 T112 58" fill="none" stroke="#f0e2c6" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )}
        {has("boba") && (
          <g data-testid="layer-boba">
            {[[48, 196], [63, 196], [78, 196], [93, 196], [55, 182], [70, 182], [85, 182], [62, 168], [78, 168]].map(([x, y], i) => (
              <g key={i}><circle cx={x} cy={y} r="7" fill="#2b1b17" /><circle cx={x - 2.4} cy={y - 2.6} r="2" fill="#fff" fillOpacity="0.5" /></g>
            ))}
          </g>
        )}
        {has("strawberry") && (
          <g data-testid="layer-strawberry">
            {[[52, 120, -14], [86, 134, 12], [66, 158, -4]].map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
                <path d="M0 -10 C8 -14 16 -8 12 2 C10 8 4 14 0 17 C-4 14 -10 8 -12 2 C-16 -8 -8 -14 0 -10 Z" fill="#e0334c" stroke="#b7203a" strokeWidth="1" />
                <path d="M0 -6 C5 -8 9 -4 7 1 C5 5 2 8 0 10 C-2 8 -5 5 -7 1 C-9 -4 -5 -8 0 -6 Z" fill="#ff7388" fillOpacity="0.6" />
                {[[-3, -1], [3, 0], [0, 5]].map(([sx, sy], k) => <ellipse key={k} cx={sx} cy={sy} rx="0.9" ry="1.5" fill="#ffd9de" />)}
              </g>
            ))}
          </g>
        )}
        {has("aloe") && (
          <g data-testid="layer-aloe">
            {[[46, 182], [62, 188], [78, 182], [92, 186], [54, 166], [72, 168], [88, 164]].map(([x, y], i) => (
              <g key={i}><rect x={x} y={y} width="14" height="14" rx="3" fill="#bfe8b6" fillOpacity="0.92" stroke="#86c27c" /><rect x={x + 3} y={y + 3} width="5" height="5" rx="1.5" fill="#fff" fillOpacity="0.4" /></g>
            ))}
          </g>
        )}
        {has("lychee-jelly") && (
          <g data-testid="layer-lychee">
            {[[48, 104], [76, 120], [88, 98], [60, 140]].map(([x, y], i) => (
              <g key={i}><rect x={x} y={y} width="15" height="15" rx="4" fill="#fff6f3" fillOpacity="0.92" stroke="#e4d2cb" /><path d={`M${x + 3} ${y + 5} Q${x + 3} ${y + 3} ${x + 6} ${y + 3}`} stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" /></g>
            ))}
          </g>
        )}
        {has("whipped") && (
          <g data-testid="layer-whipped">
            <path d="M10 46 L130 46 L130 64 Q113 76 96 64 Q79 76 62 64 Q45 76 28 64 L10 64 Z" fill="#ffffff" stroke="#e1e8e4" strokeWidth="1.2" />
            <path d="M26 58 Q40 52 54 58 T84 58 T114 58" fill="none" stroke="#6b3f2a" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="70" cy="54" r="7" fill="#d62839" /><circle cx="67.5" cy="51.5" r="2" fill="#fff" fillOpacity="0.55" />
          </g>
        )}
        {/* glass shine */}
        <path d="M30 54 L42 54 L39 192 L36 192 Z" fill="#fff" fillOpacity="0.38" />
        <path d="M104 58 L108 58 L103 150 L100 150 Z" fill="#fff" fillOpacity="0.22" />
      </g>
      <path d={BODY} fill="none" stroke="#9db2a8" strokeWidth="2.5" strokeLinejoin="round" />
      {/* lid */}
      <path d="M20 44 Q20 18 70 16 Q120 18 120 44 Z" fill="#fff" fillOpacity="0.5" stroke="#9db2a8" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M34 36 Q38 24 56 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="16" y="40" width="108" height="10" rx="5" fill="#e2ece6" stroke="#9db2a8" strokeWidth="2" />
      <line x1="92" y1="2" x2="90" y2="32" stroke={STRAW} strokeWidth="7" strokeLinecap="round" />
      <line x1="92" y1="2" x2="90" y2="32" stroke="#fff" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Small picture of each topping for the topping buttons. */
export function ToppingIcon({ imageKey }: { imageKey: string }) {
  const svg = (children: React.ReactNode) => <svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">{children}</svg>;
  switch (imageKey) {
    case "cream-cheese":
      return svg(<g stroke="#e8d7b4" strokeWidth="1.2"><ellipse cx="20" cy="28" rx="15" ry="8" fill="#fffaf0" /><ellipse cx="20" cy="21" rx="11" ry="7" fill="#fffaf0" /><path d="M13 16 Q20 3 27 16 Q20 20 13 16Z" fill="#fffaf0" /></g>);
    case "boba":
      return svg(<>{[[13, 27], [27, 27], [20, 15]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="7.5" fill="#2b1b17" /><circle cx={x - 2.5} cy={y - 2.8} r="2.2" fill="#fff" fillOpacity="0.5" /></g>)}</>);
    case "strawberry":
      return svg(<g transform="translate(20 23) scale(1.25)"><path d="M0 -10 C8 -14 16 -8 12 2 C10 8 4 14 0 17 C-4 14 -10 8 -12 2 C-16 -8 -8 -14 0 -10 Z" fill="#e0334c" stroke="#b7203a" /><path d="M-5 -11 L0 -17 L5 -11 Q0 -8 -5 -11Z" fill="#3a9a52" />{[[-4, -1], [4, 0], [0, 6], [-2, 10]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="0.9" ry="1.5" fill="#ffd9de" />)}</g>);
    case "lychee-jelly":
      return svg(<g fill="#fff6f3" stroke="#dcc8c0" strokeWidth="1.2"><rect x="6" y="19" width="15" height="15" rx="4" /><rect x="19" y="8" width="15" height="15" rx="4" /><path d="M9 24 Q9 22 12 22M22 13 Q22 11 25 11" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></g>);
    case "aloe":
      return svg(<g fill="#bfe8b6" stroke="#86c27c" strokeWidth="1.2"><rect x="6" y="20" width="14" height="14" rx="3" /><rect x="20" y="22" width="14" height="14" rx="3" /><rect x="13" y="7" width="14" height="14" rx="3" /><rect x="16" y="10" width="5" height="5" rx="1.5" fill="#fff" fillOpacity="0.5" stroke="none" /></g>);
    case "whipped":
      return svg(<g stroke="#dfe6e2" strokeWidth="1.2"><ellipse cx="20" cy="29" rx="14" ry="7" fill="#fff" /><ellipse cx="20" cy="22" rx="10" ry="6" fill="#fff" /><path d="M14 17 Q20 8 26 17 Q20 20 14 17Z" fill="#fff" /><circle cx="20" cy="9" r="4.2" fill="#d62839" stroke="none" /></g>);
    default:
      return svg(<circle cx="20" cy="20" r="16" fill="#ddd" stroke="#9aa5a0" strokeWidth="2" />);
  }
}
