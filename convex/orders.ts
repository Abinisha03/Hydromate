import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createOrder = mutation({
  args: {
    quantity: v.number(),
    waterPrice: v.number(),
    bottlePrice: v.number(),
    totalAmount: v.number(),
    expressCharge: v.number(),
    paymentMode: v.string(), // "COD", "Online"
    pincode: v.string(),
    noBottleReturn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // 1. Time & Day Validation (IST: UTC+5:30)
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const day = istDate.getUTCDay(); // 0 is Sunday
    const hour = istDate.getUTCHours(); // IST Hour

    if (hour < 6 || hour >= 20) {
      throw new Error("Orders are accepted only between 6:00 AM and 8:00 PM.");
    }

    // Debugging more specifically
    if (!identity) {
      console.error("Auth Error: getUserIdentity returned null");
      throw new Error("Order creation failed: Not authenticated in Convex. Please ensure you are logged in and try again.");
    }

    const orderId = Math.floor(10000 + Math.random() * 90000).toString();
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    const id = await ctx.db.insert("orders", {
      userId: identity.tokenIdentifier,
      orderId,
      status: "Pending",
      paymentMode: args.paymentMode,
      quantity: args.quantity,
      waterPrice: args.waterPrice,
      bottlePrice: args.bottlePrice,
      totalAmount: args.totalAmount,
      expressCharge: args.expressCharge,
      date: date,
      pincode: args.pincode,
      noBottleReturn: args.noBottleReturn,
      otp,
      supplierName: "Ganesh",
      supplierPhone: "8438005206",
    });

    return id;
  },
});

export const getOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    return order;
  },
});
