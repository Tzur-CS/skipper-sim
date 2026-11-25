import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { SIM } from '../../simulation/config';

/** Boat-up compass with true wind (blue), apparent wind (yellow) and the no-go sector. */
export function Compass() {
  const t = useT();
  const h = useHud();
  const R = 52;
  const rot = -h.heading;
  const tw = h.twa; // relative to bow
  const aw = h.awa;
  const arrow = (ang: number, color: string, len: number, w: number) => {
    const a = (ang * Math.PI) / 180;
    const x = Math.sin(a) * len;
    const y = -Math.cos(a) * len;
    return (
      <g>
        <line x1={x} y1={y} x2={x * 0.35} y2={y * 0.35} stroke={color} strokeWidth={w} strokeLinecap="round" />
        <circle cx={x * 0.35} cy={y * 0.35} r={w * 0.9} fill={color} />
      </g>
    );
  };
  const ng = SIM.noGoAngle;
  const sector = (() => {
    const a0 = ((tw - ng) * Math.PI) / 180;
    const a1 = ((tw + ng) * Math.PI) / 180;
    const r = R - 6;
    return `M0,0 L${Math.sin(a0) * r},${-Math.cos(a0) * r} A${r},${r} 0 0 1 ${Math.sin(a1) * r},${-Math.cos(a1) * r} Z`;
  })();
  return (
    <div className="glass rounded-full p-1 relative" style={{ width: 100, height: 100 }} data-testid="compass" dir="ltr">
      <svg viewBox="-64 -64 128 128" width="92" height="92">
        <circle r={R + 8} fill="rgba(4,14,24,0.55)" />
        <path d={sector} fill="rgba(255,77,79,0.28)" />
        <g transform={`rotate(${rot})`}>
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1={0} y1={-R - 6} x2={0} y2={-R - (i % 9 === 0 ? 0 : 3)} stroke="#cbd5e1" strokeWidth={i % 9 === 0 ? 2 : 1} transform={`rotate(${i * 10})`} />
          ))}
          {['N', 'E', 'S', 'W'].map((c, i) => (
            <text key={c} x={0} y={-R + 8} fill={c === 'N' ? '#f87171' : '#e2e8f0'} fontSize="10" fontWeight="700" textAnchor="middle" transform={`rotate(${i * 90})`}>
              {c}
            </text>
          ))}
        </g>
        {/* boat */}
        <path d="M0,-20 C7,-8 7,10 5,18 L-5,18 C-7,10 -7,-8 0,-20 Z" fill="#e2e8f0" stroke="#0b1d2e" />
        {arrow(tw, '#60a5fa', R - 2, 3.2)}
        {arrow(aw, '#facc15', R - 14, 2.6)}
      </svg>
      <div className="absolute -bottom-3.5 inset-x-0 flex justify-center gap-1.5 text-[8px] whitespace-nowrap font-semibold">
        <span className="text-sky-400">● {t('trueWind')}</span>
        <span className="text-yellow-300">● {t('apparentWind')}</span>
      </div>
    </div>
  );
}
