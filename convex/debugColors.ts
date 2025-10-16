import { query } from "./_generated/server";

export default query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    return companies.map((c) => ({
      id: c._id,
      name: c.company_name,
      branding: c.branding,
    }));
  },
});
