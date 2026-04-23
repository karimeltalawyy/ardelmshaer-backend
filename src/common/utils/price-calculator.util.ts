import { PrismaService } from '../../prisma/prisma.service';

export interface CalculatedPrice {
  basePrice: number;
  seasonMultiplier: number;
  finalPrice: number;
  seasonId: string | null;
}

/**
 * Calculates final trip price for a given route + car type.
 * Logic:
 *   1. Fetch RoutePricing for route × carType
 *   2. Check for an active Season today
 *   3. If Season has a SeasonRouteOverride for this pricing → use override_price
 *   4. Else if Season active → base_price × multiplier
 *   5. Else → base_price
 */
export async function calculatePrice(
  prisma: PrismaService,
  routeId: string,
  carType: string,
): Promise<CalculatedPrice | null> {
  const pricing = await prisma.routePricing.findUnique({
    where: { routeId_carType: { routeId, carType: carType as any } },
  });

  if (!pricing || !pricing.isActive) return null;

  const basePrice = Number(pricing.basePrice);

  // Check for an active season today
  const today = new Date();
  const season = await prisma.season.findFirst({
    where: {
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });

  if (!season) {
    return { basePrice, seasonMultiplier: 1, finalPrice: basePrice, seasonId: null };
  }

  // Check for a route-specific override in this season
  const override = await prisma.seasonRouteOverride.findUnique({
    where: { seasonId_routePricingId: { seasonId: season.id, routePricingId: pricing.id } },
  });

  if (override) {
    const overridePrice = Number(override.overridePrice);
    return {
      basePrice,
      seasonMultiplier: overridePrice / basePrice,
      finalPrice: overridePrice,
      seasonId: season.id,
    };
  }

  const finalPrice = Math.round(basePrice * season.priceMultiplier * 100) / 100;
  return {
    basePrice,
    seasonMultiplier: season.priceMultiplier,
    finalPrice,
    seasonId: season.id,
  };
}
