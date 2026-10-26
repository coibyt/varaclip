"use client";

import { Eye, Hand, HeartHandshake, Palette, Scissors, Smile, Sparkles } from "lucide-react";
import { CATEGORIES, categoryName, type Category, type CategorySlug } from "@/lib/categories";
import { useI18n } from "./locale-provider";

const ICONS = { Scissors, Sparkles, Hand, Smile, Palette, Eye, HeartHandshake } as const;

export function CategoryIcon({ icon, className = "size-5" }: { icon: Category["icon"]; className?: string }) {
  const I = ICONS[icon];
  return <I className={className} aria-hidden />;
}

/** "Choose a category" for a video: the same eight categories as VaraaAi.com. */
export function CategoryPicker({ value, onChange, disabled = false, id = "category" }: { value: CategorySlug | null; onChange: (c: CategorySlug) => void; disabled?: boolean; id?: string }) {
  const { t, locale } = useI18n();
  return (
    <fieldset id={id} disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold">{t("cat.label")}</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATEGORIES.map((c) => {
          const on = value === c.slug;
          return (
            <button
              key={c.slug} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.slug)}
              className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${on ? "border-glow bg-glow/15 text-white" : "border-white/10 bg-ink-2 text-white/85 hover:border-white/30"}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${on ? "bg-glow text-white" : "bg-white/10 text-gold"}`}><CategoryIcon icon={c.icon} className="size-4" /></span>
              <span className="min-w-0 leading-tight">{categoryName(locale, c)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
