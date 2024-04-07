import "dotenv/config";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildMember,
  Role,
  TextChannel,
} from "discord.js";
import {
  CHANNEL_CATEGORY,
  PERMISSIONED_ROLE_ID,
  VOTING_ROLE_NAME,
} from "./constants";
import { assignRolesToMembers } from "./helpers/assignRoles";
import { shuffleArray } from "./helpers/shuffle";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log("Bot is ready!");
});

// Sample members with replacement
async function sampleMembers(
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
    parent: CHANNEL_CATEGORY,
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
        deny: ["SendMessages"],
      },
    ],
  });

  await channel.send(
    "Welcome to the vote channel! Please react to the next message to cast your vote. You can change your vote by reacting again. Voting rewards will be distributed every month. 🗳️."
  );

  return channel;
}

client.on("messageCreate", async (message) => {
  const teamRoleId = PERMISSIONED_ROLE_ID;

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
      const sampledMembers = await sampleMembers(
        message.guild?.id ?? "",
        sampleSize,
        VOTING_ROLE_NAME
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
      const roles = guild.roles.cache.filter((r) =>
        r.name.startsWith("🗳｜vote-")
      );
      if (roles && roles.size > 0) {
        for (const [, role] of roles) {
          await role.delete("Cleanup process");
        }
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
