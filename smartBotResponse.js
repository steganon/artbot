require("dotenv").config();
const {
  MessageEmbed
} = require("discord.js");
const fetch = require("node-fetch");

// Discord channel IDs.
const CHANNEL_GENERAL = process.env.CHANNEL_GENERAL;
const CHANNEL_HELP = process.env.CHANNEL_HELP;
const CHANNEL_SQUIG = process.env.CHANNEL_SQUIG;

// Specific OpenSea assets for fetching project stats for "ArtBlocks Curated"
// and "Artist Playground".
// Squiggle #0
const ARTBLOCKS_CURATED_ASSET = "https://api.opensea.io/api/v1/asset/0x059edd72cd353df5106d2b9cc5ab83a52287ac3a/0";
// View Card #0
const ARTBLOCKS_PLAYGROUND_ASSET = "https://api.opensea.io/api/v1/asset/0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270/6000000";
// Variant Plan #0
const ARTBLOCKS_FACTORY_ASSET = "https://api.opensea.io/api/v1/asset/0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270/5000000";

// ArtBot details..
const ARTBOT_USERNAME = "artbot";
const ARTBOT_GREEN = 0x00ff00;

// Custom message shown when someone asks why Squiggle minting is paused.
const SQUIGGLE_PAUSE_MESSAGE = new MessageEmbed()
  // Set the title of the field
  .setTitle('Why is Squiggle minting paused?')
  // Set the color of the embed
  .setColor(ARTBOT_GREEN)
  // Set the main content of the embed
  .setDescription(`It looks like you're wondering about why Chromie Squiggle minting is paused.The tl;dr is that all normal minting is over and the remaining Squiggles are reserved for special occasions!\n\nFor more details, check out the [#squiggle-announcements](https://discord.com/channels/411959613370400778/800461920008273962/800464186924466187) channel.`);

// Custom message shown when someone asks about when the next drop is.
const NEXT_DROP_MESSAGE = new MessageEmbed()
  // Set the title of the field
  .setTitle('When is the next drop?')
  // Set the color of the embed
  .setColor(ARTBOT_GREEN)
  // Set the main content of the embed
  .setDescription(`It looks like you're wondering about when the next drop is.\n\nFor details on upcoming scheduled **Curated Project** releases, please check the [#calendar](https://discord.com/channels/411959613370400778/800784659940245504) and [#announcements](https://discord.com/channels/411959613370400778/781730104337235968) channels.\n\n**Artist Playground** drops are entirely coordinated by the artists, so it is up to them to spread the word on social media and in Discord. When they are announced for the entire Discord, you will find them in [#playground-announcements](https://discord.com/channels/411959613370400778/816383725582942208)`);

// Custom message shown when someone asks what the "Playground" vs. "Curated"
// vs. "Factory" is.
const PLAYGROUND_CURATED_FACTORY_MESSAGE = new MessageEmbed()
  // Set the title of the field
  .setTitle('How are "Curated", "Playground", and "Factory" different?')
  // Set the color of the embed
  .setColor(ARTBOT_GREEN)
  // Set the main content of the embed
  .setDescription(`It looks like you're wondering about the different types of Art Blocks projects.\n\n**Art Blocks Curated** is the most strictly curated offering in the Art Blocks product suite. Submissions are made by individual artists or collaborations and approved by the curation board before they go live. These highly innovative releases by renowned artists reflect astounding beauty and innovation both artistically and technically.\n\n**Art Blocks Playground** is the place where artists who have previously been approved for curated drops are encouraged to play and innovative. Like all Art Blocks releases, these projects must meet a quality standard, but with the Playground, experimentation is encouraged.\n\n**Art Blocks Factory** allows artists who do not wish to wait for approval by the Curation Board a place to launch their generative art. While requirements are somewhat relaxed compared to Curated drops, the releases in Factory will reflect the innovation, creativity, and artistic beauty associated with the Art Blocks community.\n\nCheck out [artblocks.io/learn](https://artblocks.io/learn) for a full explanation!`);

// Custom message shown when someone asks for the OpenSea links.
const OPENSEA_LINKS_MESSAGE = new MessageEmbed()
  // Set the title of the field
  .setTitle('Looking for ArtBlocks on OpenSea?')
  // Set the color of the embed
  .setColor(ARTBOT_GREEN)
  // Set the main content of the embed
  .setDescription(`There are three ArtBlocks collections on OpenSea:\n• [ArtBlocks Curated](https://opensea.io/assets/art-blocks)\n• [ArtBlocks Playground](https://opensea.io/assets/art-blocks-playground)\n• [ArtBlocks Factory](https://opensea.io/assets/art-blocks-factory)`);

// Custom message shown when someone asks about when the next drop is.
const HELP_MESSAGE = new MessageEmbed()
  // Set the title of the field
  .setTitle('Looking for help?')
  // Set the color of the embed
  .setColor(ARTBOT_GREEN)
  // Set the main content of the embed
  .setDescription(`These are the things you can ask me:\n\n**squiggle paused?**: An explanation of why Chromie Squiggle minting is paused.\n**drop?**: Where to find information about the next drop.\n**playground?** (or **curated?** or **factory?**): Information about the different types of Art Blocks projects.\n**opensea?**: Links to the three different Art Blocks collections on OpenSea (Curated, Playground, and Factory).\n**metrics?**: The latest Art Blocks platform metrics.`);

