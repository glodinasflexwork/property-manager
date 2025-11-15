import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

async function fixTeamMember() {
  const sql = neon(DATABASE_URL);
  
  console.log("=== Adding Team Member ===\n");
  
  // Add user 1 to organization 1 as owner
  try {
    const result = await sql`
      INSERT INTO "teamMembers" ("organizationId", "userId", role, "invitedBy", "acceptedAt")
      VALUES (1, 1, 'owner', 1, NOW())
      RETURNING id
    `;
    console.log("✅ Team member added successfully!");
    console.log("Team member ID:", result[0].id);
  } catch (error: any) {
    console.error("❌ Error adding team member:", error.message);
    console.error("Full error:", error);
  }
  
  // Verify
  const teamMembers = await sql`
    SELECT tm.*, u.email 
    FROM "teamMembers" tm
    JOIN users u ON tm."userId" = u.id
    WHERE tm."organizationId" = 1
  `;
  console.log("\n📋 Team members for organization 1:");
  console.table(teamMembers);
}

fixTeamMember().catch(console.error);
