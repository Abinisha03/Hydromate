import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createComplaint = mutation({
  args: {
    orderId: v.string(),
    userName: v.string(),
    userPhone: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("complaints", {
      userId: identity.subject,
      ...args,
      status: "Pending",
      date: new Date().toISOString(),
    });
  },
});

export const getMyComplaints = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("complaints")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
