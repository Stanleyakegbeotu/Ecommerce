export const SOLAR_GENERATOR_PRODUCT = {
  id: 'd7b64aa1-d8e7-4f3f-85ce-0618a777e4f1',
  slug: 'duravolt-150w-solar-generator',
  name: 'DuraVolt 150W Solar Generator',
  implementationKey: 'solar-generator',
} as const

export const PRODUCT_REGISTRY: ReadonlyMap<string, typeof SOLAR_GENERATOR_PRODUCT> = new Map([[SOLAR_GENERATOR_PRODUCT.slug, SOLAR_GENERATOR_PRODUCT]])

export function getRegisteredProduct(slug: string | undefined) {
  return slug ? PRODUCT_REGISTRY.get(slug) : undefined
}
