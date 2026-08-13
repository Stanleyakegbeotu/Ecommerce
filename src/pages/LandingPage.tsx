import { InlineCheckout } from '@/features/checkout/components/InlineCheckout'
import { AboutProductImage, AboutProductSection, AboutProductVideo } from '@/features/landing/components/AboutProductSection'
import { BenefitsSection } from '@/features/landing/components/BenefitsSection'
import { DisclaimerSection } from '@/features/landing/components/DisclaimerSection'
import { FAQSection } from '@/features/landing/components/FAQSection'
import { GallerySection } from '@/features/landing/components/GallerySection'
import { LandingHero } from '@/features/landing/components/LandingHero'
import { CustomerReviewsSection } from '@/features/landing/components/CustomerReviewsSection'
import { ProductPackages } from '@/features/landing/components/ProductPackages'
import { SeeInActionSection } from '@/features/landing/components/SeeInActionSection'
import { UnderHeroImages } from '@/features/landing/components/UnderHeroImages'

export default function LandingPage() {
  return (
    <>
      <div data-resume-section="hero"><LandingHero /></div>
      <div data-resume-section="proof"><UnderHeroImages /></div>
      <div data-resume-section="demo"><SeeInActionSection /></div>
      <div data-resume-section="reviews"><CustomerReviewsSection /></div>
      <div data-resume-section="packages"><ProductPackages /></div>
      <div data-resume-section="benefits"><BenefitsSection /></div>
      <div data-resume-section="gallery"><GallerySection /></div>
      <div data-resume-section="about"><AboutProductVideo /><AboutProductSection /><AboutProductImage /></div>
      <div data-resume-section="order"><InlineCheckout /></div>
      <div data-resume-section="faq"><FAQSection /></div>
      <DisclaimerSection />
    </>
  )
}
