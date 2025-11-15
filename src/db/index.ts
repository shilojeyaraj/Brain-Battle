import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const databaseUrl = process.env.DATABASE_URL!

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it in your .env file.\n" +
      "Get it from your database provider's dashboard."
  )
}

const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
  connection: {
    application_name: "brain-brawl",
  },
})

export const db = drizzle(client, { schema })

// Export schema for use in other files
export * from "./schema"
