import { motion } from 'framer-motion'

import { PackageCard } from '@/features/checkout/components/PackageCard'
import type { ProductPackage } from '@/features/landing/data/packages'

type PackageSelectorProps = {
  packages: ProductPackage[]
  selectedPackageId: string
  onSelect: (packageId: string) => void
  compact?: boolean
  elevated?: boolean
  className?: string
}

export function PackageSelector({ packages, selectedPackageId, onSelect, compact = false, elevated = false, className = '' }: PackageSelectorProps) {
  return (
    <motion.div className={`grid gap-4 ${className}`} layout>
      {packages.map((productPackage) => (
        <PackageCard
          compact={compact}
          key={productPackage.id}
          onSelect={onSelect}
          productPackage={productPackage}
          selected={productPackage.id === selectedPackageId}
          elevated={elevated}
        />
      ))}
    </motion.div>
  )
}
