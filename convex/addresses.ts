import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createAddress = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    buildingName: v.string(),
    streetNo: v.string(),
    gateNo: v.string(),
    floorNo: v.string(),
    doorNo: v.string(),
    streetName: v.string(),
    area: v.string(),
    location: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // If setting as default, unset others first
    if (args.isDefault) {
      const existing = await ctx.db
        .query("addresses")
        .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
        .collect();
      for (const addr of existing) {
        if (addr.isDefault) {
          await ctx.db.patch(addr._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("addresses", {
      userId: identity.tokenIdentifier,
      ...args,
    });
  },
});

export const getAddresses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("addresses")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();
  },
});

export const updateAddress = mutation({
  args: {
    id: v.id("addresses"),
    name: v.string(),
    phone: v.string(),
    buildingName: v.string(),
    streetNo: v.string(),
    gateNo: v.string(),
    floorNo: v.string(),
    doorNo: v.string(),
    streetName: v.string(),
    area: v.string(),
    location: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.tokenIdentifier) {
      throw new Error("Address not found or access denied");
    }

    if (data.isDefault) {
      const all = await ctx.db
        .query("addresses")
        .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
        .collect();
      for (const addr of all) {
        if (addr.isDefault && addr._id !== id) {
          await ctx.db.patch(addr._id, { isDefault: false });
        }
      }
    }

    await ctx.db.patch(id, data);
  },
});

export const deleteAddress = mutation({
  args: { id: v.id("addresses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.tokenIdentifier) {
      throw new Error("Address not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});

export const setDefaultAddress = mutation({
  args: { id: v.id("addresses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const all = await ctx.db
      .query("addresses")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    for (const addr of all) {
      await ctx.db.patch(addr._id, { isDefault: addr._id === args.id });
    }
  },
});
