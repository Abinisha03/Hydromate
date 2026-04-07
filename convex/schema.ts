import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  orders: defineTable({
    userId: v.string(),
    orderId: v.string(),
    status: v.string(),
    paymentMode: v.string(),
    quantity: v.number(),
    waterPrice: v.number(),
    bottlePrice: v.number(),
    totalAmount: v.number(),
    expressCharge: v.optional(v.number()),
    date: v.string(),
    pincode: v.string(),
    buildingName: v.optional(v.string()),
    streetNo: v.optional(v.string()),
    floorNo: v.optional(v.string()),
    doorNo: v.optional(v.string()),
    streetName: v.optional(v.string()),
    area: v.optional(v.string()),
    location: v.optional(v.string()),
    noBottleReturn: v.boolean(),
    otp: v.string(),
    supplierName: v.string(),
    supplierPhone: v.string(),
    // Staff assignment fields
    assignedStaffId: v.optional(v.string()),
    assignedStaffName: v.optional(v.string()),
    deliveredAt: v.optional(v.string()),
    // Customer info (denormalized for admin view)
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_staff", ["assignedStaffId"]),

  addresses: defineTable({
    userId: v.string(),
    name: v.string(),
    phone: v.string(),
    buildingName: v.optional(v.string()),
    streetNo: v.optional(v.string()),
    gateNo: v.optional(v.string()),
    floorNo: v.optional(v.string()),
    doorNo: v.optional(v.string()),
    streetName: v.optional(v.string()),
    area: v.optional(v.string()),
    location: v.optional(v.string()),
    pincode: v.optional(v.string()),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  complaints: defineTable({
    userId: v.string(),
    orderId: v.string(),
    userName: v.string(),
    userPhone: v.string(),
    description: v.string(),
    status: v.string(),
    date: v.string(),
  }).index("by_user", ["userId"]),

  pricing: defineTable({
    waterPrice: v.number(),
    bottlePrice: v.number(),
    expressCharge: v.number(),
  }),

  staffInvites: defineTable({
    inviteCode: v.string(),
    email: v.string(),
    name: v.string(),
    createdBy: v.string(),
    status: v.string(), // "pending" | "accepted" | "expired"
    createdAt: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_code", ["inviteCode"]),
});
