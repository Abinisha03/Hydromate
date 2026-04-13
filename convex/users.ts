import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store or update a Clerk user in Convex
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const rawRole = (identity as any).role;
    const role = rawRole === null ? undefined : (rawRole as string | undefined);

    let existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!existing) {
      existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    if (existing) {
      // Only update name if existing name is a generic default
      // (don't overwrite names set during staff invite verification)
      const shouldUpdateName = !existing.name || existing.name === 'User';
      
      await ctx.db.patch(existing._id, {
        tokenIdentifier: identity.tokenIdentifier,
        name: shouldUpdateName ? (identity.name ?? existing.name) : existing.name,
        email: identity.email ?? existing.email,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        role: existing.role ?? role,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "User",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? undefined,
      role: role,
    });

    return userId;
  },
});

// Get current user from Convex
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const byToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (byToken) return byToken;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Update user's editable display name and phone — persisted in Convex
export const updateUserProfile = mutation({
  args: {
    displayName: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    if (!user) throw new Error("User record not found");

    await ctx.db.patch(user._id, {
      displayName: args.displayName.trim(),
      phone: args.phone.trim(),
    });

    return { success: true };
  },
});

// Check if user exists
export const userExists = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const byToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (byToken) return true;

    const byClerk = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return !!byClerk;
  },
});

// Get all staff members for admin use
export const getStaffMembers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const allUsers = await ctx.db.query("users").take(200);
    return allUsers.filter((u) => u.role === "staff");
  },
});

// Remove staff access by resetting their role to "user"
export const removeStaff = mutation({
  args: { staffId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 1. Get user email to find associated invites
    const user = await ctx.db.get(args.staffId);
    if (user && user.email) {
      // 2. Find and delete any pending invites for this email
      const pendingInvites = await ctx.db
        .query("staffInvites")
        .withIndex("by_email", (q) => q.eq("email", user.email.toLowerCase()))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
      
      for (const invite of pendingInvites) {
        await ctx.db.delete(invite._id);
      }
    }

    // 3. Revert role to user
    await ctx.db.patch(args.staffId, { role: "user" });
    return { success: true };
  },
});

