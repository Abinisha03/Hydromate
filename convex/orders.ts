import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── USER FUNCTIONS ───────────────────────────────────────────────────────────

export const createOrder = mutation({
  args: {
    quantity: v.number(),
    waterPrice: v.number(),
    bottlePrice: v.number(),
    totalAmount: v.number(),
    expressCharge: v.number(),
    paymentMode: v.string(),
    pincode: v.string(),
    buildingName: v.optional(v.string()),
    streetNo: v.optional(v.string()),
    floorNo: v.optional(v.string()),
    doorNo: v.optional(v.string()),
    streetName: v.optional(v.string()),
    area: v.optional(v.string()),
    location: v.optional(v.string()),
    noBottleReturn: v.boolean(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Time & Day Validation (IST: UTC+5:30)
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hour = istDate.getUTCHours();

    if (hour < 6 || hour >= 20) {
      throw new Error("Orders are accepted only between 6:00 AM and 8:00 PM.");
    }

    if (!identity) {
      throw new Error("Order creation failed: Not authenticated in Convex.");
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
      date,
      pincode: args.pincode,
      buildingName: args.buildingName,
      streetNo: args.streetNo,
      floorNo: args.floorNo,
      doorNo: args.doorNo,
      streetName: args.streetName,
      area: args.area,
      location: args.location,
      noBottleReturn: args.noBottleReturn,
      otp,
      supplierName: "Ganesh",
      supplierPhone: "8438005206",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
    });

    return id;
  },
});

export const getOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

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
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    return order;
  },
});

export const cancelOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    if (order.status.toLowerCase() !== "pending") {
      throw new Error("Only pending orders can be cancelled");
    }

    await ctx.db.patch(args.orderId, { status: "Cancel" });
    return { success: true };
  },
});

export const updateOrder = mutation({
  args: {
    orderId: v.id("orders"),
    quantity: v.number(),
    pincode: v.string(),
    noBottleReturn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    if (order.status.toLowerCase() !== "pending") {
      throw new Error("Only pending orders can be edited");
    }

    const pricing = await ctx.db.query("pricing").first();
    const waterPrice = pricing?.waterPrice || 35;
    const bottlePriceUnit = pricing?.bottlePrice || 200;
    const expressChargeUnit = pricing?.expressCharge || 75;

    const bottlePrice = args.noBottleReturn ? args.quantity * bottlePriceUnit : 0;
    const expressCharge = args.pincode.includes("91176129") ? args.quantity * expressChargeUnit : 0;
    const totalAmount = args.quantity * waterPrice + bottlePrice + expressCharge;

    await ctx.db.patch(args.orderId, {
      quantity: args.quantity,
      pincode: args.pincode,
      noBottleReturn: args.noBottleReturn,
      waterPrice,
      bottlePrice,
      expressCharge,
      totalAmount,
    });

    return { success: true };
  },
});

export const getStaffStats = query({
  args: { staffIdentifier: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { total: 0, active: 0, delivered: 0 };

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_staff", (q) => q.eq("assignedStaffId", args.staffIdentifier))
      .collect();

    return {
      total: orders.length,
      active: orders.filter((o) => ["Assigned", "Accepted", "Out for Delivery"].includes(o.status)).length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
    };
  },
});

// ─── ADMIN FUNCTIONS ──────────────────────────────────────────────────────────

export const getAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("orders")
      .order("desc")
      .take(200);
  },
});

export const assignStaff = mutation({
  args: {
    orderId: v.id("orders"),
    staffId: v.string(),
    staffName: v.string(),
    staffPhone: v.optional(v.string()), // Added staffPhone
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const patchData: any = {
      assignedStaffId: args.staffId,
      assignedStaffName: args.staffName,
      status: "Assigned",
      supplierName: args.staffName,
    };
    
    if (args.staffPhone) {
      patchData.supplierPhone = args.staffPhone;
    }

    await ctx.db.patch(args.orderId, patchData);
    return { success: true };
  },
});

export const approveOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.orderId, { status: "Approved" });
    return { success: true };
  },
});

export const rejectOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.orderId, { status: "Rejected" });
    return { success: true };
  },
});

// ─── STAFF FUNCTIONS ──────────────────────────────────────────────────────────

export const getStaffOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_staff", (q) => q.eq("assignedStaffId", identity.tokenIdentifier))
      .order("desc")
      .take(100);
  },
});

export const acceptOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.assignedStaffId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    await ctx.db.patch(args.orderId, { status: "Accepted" });
    return { success: true };
  },
});

export const markOutForDelivery = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.assignedStaffId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    await ctx.db.patch(args.orderId, { status: "Out for Delivery" });
    return { success: true };
  },
});

export const markDelivered = mutation({
  args: { 
    orderId: v.id("orders"),
    otp: v.string(),
    paymentMode: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.assignedStaffId !== identity.tokenIdentifier) {
      throw new Error("Order not found or access denied");
    }

    if (order.otp !== args.otp) {
      throw new ConvexError("Invalid Delivery OTP. Please ask the customer for the correct OTP.");
    }

    const deliveredAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await ctx.db.patch(args.orderId, {
      status: "Delivered",
      deliveredAt,
      paymentMode: args.paymentMode,
    });
    return { success: true };
  },
});
