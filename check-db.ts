import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

async function checkDatabase() {
  const sql = neon(DATABASE_URL);
  
  console.log("=== Checking Database ===\n");
  
  // Check users
  const users = await sql`SELECT id, email, name, "loginMethod", "lastSignedIn" FROM users ORDER BY id DESC LIMIT 5`;
  console.log("📧 Recent Users:");
  console.table(users);
  
  // Check organizations
  const orgs = await sql`SELECT id, name, "ownerId", "createdAt" FROM organizations ORDER BY id DESC LIMIT 5`;
  console.log("\n🏢 Recent Organizations:");
  console.table(orgs);
  
  // Check team members
  const teamMembers = await sql`SELECT id, "organizationId", "userId", role, "acceptedAt" FROM "teamMembers" ORDER BY id DESC LIMIT 5`;
  console.log("\n👥 Recent Team Members:");
  console.table(teamMembers);
  
  // Check for orphaned users (users without organizations)
  const orphanedUsers = await sql`
    SELECT u.id, u.email, u.name 
    FROM users u 
    LEFT JOIN organizations o ON u.id = o."ownerId"
    WHERE o.id IS NULL
  `;
  console.log("\n⚠️  Users without Organizations:");
  console.table(orphanedUsers);
  
  // Check for users without team membership
  const usersWithoutTeam = await sql`
    SELECT u.id, u.email, u.name 
    FROM users u 
    LEFT JOIN "teamMembers" tm ON u.id = tm."userId"
    WHERE tm.id IS NULL
  `;
  console.log("\n⚠️  Users without Team Membership:");
  console.table(usersWithoutTeam);
}

checkDatabase().catch(console.error);
