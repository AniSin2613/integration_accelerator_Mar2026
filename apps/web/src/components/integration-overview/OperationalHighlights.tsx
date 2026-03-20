import { type HighlightCard } from './types';

interface OperationalHighlightsProps {
  cards: HighlightCard[];
}

const VALUE_TONE: Record<NonNullable<HighlightCard['tone']>, string> = {
  neutral: 'text-text-main',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function OperationalHighlights({ cards }: OperationalHighlightsProps) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[14px] font-semibold text-text-muted">Integration Summary</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const tone = card.tone ?? 'neutral';
          return (
            <article key={card.id} className="rounded-xl border border-border-soft/80 bg-background-light p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{card.label}</p>
              <p className={`mt-1.5 text-[16px] font-semibold leading-tight ${VALUE_TONE[tone]}`}>{card.value}</p>
              {card.supportingText ? (
                <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted/90">{card.supportingText}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
