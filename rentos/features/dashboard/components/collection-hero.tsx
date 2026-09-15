import { formatCurrency } from "@/lib/utils/format";

/**
 * The rent collection hero.
 *
 * The prototype leads the dashboard with one dark panel rather than a row
 * of small equal-weight stat cards, because collection is the number the
 * business turns on. Everything else on the page is secondary to it, and a
 * grid of four identical cards says the opposite.
 *
 * The sparkline to the right exists so the figure is never read alone. 79%
 * is unremarkable on its own and alarming after three months at 94%, and
 * only the trend tells you which you are looking at.
 */
export function CollectionHero({
  monthLabel,
  collected,
  due,
  outstanding,
  behindCount,
  trend,
}: {
  monthLabel: string;
  collected: number;
  due: number;
  outstanding: number;
  /** Tenancies with something overdue. */
  behindCount: number;
  /** Oldest first. Each point is one month's collection rate, 0 to 100. */
  trend: { label: string; rate: number }[];
}) {
  const pct = due > 0 ? Math.round((collected / due) * 100) : 0;

  // The sparkline is plotted by hand rather than pulled from a chart
  // library: it is six points in a fixed 250x74 box and needs no axes,
  // ticks or tooltips, all of which a library would bring with it.
  const W = 250, H = 74, PAD_X = 10, TOP = 14, BOT = 62;
  const points = trend.map((t, i) => {
    const x = trend.length > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (trend.length - 1) : W / 2;
    const y = BOT - ((Math.max(0, Math.min(100, t.rate)) / 100) * (BOT - TOP));
    return { x, y, ...t };
  });
  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;

  return (
    <div className="mb-5 grid overflow-hidden rounded-[18px] bg-neutral-900 text-neutral-50 lg:grid-cols-[1fr_290px]">
      <div className="px-[26px] py-6">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8B7F7C]">
          Rent collection, {monthLabel}
        </p>

        <p className="my-[10px] mb-[3px] font-display text-[clamp(32px,4.2vw,44px)] font-extrabold leading-[1.02] tabular-nums tracking-[-0.048em] [font-stretch:106%]">
          {formatCurrency(collected)}
        </p>
        <p className="text-[13.5px] text-on-ink">collected of {formatCurrency(due)} due</p>

        <div className="my-[18px] mb-3 h-[7px] max-w-[420px] overflow-hidden rounded-full bg-white/[0.14]">
          <div
            className="h-full rounded-full bg-lime transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-[22px] text-[12.5px] text-[#8B7F7C]">
          <span><b className="text-neutral-50">{pct}%</b> collected</span>
          <span><b className="text-neutral-50">{formatCurrency(outstanding)}</b> outstanding</span>
          <span>
            <b className="text-neutral-50">{behindCount}</b>{" "}
            {behindCount === 1 ? "tenancy" : "tenancies"} behind
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-center border-t border-white/[0.09] bg-white/[0.045] px-6 py-[22px] lg:border-l lg:border-t-0">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8B7F7C]">
          Collection rate, six months
        </p>

        {points.length === 0 ? (
          <p className="text-[11.5px] text-[#8B7F7C]">No history yet.</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-[74px] w-full" role="img"
                 aria-label={`Collection rate over ${points.length} months`}>
              <defs>
                <linearGradient id="collection-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6F24E" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M${line} L${last.x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`}
                    fill="url(#collection-fill)" />
              <path d={`M${line}`} fill="none" stroke="#C6F24E" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={last.x} cy={last.y} r="3.5" fill="#C6F24E" />
            </svg>

            <div className="mt-1.5 flex justify-between text-[10px] text-[#6E625F]">
              {points.map((p, i) => (
                <span key={p.label} className={i === points.length - 1 ? "text-lime" : undefined}>
                  {p.label}
                </span>
              ))}
            </div>

            <p className="mt-2.5 text-[11.5px] leading-[1.4] text-[#8B7F7C]">
              {last.rate}% this month
              {prev && prev.rate !== last.rate && (
                <>, {last.rate < prev.rate ? "down" : "up"} from {prev.rate}%</>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
