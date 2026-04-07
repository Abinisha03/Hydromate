import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getPricing = query({
  args: {},
  handler: async (ctx) => {
    const pricing = await ctx.db.query("pricing").first();
    if (pricing) return pricing;
    // Return defaults if no pricing document exists yet
    return { waterPrice: 35, bottlePrice: 200, expressCharge: 75 };
  },
});

export const updatePricing = mutation({
  args: {
    waterPrice: v.number(),
    bottlePrice: v.number(),
    expressCharge: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("pricing").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        waterPrice: args.waterPrice,
        bottlePrice: args.bottlePrice,
        expressCharge: args.expressCharge,
      });
    } else {
      await ctx.db.insert("pricing", {
        waterPrice: args.waterPrice,
        bottlePrice: args.bottlePrice,
        expressCharge: args.expressCharge,
      });
    }
    return { success: true };
  },
});
