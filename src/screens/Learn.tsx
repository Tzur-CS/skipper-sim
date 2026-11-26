import { useApp, useLang, useT, type LearnTopic } from '../store/appStore';
import { BOAT_PARTS, HOW_TO, LICENCE, LINKS, MANOEUVRES, POINTS, type Section } from '../content/learn';

/** Info pages: about the licence, sailing terms, useful links. Scrolls in portrait and landscape. */
export function Learn() {
  const t = useT();
  const topic = useApp((s) => s.learnTopic);
  const openLearn = useApp((s) => s.openLearn);
  const go = useApp((s) => s.go);
  const tabs: Array<{ id: LearnTopic; label: string }> = [
    { id: 'licence', label: t('topicLicence') },
    { id: 'terms', label: t('topicTerms') },
    { id: 'links', label: t('topicLinks') },
  ];
  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-sea-800 to-sea-950 safe-t safe-b safe-l safe-r" data-testid="learn">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 sticky top-0 z-10 -mx-4 px-4 py-2 bg-sea-900/90 backdrop-blur">
          <button className="btn min-w-[44px]" data-testid="learn-back" onClick={() => go('home')}>
            {t('back')}
          </button>
          <div className="flex gap-1 overflow-x-auto flex-1">
            {tabs.map((x) => (
              <button key={x.id} className={`btn text-sm whitespace-nowrap ${topic === x.id ? 'btn-primary' : ''}`} data-testid={`learn-tab-${x.id}`} onClick={() => openLearn(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        {topic === 'licence' && <Licence />}
        {topic === 'terms' && <Terms />}
        {topic === 'links' && <Links />}
        <p className="text-[11px] text-amber-200/90 glass rounded-lg p-2">⚠ {t('contentReview')}</p>
      </div>
    </div>
  );
}

function SectionCard({ s }: { s: Section }) {
  const lang = useLang();
  return (
    <section className="glass rounded-xl p-3">
      <h2 className="font-bold text-lg mb-1">{s.title[lang]}</h2>
      {s.items && (
        <ol className="list-decimal ps-5 text-[15px] leading-relaxed flex flex-col gap-0.5 mb-1">
          {s.items.map((it, i) => (
            <li key={i}>{it[lang]}</li>
          ))}
        </ol>
      )}
      {s.body && <p className="text-[15px] leading-relaxed text-slate-200">{s.body[lang]}</p>}
    </section>
  );
}

function OfficialLink() {
  const lang = useLang();
  const t = useT();
  const l = LINKS[0];
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-3 flex items-center gap-3 border-sky-400/40 active:bg-white/10">
      <span className="text-2xl">🏛️</span>
      <span className="flex-1">
        <span className="block font-bold">{l.title[lang]}</span>
        <span className="block text-xs text-slate-300">{l.desc[lang]}</span>
      </span>
      <span className="btn btn-primary text-sm">{t('openSite')} ↗</span>
    </a>
  );
}

function Licence() {
  const t = useT();
  const lang = useLang();
  return (
    <>
      <SectionCard s={LICENCE[0]} />
      <OfficialLink />
      {LICENCE.slice(1).map((s, i) => (
        <SectionCard key={i} s={s} />
      ))}
      <section className="glass rounded-xl p-3">
        <h2 className="font-bold text-lg mb-1">{t('howToUse')}</h2>
        <ul className="list-disc ps-5 text-[15px] leading-relaxed flex flex-col gap-0.5">
          {HOW_TO.map((x, i) => (
            <li key={i}>{x[lang]}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Points-of-sail wheel drawn from the simulator's own angle ranges (wind from the top). */
function PointsDiagram() {
  const t = useT();
  const R = 92;
  const arc = (a0: number, a1: number, side: 1 | -1) => {
    const p = (a: number) => {
      const r = (a * Math.PI) / 180;
      return `${(Math.sin(r) * R * side).toFixed(1)},${(-Math.cos(r) * R).toFixed(1)}`;
    };
    return `M0,0 L${p(a0)} A${R},${R} 0 0 ${side > 0 ? 1 : 0} ${p(a1)} Z`;
  };
  return (
    <svg viewBox="-150 -118 300 228" className="w-full max-w-md mx-auto" style={{ direction: "ltr" }} role="img" aria-label={t('pointOfSail')}>
      {POINTS.map((p) => (
        <g key={p.id}>
          <path d={arc(p.from, p.to, 1)} fill={p.color} opacity="0.55" />
          <path d={arc(p.from, p.to, -1)} fill={p.color} opacity="0.55" />
        </g>
      ))}
      {POINTS.map((p) => {
        const mid = ((p.from + p.to) / 2) * (Math.PI / 180);
        const r = R + 14;
        const x = Math.sin(mid) * r;
        const y = -Math.cos(mid) * r;
        return (
          <text key={p.id} x={x} y={y + 4} fontSize="10.5" fill="#e6edf3" textAnchor="start" fontWeight="700">
            {t(`pos.${p.id}`)}
          </text>
        );
      })}
      <path d="M0,-22 C7,-10 7,12 5,20 L-5,20 C-7,12 -7,-10 0,-22 Z" fill="#f3f5f7" stroke="#0b1d2e" />
      <g stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round">
        <line x1="0" y1="-116" x2="0" y2="-100" />
        <path d="M-6,-106 L0,-98 L6,-106" fill="none" />
      </g>
      <text x="-9" y="-104" fontSize="10" fill="#7dd3fc" textAnchor="end">{t('trueWind')}</text>
    </svg>
  );
}

function Terms() {
  const t = useT();
  const lang = useLang();
  return (
    <>
      <section className="glass rounded-xl p-3">
        <h2 className="font-bold text-lg mb-2">{t('pointOfSail')}</h2>
        <PointsDiagram />
        <ul className="flex flex-col gap-1.5 mt-2">
          {POINTS.map((p) => (
            <li key={p.id} className="flex gap-2 text-[14.5px] leading-snug">
              <span className="w-3 h-3 rounded-sm mt-1.5 shrink-0" style={{ background: p.color }} />
              <span>
                <b>{t(`pos.${p.id}`)}</b> <span className="text-slate-400 tnum" dir="ltr">({p.from}°–{Math.round(p.to)}°)</span> – {p.def[lang]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {MANOEUVRES.map((s, i) => (
        <SectionCard key={i} s={s} />
      ))}
      <section className="glass rounded-xl p-3">
        <h2 className="font-bold text-lg mb-2">{lang === 'he' ? 'חלקי הסירה' : 'Parts of the boat'}</h2>
        <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
          {BOAT_PARTS.map((p, i) => (
            <div key={i} className="text-[14.5px] leading-snug">
              <dt className="font-bold text-sky-200">{p.term[lang]}</dt>
              <dd className="text-slate-200">{p.def[lang]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function Links() {
  const lang = useLang();
  const t = useT();
  return (
    <div className="flex flex-col gap-2" data-testid="links">
      {LINKS.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-3 flex items-start gap-3 active:bg-white/10">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-200 whitespace-nowrap mt-0.5">{l.tag[lang]}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold">{l.title[lang]}</span>
            <span className="block text-sm text-slate-300 leading-snug">{l.desc[lang]}</span>
            <span className="block text-[11px] text-slate-500 truncate mt-0.5" dir="ltr">{l.url}</span>
          </span>
          <span className="text-sky-300 font-bold">{t('openSite')} ↗</span>
        </a>
      ))}
    </div>
  );
}
