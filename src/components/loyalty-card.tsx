import Image from "next/image";
import { Crown, PawPrint, Star } from "lucide-react";
import type { CSSProperties } from "react";

function patternStyle(patternKey?: string, patternUrl?: string): CSSProperties {
  if (patternUrl) return { backgroundImage: `url(${patternUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  const svg = (symbol: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><text x='10' y='38' font-size='24' fill='white' fill-opacity='.22'>${symbol}</text></svg>`)}")`;
  if (patternKey === "hearts") return { backgroundImage: svg("♡") };
  if (patternKey === "stars") return { backgroundImage: svg("✦") };
  if (patternKey === "fish") return { backgroundImage: svg("𓆝") };
  if (patternKey === "bubbles") return { backgroundImage: "radial-gradient(circle at 18px 18px,rgba(255,255,255,.25) 0 7px,transparent 8px),radial-gradient(circle at 48px 48px,rgba(255,255,255,.18) 0 10px,transparent 11px)", backgroundSize: "68px 68px" };
  return { backgroundImage: "radial-gradient(circle at 18px 18px,rgba(255,255,255,.22) 0 6px,transparent 7px),radial-gradient(circle at 11px 8px,rgba(255,255,255,.2) 0 3px,transparent 4px),radial-gradient(circle at 25px 8px,rgba(255,255,255,.2) 0 3px,transparent 4px)", backgroundSize: "76px 76px" };
}

export function LoyaltyCard({ color = "#ff6b7a", secondaryColor = "#ffd189", points = 0, rank = "Member", nextRank = "Silver", nextAt = 1000, memberName, mascotUrl = "/assets/mascots/tammy-cat.png", patternKey = "paws", patternUrl }: { color?: string; secondaryColor?: string; points?: number; rank?: string; nextRank?: string; nextAt?: number; memberName?: string; mascotUrl?: string; patternKey?: string; patternUrl?: string | null }) {
  const progress = Math.min(100, Math.max(0, points / Math.max(nextAt, 1) * 100));
  return <div className="loyalty-card" style={{ background: `linear-gradient(115deg,${color},${secondaryColor})` }}><div aria-hidden className="pointer-events-none absolute inset-0 opacity-80" style={patternStyle(patternKey, patternUrl ?? undefined)} />
    <PawPrint aria-hidden className="absolute right-4 top-4 opacity-20" size={44} />
    <div className="card-copy"><div className="mb-5 flex items-center gap-2 text-xs font-bold"><PawPrint size={22} /> TAMMY LOYALTY</div><p className="flex items-center gap-1 text-xs"><Star size={14} /> แต้มสะสมของคุณ</p><p className="mt-1 text-[38px] font-bold leading-tight">{points.toLocaleString()} <span className="text-sm">แต้ม</span></p><p className="mt-4 flex items-center gap-2 text-sm"><Crown size={18} /><span className="rounded-full bg-white/85 px-3 py-1 text-amber-900">{rank}</span></p>{memberName && <p className="mt-3 text-sm font-semibold">{memberName}</p>}</div>
    <Image unoptimized src={mascotUrl} alt="มาสคอตร้าน" width={180} height={180} className="card-mascot" />
    <div className="card-progress"><div className="mb-2 flex justify-between gap-2 text-[11px]"><span>สู่ระดับ {nextRank}</span><span>{points.toLocaleString()} / {nextAt.toLocaleString()}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/60"><div className="h-full rounded-full bg-amber-300" style={{ width: `${progress}%` }} /></div></div>
  </div>;
}
