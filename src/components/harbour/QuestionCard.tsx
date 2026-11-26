import { useEffect, useState } from 'react';
import { useHud } from '../../store/hudStore';
import { useLang, useT } from '../../store/appStore';
import { runtime } from '../../store/runtime';
import type { Question } from '../../training/scenarios/types';

/**
 * Identification question ("what do these lights show?"). Appears when the scenario's condition
 * holds; the answer is logged as a simulation event and scored. Feedback (not in exam mode)
 * explains the correct answer for a few seconds.
 */
export function QuestionCard({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const lang = useLang();
  const qid = useHud((s) => s.question);
  const last = useHud((s) => s.lastAnswer);
  const now = useHud((s) => s.t);
  const ev = runtime.evaluator;
  const [feedback, setFeedback] = useState<{ q: Question; correct: boolean; until: number } | null>(null);
  useEffect(() => {
    if (!last || !ev) return;
    const q = ev.def.questions?.find((x) => x.id === last.q);
    if (q) setFeedback({ q, correct: last.correct, until: last.t + (ev.mode === 'exam' ? 2.5 : 9) });
  }, [last, ev]);
  if (!ev) return null;
  const q = qid ? ev.def.questions?.find((x) => x.id === qid) : undefined;
  const w = compact ? 'w-[min(300px,44vw)]' : 'w-[340px]';
  if (feedback && now < feedback.until) {
    const exam = ev.mode === 'exam';
    return (
      <div className={`glass rounded-xl px-2.5 py-1.5 ${w} ${exam ? '' : feedback.correct ? 'border-emerald-400/60 bg-emerald-950/60' : 'border-red-400/60 bg-red-950/60'}`} data-testid="question-feedback">
        <div className={`text-[12px] font-bold ${exam ? 'text-slate-200' : feedback.correct ? 'text-emerald-300' : 'text-red-300'}`}>
          {exam ? t('answerSaved') : feedback.correct ? `✓ ${t('answerRight')}` : `✗ ${t('answerWrong')}`}
        </div>
        {!exam && (
          <>
            {!feedback.correct && (
              <div className="text-[11px] text-slate-100">
                {t('correctAnswer')}: <b>{feedback.q.options.find((o) => o.id === feedback.q.correct)?.text[lang]}</b>
              </div>
            )}
            <div className="text-[10.5px] leading-snug text-slate-200 mt-0.5">{feedback.q.explanation[lang]}</div>
          </>
        )}
        <button className="btn bs !min-h-[28px] text-[10px] mt-1" onClick={() => setFeedback(null)}>
          {t('close')}
        </button>
      </div>
    );
  }
  if (!q) return null;
  return (
    <div className={`glass rounded-xl px-2.5 py-1.5 ${w} border-sky-400/50`} data-testid="question">
      <div className="text-[11px] font-bold text-sky-300">🔦 {t('identify')}</div>
      <div className={`${compact ? 'text-[11px]' : 'text-[12px]'} leading-snug mb-1`}>{q.prompt[lang]}</div>
      <div className="flex flex-col gap-1">
        {q.options.map((o) => (
          <button key={o.id} className="btn bs !whitespace-normal text-start !min-h-[34px] leading-tight text-[11px]" data-testid={`answer-${o.id}`} onClick={() => ev.answer(q.id, o.id)}>
            {o.text[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
