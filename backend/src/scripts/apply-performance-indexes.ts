
import { db } from "../db/db.js";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Applying specific performance indexes...");

    const indexes = [
        `CREATE INDEX IF NOT EXISTS "idx_sessions_restaurant_billed" ON "table_session" ("restaurant_id", "billed_at")`,
        `CREATE INDEX IF NOT EXISTS "idx_sessions_status_payment" ON "table_session" ("status", "payment_status")`,
        `CREATE INDEX IF NOT EXISTS "idx_reservations_restaurant_time" ON "reservations" ("restaurant_id", "reservation_time")`,
        `CREATE INDEX IF NOT EXISTS "idx_orders_restaurant_status_created" ON "orders" ("restaurant_id", "status", "created_at")`,
        `CREATE INDEX IF NOT EXISTS "idx_orders_session" ON "orders" ("table_session_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items" ("order_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_order_items_session" ON "order_items" ("table_session_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_payments_restaurant_status_created" ON "payments" ("restaurant_id", "status", "created_at")`,
        `CREATE INDEX IF NOT EXISTS "idx_payments_session" ON "payments" ("table_session_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_payments_method" ON "payments" ("method")`,
        `CREATE INDEX IF NOT EXISTS "idx_notifications_restaurant_created" ON "notifications" ("restaurant_id", "created_at")`,
        `CREATE INDEX IF NOT EXISTS "idx_order_extras_item" ON "order_item_extras" ("order_item_id")`
    ];

    for (const query of indexes) {
        try {
            console.log(`Executing: ${query}`);
            await db.execute(sql.raw(query));
            console.log("Success.");
        } catch (error) {
            console.error(`Error executing ${query}:`, error);
        }
    }

    console.log("All indexes processed.");
    process.exit(0);
}

main();