// Returns a message for ArtBot to return when being smart, or null if
// ArtBot has nothing to say.
async function smartBotResponse(msgContentLowercase, msgAuthor, artBotID, channelID) {
  // NOTE: It is important to check if the message author is the ArtBot
  //       itself to avoid a recursive infinite loop.
  if (msgAuthor == ARTBOT_USERNAME) {
    return null;
  }

  // Some shared helper variables.
  let inHelpChannel = (channelID == CHANNEL_HELP);
  let mentionedArtBot = msgContentLowercase.includes(ARTBOT_USERNAME) ||
    msgContentLowercase.includes(artBotID);
  let mentionedArtBotOrInOrHelp = mentionedArtBot || inHelpChannel;
  let containsQuestion = msgContentLowercase.includes("?");

  // Handle questions about the mint pausing for Chromie Squiggles.
  let inSquiggleChannel = (channelID == CHANNEL_SQUIG);
  // Both "pause" and "stopped" are keywords.
  let mentionsPause = msgContentLowercase.includes("pause") ||
    msgContentLowercase.includes("stopped");
  // Handle some common misspellings of "squiggle":
  // “squigle”, “squigglle”, “squiglle”
  let messageMentionsSquiggle = msgContentLowercase.includes("squiggle") ||
    msgContentLowercase.includes("squigle") ||
    msgContentLowercase.includes("squigglle") ||
    msgContentLowercase.includes("squiglle");
  let squiggleChannelPauseMentioned = mentionsPause && inSquiggleChannel;
  let artbotOrHelpChannelSquigglePauseMentioned =
    mentionsPause &&
    messageMentionsSquiggle &&
    mentionedArtBotOrInOrHelp;
  if (squiggleChannelPauseMentioned || artbotOrHelpChannelSquigglePauseMentioned) {
    return SQUIGGLE_PAUSE_MESSAGE;
  }

  // Only answer the following questions if ArtBlot is pinged directly
  // or the message was sent in #general.
  if (!mentionedArtBotOrInOrHelp) {
    return null;
  }

  // Handle requests for help!
  let mentionsHelp = msgContentLowercase.includes("help");
  if (containsQuestion && mentionsHelp) {
    return HELP_MESSAGE;
  }
  // Handle drop questions.
  let mentionsDrop = msgContentLowercase.includes("drop");
  if (containsQuestion && mentionsDrop) {
    return NEXT_DROP_MESSAGE;
  }
  // Handle questions about Curated Projects vs. Artist Playground vs. Factory.
  let mentionedCuratedPlaygroundFactory = msgContentLowercase.includes("curated") ||
    msgContentLowercase.includes("playground") ||
    msgContentLowercase.includes("factory");
  if (containsQuestion && mentionedCuratedPlaygroundFactory) {
    return PLAYGROUND_CURATED_FACTORY_MESSAGE;
  }
  // Handle OpenSea link requests.
  let mentionedOpenSea = msgContentLowercase.includes("opensea");
  if (containsQuestion && mentionedOpenSea) {
    return OPENSEA_LINKS_MESSAGE;
  }
  // Handle project stats requests.
  let mentionedMetrics = msgContentLowercase.includes("metric");
  if (containsQuestion && mentionedMetrics) {
    let curatedResponse = await fetch(ARTBLOCKS_CURATED_ASSET);
    let curatedData = await curatedResponse.json();
    let curatedStats = curatedData.collection.stats;

    let playgroundResponse = await fetch(ARTBLOCKS_PLAYGROUND_ASSET);
    let playgroundData = await playgroundResponse.json();
    let playgroundStats = playgroundData.collection.stats;

    let factoryResponse = await fetch(ARTBLOCKS_FACTORY_ASSET);
    let factoryData = await factoryResponse.json();
    let factoryStats = factoryData.collection.stats;

    return new MessageEmbed()
      // Set the title of the field
      .setTitle('What are the latest ArtBlocks metrics?')
      // Set the color of the embed
      .setColor(ARTBOT_GREEN)
      // Set the main content of the embed
      .addField("**Curated Projects**", parseKeyMetrics(curatedStats))
      .addField("**Artist Playground**", parseKeyMetrics(playgroundStats))
      .addField("**Factory Projects**", parseKeyMetrics(factoryStats));
  }

  return null;
}

function parseKeyMetrics(stats) {
  return `**Number of Pieces:** ${parseInt(stats.count)}\n**Number of Owners:** ${parseInt(stats.num_owners)}\n**Whale Ratio (Pieces/Owner):** ${parseInt(stats.count/stats.num_owners)}\n**Total Volume:** ${parseInt(stats.total_volume)}Ξ\n**Total Sales:** ${parseInt(stats.total_sales)}Ξ\n**Average Price:** ${parseFloat(stats.average_price).toFixed(4)}Ξ\n**7-Day Volume:** ${parseInt(stats.seven_day_volume)}Ξ\n**7-Day Sales:** ${parseInt(stats.seven_day_sales)}Ξ\n**7-Day Average Price:** ${parseFloat(stats.seven_day_average_price).toFixed(4)}Ξ\n**7-Day Change:** ${parseFloat(stats.seven_day_change * 100).toFixed(2)}%`;
}

module.exports.smartBotResponse = smartBotResponse;
