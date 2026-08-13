type RatingStarsProps = {
  rating: number
  reviewCount: string
}

export function RatingStars({ rating, reviewCount }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-4" aria-label={`${rating} out of 5 stars from ${reviewCount} reviews`}>
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <svg
            key={index}
            className="size-3.5 fill-[#16a34a] drop-shadow-[0_2px_2px_rgba(12,74,47,0.45)]"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-xs tracking-[0.04em] text-stone-500">
        {rating} / 5 - {reviewCount} verified results
      </span>
    </div>
  )
}
