![alt text](/public/supercharged-dao-3.png)

# Supercharged DAO

Distributed, Decentralised Decision Making

## Introduction

By applying a suitable method of random sampling of voters, DAOs can achieve a good trade-off between quality of decisions and efficiency of decision making. Relying on the “wisdom of crowds” could offer some improvements in decision making quality over more centralised options like a DAO council while being equally efficient.

Read more at: https://forum.scales.baby/t/supercharging-daos-distributed-and-decentralised-decision-making-based-on-statistical-methods/192

## How to use

### Version 0.0.1

- Add a DISCORD_BOT_TOKEN in a .env file.
- Edit the constants.ts file to suit your Discord.
- "npm install" and "npm run dev"
- Make sure the necessary scopes are added via OAuth2. (Manage Roles, Manage Channels, Read Messages/View Channels, Send Messages, Manage Messages, Embed Links)
- Use the commands: "!createSampleChannel [sample size] [name of channel]" and "!deleteVoteChannels".
- Add Pollmaster bot: https://github.com/RJ1002/pollmaster to create the poll after everyone is added to the channel.

## Roadmap

- [ ] Add stratified sampling based on role to achieve a weighted sample.
- [ ] Integrate voting mechanism directly into bot instead of relying on Pollmaster.
- [ ] Store voting results on-chain.
