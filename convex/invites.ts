import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createInvite = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    inviteCode: v.string(),
    phone: v.optional(v.string()) // Added phone here
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const emailTokens = args.email.trim().toLowerCase();

    // In a real app we might check if the caller is an admin here
    
    // Check if an invite already exists for this email
    const existing = await ctx.db
      .query("staffInvites")
      .withIndex("by_email", (q) => q.eq("email", emailTokens))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      // Refresh the existing invite with the new code
      await ctx.db.patch(existing._id, {
        inviteCode: args.inviteCode,
        name: args.name,
        ...(args.phone ? { phone: args.phone } : {}),
        createdAt: new Date().toISOString(),
      });
      return existing._id;
    }

    const inviteId = await ctx.db.insert("staffInvites", {
      inviteCode: args.inviteCode,
      email: emailTokens,
      name: args.name,
      ...(args.phone ? { phone: args.phone } : {}),
      createdBy: identity.tokenIdentifier,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return inviteId;
  },
});

export const checkPendingInvite = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const emailToken = args.email.trim().toLowerCase();

    const pending = await ctx.db
      .query("staffInvites")
      .withIndex("by_email", (q) => q.eq("email", emailToken))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    return !!pending;
  },
});

export const verifyInvite = mutation({
  args: {
    inviteCode: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const emailToken = args.email.trim().toLowerCase();

    const invite = await ctx.db
      .query("staffInvites")
      .withIndex("by_email", (q) => q.eq("email", emailToken))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .filter((q) => q.eq(q.field("inviteCode"), args.inviteCode))
      .first();

    if (!invite) {
      throw new Error("Invalid code or no pending invite found for your email.");
    }

    // 1. Mark invite as accepted
    await ctx.db.patch(invite._id, { status: "accepted" });

    // 2. Upgrade the user's role in the DB
    const userTokens = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    const clerkUsers = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
      
    const user = userTokens || clerkUsers;

    if (user) {
      await ctx.db.patch(user._id, { 
        role: "staff", 
        name: invite.name, 
        email: emailToken,
        ...(args.phone ? { phone: args.phone } : {}) 
      });
    } else {
       // Should never happen since InitialLayout strictly calls storeUser
       await ctx.db.insert("users", {
         clerkId: identity.subject,
         tokenIdentifier: identity.tokenIdentifier,
         name: invite.name,
         email: emailToken,
         imageUrl: identity.pictureUrl ?? undefined,
         role: "staff",
         ...(args.phone ? { phone: args.phone } : {}) 
       });
    }

    return { success: true };
  },
});
