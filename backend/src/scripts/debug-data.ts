import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function debug() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not found");
        return;
    }
    const sql = neon(url);
    try {
        console.log("--- COMPANIES ---");
        const comps = await sql`SELECT id, name, LENGTH(name) as len, owner_id FROM companies`;
        console.table(comps);

        console.log("\n--- COMPLETED INVITATIONS ---");
        const invites = await sql`SELECT id, company_name, LENGTH(company_name) as len, owner_email, status, generated_password FROM company_invitations WHERE status = 'completed'`;
        console.table(invites);

        console.log("\n--- JOIN TEST (WITH TRIM) ---");
        const joined = await sql`
      SELECT c.name as comp_name, LENGTH(c.name) as comp_len, 
             i.company_name as inv_name, LENGTH(i.company_name) as inv_len,
             i.generated_password 
      FROM companies c 
      LEFT JOIN company_invitations i ON TRIM(c.name) = TRIM(i.company_name) AND i.status = 'completed'
    `;
        console.table(joined);

    } catch (error) {
        console.error("Debug failed:", error);
    }
}

debug();
