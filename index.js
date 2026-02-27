const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const http = require("http");

// --- WEB SERVER FOR RENDER (KEEP ALIVE) ---
http.createServer((req, res) => {
  res.write("Bot Musik Aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

// --- DISCORD CLIENT SETUP ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// --- DISTUBE SETUP ---
client.distube = new DisTube(client, {
  leaveOnStop: false,
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  plugins: [
    new SpotifyPlugin({ emitEventsAfterFetching: true }),
    new YtDlpPlugin()
  ],
});

const prefix = "!";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// --- COMMAND HANDLER ---
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // Perintah: !play <judul/link>
  if (command === "play" || command === "p") {
    const query = args.join(" ");
    if (!query) return message.reply("Masukkan judul lagu atau link!");
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("Masuk ke voice channel dulu dong!");

    client.distube.play(voiceChannel, query, { textChannel: message.channel, member: message.member });
  }

  // Perintah: !volume <angka>
  if (command === "volume" || command === "vol") {
    const volume = parseInt(args[0]);
    if (isNaN(volume)) return message.reply("Masukkan angka 1-100!");
    client.distube.setVolume(message, volume);
    message.reply(`🔊 Volume diatur ke: **${volume}%**`);
  }

  // Perintah: !repeat
  if (command === "repeat" || command === "loop") {
    const mode = client.distube.setRepeatMode(message);
    message.reply(`🔁 Mode repeat: **${mode ? (mode === 2 ? "All Queue" : "This Song") : "Off"}**`);
  }

  // Perintah: !shuffle
  if (command === "shuffle") {
    client.distube.shuffle(message);
    message.reply("🔀 Antrean lagu berhasil di-acak!");
  }

  // Perintah: !stop / !skip
  if (command === "stop") {
    client.distube.stop(message);
    message.reply("🛑 Musik dihentikan.");
  }
  if (command === "skip") {
    client.distube.skip(message);
    message.reply("⏭️ Lagu dilewati.");
  }
});

// --- DISTUBE EVENTS (Tampilan Lagu / Elements) ---
client.distube.on("playSong", (queue, song) => {
  const embed = new EmbedBuilder()
    .setColor("#00ff99")
    .setTitle("🎶 Sedang Memutar")
    .setDescription(`**[${song.name}](${song.url})**`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: "Durasi", value: `\`${song.formattedDuration}\``, inline: true },
      { name: "Diminta oleh", value: `${song.user}`, inline: true },
      { name: "Volume", value: `\`${queue.volume}%\``, inline: true }
    )
    .setFooter({ text: `Status: ${queue.paused ? "Paused" : "Playing"} | Repeat: ${queue.repeatMode ? "On" : "Off"}` });

  queue.textChannel.send({ embeds: [embed] });
});

client.login(process.env.TOKEN);
