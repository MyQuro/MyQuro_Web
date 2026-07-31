/**
 * Fixes company admin credentials by using better-auth's hashPassword utility
 * so that logins work correctly via the email/password flow.
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { neon } from "@neondatabase/serverless";
import { nanoid } from "nanoid";

async function repairPasswords() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not found");
        return;
    }
    const sql = neon(url);

    try {
        // 1. Fetch all completed invitations
        const invites = await sql`
      SELECT id, company_name, owner_email, generated_password 
      FROM company_invitations 
      WHERE status = 'completed'
    `;

        if (invites.length === 0) {
            console.log("No completed invitations found.");
            return;
        }

        console.log(`Found ${invites.length} completed invitations.`);

        const processedEmails = new Set<string>();

        for (const inv of invites) {
            if (processedEmails.has(inv.owner_email)) {
                console.log(`Skipping duplicate email: ${inv.owner_email}`);
                continue;
            }

            // Generate a new password if missing
            const plainPassword = inv.generated_password || nanoid(12);

            if (!inv.generated_password) {
                await sql`
          UPDATE company_invitations 
          SET generated_password = ${plainPassword} 
          WHERE id = ${inv.id}
        `;
                console.log(`Generated new password for invitation ${inv.id}`);
            }

            // Hash using better-auth's own utility (scrypt)
            const hashed = await hashPassword(plainPassword);
            console.log(`Processing ${inv.owner_email} (company: ${inv.company_name})...`);

            // 2. Get the user
            const users = await sql`
        SELECT id FROM auth_users WHERE email = ${inv.owner_email}
      `;

            if (users.length === 0) {
                console.log(`  ⚠️  No user found for ${inv.owner_email}, skipping.`);
                continue;
            }

            const userId = users[0].id;

            // 3. Upsert the credentials account (provider_id = 'credential' is what better-auth uses)
            const accounts = await sql`
        SELECT id FROM auth_accounts 
        WHERE user_id = ${userId} AND provider_id = 'credential'
      `;

            if (accounts.length === 0) {
                const accountId = nanoid();
                await sql`
          INSERT INTO auth_accounts (id, account_id, user_id, password, provider_id, created_at, updated_at)
          VALUES (${accountId}, ${inv.owner_email}, ${userId}, ${hashed}, 'credential', NOW(), NOW())
        `;
                console.log(`  ✅ Created credential account for ${inv.owner_email}`);
            } else {
                await sql`
          UPDATE auth_accounts 
          SET password = ${hashed}, account_id = ${inv.owner_email}, updated_at = NOW()
          WHERE id = ${accounts[0].id}
        `;
                console.log(`  ✅ Updated credentials for ${inv.owner_email}`);
            }

            console.log(`  🔑 Plain password: ${plainPassword}`);
            processedEmails.add(inv.owner_email);
        }

        console.log("\n✅ All done! Credentials have been repaired.");
    } catch (error) {
        console.error("Repair failed:", error);
    }
}

repairPasswords();
