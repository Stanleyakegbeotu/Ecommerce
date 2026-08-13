import { ShieldAlert } from 'lucide-react'

export function DisclaimerSection() {
  return (
    <section className="solar-panel-surface solar-panel-surface--bottom-right bg-[#050505] px-4 py-8 text-stone-400 sm:px-6 lg:px-8" aria-label="Legal disclaimer">
      <div className="mx-auto flex max-w-7xl gap-4 rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-500">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium leading-7">
          This website is independently operated and is not affiliated with or endorsed by Meta Platforms, Inc.,
          Facebook, or Instagram. Individual results may vary. Use the product according to the instructions provided.
        </p>
      </div>
    </section>
  )
}
