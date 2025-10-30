require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const adminIds = process.env.ADMIN_USER_ID
  ? process.env.ADMIN_USER_ID.split(",").map((id) => id.trim())
  : [];
const adminChannelId = process.env.ADMIN_CHANNEL_ID;

client.on(Events.ClientReady, () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(
    `📊 Monitoring reactions in ${client.guilds.cache.size} server(s)`,
  );
  console.log(`👤 Admin IDs: ${adminIds.join(", ")}`);
  console.log(`📢 Admin Channel ID: ${adminChannelId || "Not set"}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Error fetching reaction:", error);
      return;
    }
  }

  if (reaction.emoji.name === "🛒") {
    console.log(
      `🛒 Purchase request from ${user.username} on message: "${reaction.message.content?.slice(0, 18)}..."`,
    );

    const purchaseMessage = `🧾 **Pending Purchase:** ${user.username} wants to buy **${reaction.message.content?.slice(0, 18) || "this item"}...**`;

    try {
      await reaction.message.channel.send(purchaseMessage);
    } catch (error) {
      console.error(
        "Error sending purchase notification to original channel:",
        error,
      );
    }

    if (adminChannelId) {
      try {
        const adminChannel = await client.channels.fetch(adminChannelId);
        if (adminChannel && adminChannel.isTextBased()) {
          await adminChannel.send(
            purchaseMessage + `\n🔗 [Jump to message](${reaction.message.url})`,
          );
        }
      } catch (error) {
        console.error(
          "Error sending purchase notification to admin channel:",
          error,
        );
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!complete")) return;

  if (!adminIds.includes(message.author.id)) {
    console.log(
      `⚠️ Unauthorized !complete attempt by ${message.author.username} (${message.author.id})`,
    );
    return;
  }

  const mention = message.mentions.users.first();
  if (!mention) {
    return message.reply("Please mention the user to complete the order.");
  }

  console.log(
    `✅ Order completed by admin ${message.author.username} for ${mention.username}`,
  );

  const completionMessage = `✅ **Purchase Completed:** ${mention.username}, your order has been confirmed!`;

  try {
    await message.channel.send(completionMessage);
  } catch (error) {
    console.error(
      "Error sending completion message to original channel:",
      error,
    );
  }

  if (adminChannelId && message.channel.id !== adminChannelId) {
    try {
      const adminChannel = await client.channels.fetch(adminChannelId);
      if (adminChannel && adminChannel.isTextBased()) {
        await adminChannel.send(
          completionMessage + `\n👤 Completed by: ${message.author.username}`,
        );
      }
    } catch (error) {
      console.error(
        "Error sending completion message to admin channel:",
        error,
      );
    }
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

if (!TOKEN) {
  console.error(
    "❌ ERROR: DISCORD_BOT_TOKEN is not set in environment variables!",
  );
  console.error("Please add your bot token to continue.");
  process.exit(1);
}

if (adminIds.length === 0) {
  console.warn(
    "⚠️ WARNING: ADMIN_USER_ID is not set. !complete command will not work.",
  );
}

if (!adminChannelId) {
  console.warn(
    "⚠️ WARNING: ADMIN_CHANNEL_ID is not set. Admin notifications will not be sent.",
  );
}

console.log("🚀 Starting Discord bot...");
client.login(TOKEN).catch((error) => {
  console.error("❌ Failed to login:", error.message);
  process.exit(1);
});

require("./server");
