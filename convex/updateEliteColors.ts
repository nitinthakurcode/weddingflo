/**
 * Migration Script: Update all companies to Elite Luxury Color Scheme
 *
 * Run this with: npx convex run scripts/update-elite-colors
 */

import { v } from "convex/values";
import { mutation } from "../convex/_generated/server";

export default mutation({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();

    const ELITE_COLORS = {
      primary_color: '#6366f1',      // Elite Indigo - Sophisticated luxury
      secondary_color: '#ec4899',     // Elegant Pink - Romantic & posh
      accent_color: '#f59e0b',        // Warm Amber - Luxurious gold
      text_color: '#1e293b',          // Slate 800 - Professional & clean
      font_family: 'Inter, system-ui, sans-serif',
    };

    let updated = 0;

    for (const company of companies) {
      // Update company branding with elite colors
      await ctx.db.patch(company._id, {
        branding: {
          ...company.branding,
          primary_color: ELITE_COLORS.primary_color,
          secondary_color: ELITE_COLORS.secondary_color,
          accent_color: ELITE_COLORS.accent_color,
          text_color: ELITE_COLORS.text_color,
          font_family: ELITE_COLORS.font_family,
        },
        updated_at: Date.now(),
      });
      updated++;
    }

    return {
      success: true,
      message: `✅ Updated ${updated} companies with Elite Luxury Color Scheme`,
      colors: ELITE_COLORS,
    };
  },
});
