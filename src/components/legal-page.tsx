import { ENTITY, type LegalContent } from "@/lib/legal-content";

/** `**bold**` -> <strong>, the same convention as the VaraaAi legal pages. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

export function LegalPage({ c }: { c: LegalContent }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{c.title}</h1>
      <p className="mt-1 text-sm text-mist">{c.updated}</p>
      <div className="mt-8 space-y-8">
        {c.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold">{s.title}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-white/85"><Rich text={p} /></p>
            ))}
          </section>
        ))}
      </div>
      <dl className="mt-10 rounded-2xl bg-ink-2 p-4 text-sm">
        <div className="flex flex-wrap gap-x-2"><dt className="text-mist">{ENTITY.name} ·</dt></div>
        <div className="mt-1 flex flex-wrap gap-x-2"><dt className="text-mist">{c.businessIdLabel}:</dt><dd>{ENTITY.businessId}</dd></div>
        <div className="mt-1 flex flex-wrap gap-x-2"><dt className="text-mist">{c.addressLabel}:</dt><dd>{ENTITY.address}</dd></div>
        <div className="mt-1 flex flex-wrap gap-x-2"><dt className="text-mist">Email:</dt><dd><a href={`mailto:${ENTITY.email}`} className="text-glow hover:underline">{ENTITY.email}</a></dd></div>
      </dl>
    </article>
  );
}
