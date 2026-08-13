type LoadingStateProps = {
  label?: string
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <SkeletonBlock className={`h-4 rounded-full ${className}`} />
}

export function LoadingState({ label = 'Loading page content' }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-stone-100" role="status" aria-live="polite" aria-label={label}>
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-5 pb-16 pt-24 md:grid-cols-[0.95fr_1.05fr] md:items-center md:px-8 lg:px-10">
        <div className="order-2 grid gap-5 md:order-1">
          <SkeletonLine className="w-36 bg-white/10" />
          <SkeletonBlock className="h-16 w-full max-w-xl rounded-3xl md:h-24" />
          <SkeletonBlock className="h-12 w-4/5 rounded-3xl md:h-16" />
          <div className="grid gap-3 pt-2">
            <SkeletonLine className="w-full max-w-lg" />
            <SkeletonLine className="w-11/12 max-w-md" />
            <SkeletonLine className="w-9/12 max-w-sm" />
          </div>
          <SkeletonBlock className="mt-3 h-14 w-56 rounded-full" />
        </div>
        <div className="order-1 md:order-2">
          <SkeletonBlock className="mx-auto aspect-[4/5] w-full max-w-[520px] rounded-[36px] md:rounded-[44px]" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock className="h-28 rounded-3xl" key={index} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-5" key={index}>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="size-12 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="w-1/2" />
                </div>
              </div>
              <SkeletonLine className="mt-5 w-32" />
              <SkeletonLine className="mt-4 w-full" />
              <SkeletonLine className="mt-2 w-10/12" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock className="h-36 rounded-[28px]" key={index} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden px-5 py-12 md:px-8 lg:px-10">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 md:hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonBlock className={`rounded-[22px] ${index % 3 === 0 ? 'h-52' : 'h-40'}`} key={index} />
          ))}
        </div>
        <div className="mx-auto hidden max-w-7xl -rotate-2 grid-cols-5 gap-5 md:grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock className={`rounded-[32px] ${index % 2 === 0 ? 'h-80 translate-y-8' : 'h-72 -translate-y-4'}`} key={index} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 lg:px-10">
        <div className="grid gap-6 rounded-[36px] border border-white/10 bg-white/[0.035] p-5 lg:grid-cols-[1fr_430px] lg:p-8">
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock className="h-16 rounded-2xl" key={index} />
            ))}
            <SkeletonBlock className="h-32 rounded-2xl" />
            <SkeletonBlock className="h-14 rounded-full" />
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock className="h-40 rounded-[28px]" key={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock className="h-16 rounded-2xl" key={index} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="grid gap-3" key={index}>
              <SkeletonLine className="w-32" />
              <SkeletonLine className="w-44" />
              <SkeletonLine className="w-36" />
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
