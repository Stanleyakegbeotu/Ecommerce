import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function Button({ children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      className={`relative inline-flex min-h-14 items-center justify-center overflow-visible rounded-full border-2 border-ink-950/35 bg-linear-to-br from-[#4d96ff] to-gold-600 px-11 text-[0.72rem] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.42),inset_0_-4px_0_rgba(0,0,0,0.22),0_0_0_3px_rgba(18,104,230,0.28),0_10px_28px_rgba(18,104,230,0.3)] outline outline-1 outline-offset-4 outline-gold-500/40 transition hover:-translate-y-0.5 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.48),inset_0_-4px_0_rgba(0,0,0,0.24),0_0_0_4px_rgba(18,104,230,0.34),0_16px_38px_rgba(18,104,230,0.38)] focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-4 focus:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
