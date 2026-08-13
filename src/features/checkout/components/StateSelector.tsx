import { ChevronDown, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { nigerianStates, popularStates } from '@/features/checkout/data/nigerianStates'
import type { CheckoutFormValues } from '@/features/checkout/hooks/checkoutSchema'

type StateSelectorProps = {
  form: UseFormReturn<CheckoutFormValues>
  elevated?: boolean
}

export function StateSelector({ form, elevated = false }: StateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const selectedState = form.watch('state')
  const error = form.formState.errors.state?.message

  const filteredStates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return nigerianStates
    }

    return nigerianStates.filter((state) => state.toLowerCase().includes(normalizedQuery))
  }, [query])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    searchRef.current?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const selectState = (state: string) => {
    form.setValue('state', state, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative grid gap-2" ref={wrapperRef}>
      <input type="hidden" {...form.register('state')} />
      <label className="text-base font-black text-black lg:text-sm">State</label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative h-16 w-full rounded-2xl border bg-white pl-11 pr-12 text-left text-lg font-semibold ${elevated ? 'shadow-[0_20px_34px_rgba(18,104,230,0.16),0_7px_14px_rgba(8,40,82,0.1),inset_0_1px_0_rgba(255,255,255,0.98)]' : 'shadow-[0_10px_22px_rgba(18,104,230,0.09),inset_0_1px_0_rgba(255,255,255,0.98)]'} outline-none transition ${
          error ? 'border-red-400/70' : open ? 'border-[#1268e6]/60 bg-[#f8fbff]' : 'border-[#d8e3f2]'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
        <span className={selectedState ? 'text-black' : 'text-[#7b8da8]'}>{selectedState || 'Select your state'}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-stone-500 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[24px] border border-[#c8dff3] bg-white shadow-[0_24px_80px_rgba(21,75,135,0.25),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
          <div className="border-b border-[#d8e3f2] p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search or type your state"
                className="h-[52px] w-full rounded-2xl border border-[#d8e3f2] bg-[#f8fbff] pl-11 pr-4 text-base font-semibold text-black shadow-[0_8px_18px_rgba(18,104,230,0.08),inset_0_1px_0_rgba(255,255,255,0.98)] outline-none placeholder:text-[#7b8da8] focus:border-[#1268e6]/60"
              />
            </div>
          </div>

          {!query.trim() ? (
            <div className="border-b border-[#d8e3f2] p-3">
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#5a7696]">Popular States</p>
              <div className="flex flex-wrap gap-2">
                {popularStates.map((state) => (
                  <button
                    type="button"
                    key={state}
                    onClick={() => selectState(state)}
                    className="rounded-full border border-[#d8e3f2] bg-[#f8fbff] px-3 py-2 text-xs font-black text-[#365879] transition hover:border-[#16a34a]/40 hover:text-[#168b46]"
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="max-h-64 overflow-y-auto p-2" role="listbox">
            {filteredStates.length > 0 ? (
              filteredStates.map((state) => (
                <button
                  type="button"
                  key={state}
                  onClick={() => selectState(state)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-base font-bold transition ${
                    selectedState === state ? 'bg-[#1268e6] text-white' : 'text-black hover:bg-[#eff7ff]'
                  }`}
                  role="option"
                  aria-selected={selectedState === state}
                >
                  {state}
                </button>
              ))
            ) : (
              <p className="px-4 py-5 text-center text-sm font-semibold text-[#5a7696]">No matching state found.</p>
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
    </div>
  )
}
