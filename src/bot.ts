import "dotenv/config";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildMember,
  OverwriteResolvable,
  Role,
  TextChannel,
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const roleWeights: { [key: string]: number } = {
  Role1: 10,
  Role2: 20,
  // Add more roles and their weights
};

client.once("ready", () => {
  console.log("Bot is ready!");
});

// Sample members with replacement
async function sampleMembersWithReplacement(
  guildId: string,
  sampleSize: number,
  roleName: string
): Promise<GuildMember[]> {
  const guild = await client.guilds.fetch(guildId);
  const members = (await guild.members.fetch()).filter(
    (member) =>
      member.roles.cache.some((role) => role.name === roleName) &&
      !member.user.bot
  );
  // Convert the iterator to an array
  const membersArray = Array.from(members.values());

  // Shuffle the array of members
  shuffleArray(membersArray);

  // Take the first 'sampleSize' members from the shuffled array
  const sample = membersArray.slice(0, sampleSize);

  return sample;
}

// Use this function to create a single channel and invite sampled members
async function createChannelWithSampledMembers(
  guildId: string,
  sample: GuildMember[],
  channelName: string,
  roleName: string
): Promise<TextChannel> {
  const guild = await client.guilds.fetch(guildId);
  // Find the role by name "RT Pollmaster"
  const pollmasterRole = guild.roles.cache.find(
    (role) => role.name === "RT Pollmaster"
  );
  if (!pollmasterRole) {
    console.error("RT Pollmaster role not found.");
    throw new Error("RT Pollmaster role not found.");
  }

  // Create a new role with specified name and permissions
  const role = await guild.roles.create({
    name: roleName,
    permissions: ["ViewChannel", "ReadMessageHistory", "AddReactions"],
  });

  // Assign the role to each of the sampled members
  await assignRolesToMembers(sample, role);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: "1220447576378314877",
    permissionOverwrites: [
      {
        id: guild.id,
        deny: ["ViewChannel"],
      },
      {
        id: client?.user?.id ?? "", // Ensure the bot has the required permissions
        allow: ["ManageChannels", "ViewChannel"],
      },
      {
        id: pollmasterRole.id, // Give the "RT Pollmaster" role permissions to view and interact with the channel
        allow: [
          "ViewChannel",
          "SendMessages",
          "ReadMessageHistory",
          "AddReactions",
          "ManageMessages",
          "EmbedLinks",
        ],
      },
      {
        id: role.id,
        allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"],
      },
    ],
  });

  await channel.send(
    "Welcome to the vote channel! Please react to the next message to cast your vote. You can change your vote by reacting again. Voting rewards will be distributed every month. 🗳️."
  );

  return channel;
}

client.on("messageCreate", async (message) => {
  const teamRoleId = "1215214403121848350";

  if (message.content.startsWith("!createSampleChannel")) {
    if (message.member?.roles.cache.has(teamRoleId)) {
      const args = message.content.split(" ");
      const sampleSizeArg = args[1]; // The second element should be the sample size

      // Convert the argument to a number and check if it is valid
      const sampleSize = parseInt(sampleSizeArg);
      if (isNaN(sampleSize) || sampleSize <= 0) {
        message.channel.send(
          "Please specify a valid number of members to sample."
        );
        return;
      }

      const channelName = "🗳｜vote-" + (args.slice(2).join(" ") || "0");

      // Sample members and create channel
      const sampledMembers = await sampleMembersWithReplacement(
        message.guild?.id ?? "",
        sampleSize,
        "Baby Dragon"
      );
      const newChannel = await createChannelWithSampledMembers(
        message.guild?.id ?? "",
        sampledMembers,
        channelName,
        channelName
      );

      message.channel.send(
        `A new channel has been created: ${newChannel.name} with ${sampleSize} members.`
      );
    } else {
      message.channel.send("You do not have permission to use this command.");
    }
  }

  if (message.content.startsWith("!deleteVoteChannels")) {
    if (message.member?.roles.cache.has(teamRoleId)) {
      const guild = await client.guilds.fetch(message.guild?.id ?? "");

      // Find and delete the role
      const role = guild.roles.cache.find((r) => r.name.startsWith("🗳｜vote-"));
      if (role) {
        await role.delete("Cleanup process");
      }

      const voteChannels = guild.channels.cache.filter(
        (channel) =>
          channel.name.startsWith("🗳｜vote-") &&
          channel.type === ChannelType.GuildText
      );

      // Delete all channels with the correct prefix
      for (const [channelId, channel] of voteChannels) {
        await channel.delete("Cleanup vote channels command issued");
        console.log(`Deleted channel: ${channel.name}`);
      }

      message.channel.send("All vote channels have been cleaned up.");
    } else {
      message.channel.send("You do not have permission to use this command.");
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Helper function to add a role to a member with error handling
async function tryAddRole(member: GuildMember, role: Role) {
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
async function assignRolesToMembers(
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

// Function to shuffle an array
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
