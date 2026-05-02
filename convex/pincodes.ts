import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getPincodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pincodes").collect();
  },
});

export const addPincode = mutation({
  args: {
    label: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pincodes", {
      label: args.label,
      value: args.value,
    });
  },
});

export const updatePincode = mutation({
  args: {
    id: v.id("pincodes"),
    label: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      label: args.label,
      value: args.value,
    });
  },
});

export const deletePincode = mutation({
  args: {
    id: v.id("pincodes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seedDefaultPincodes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("pincodes").collect();
    if (existing.length > 0) return;

    const defaults = [
      { label: "Main Colony", value: "627011" },
      { label: "East Street", value: "627012" },
      { label: "West Gate", value: "627013" },
    ];

    for (const p of defaults) {
      await ctx.db.insert("pincodes", p);
    }
  },
});
