import { GuildMember, Role } from "discord.js";

// Helper function to add a role to a member with error handling
export async function tryAddRole(member: GuildMember, role: Role) {
  try {
    await member.roles.add(role);
    console.log(`Role ${role.name} added to member ${member.user.tag}`);
    return true; // Return true if the role was successfully added
  } catch (error) {
    console.error(`Failed to add role to ${member.user.tag}: ${error}`);
    return false; // Return false if the role was not added
  }
}

// Function to assign roles to an array of members with retry for failures
export async function assignRolesToMembers(
  sample: GuildMember[],
  role: Role,
  delay = 300
) {
  let failedMembers = [];

  // First pass: try to assign the role to all members
  for (const member of sample) {
    const success = await tryAddRole(member, role);
    if (!success) {
      failedMembers.push(member);
    }
    await new Promise((resolve) => setTimeout(resolve, delay)); // Delay to prevent rate limit hits
  }

  // Retry for failed role assignments
  while (failedMembers.length > 0) {
    const member = failedMembers.shift();
    if (!member) continue; // Skip if the member is undefined (shouldn't happen
    const success = await tryAddRole(member, role);
    if (!success) {
      // If the role assignment failed again, you could choose to log this member
      // Or add them to another list for a final manual check
    }
    await new Promise((resolve) => setTimeout(resolve, delay)); // Delay to prevent rate limit hits
  }
}
