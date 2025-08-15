const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');
const { RankCardBuilder, Font } = require('canvacord');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('level')
		.setDescription('Check your own level and XP or view the leaderboard.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('rank')
				.setDescription('Check your current level and xp.')
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('User to view their level and XP.')
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('leaderboard')
				.setDescription('View the top 10 levels.')
		)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const cmd = interaction.options.getSubcommand();
		const settings = await client.db
			.collection('settings')
			.findOne({ id: interaction.guild.id });

		if (cmd === 'rank') {
			const member = interaction.options.get('user')?.user || interaction.user;
			const guildMember = await interaction.guild.members.fetch(member.id);
			const data = await client.db
				.collection('levels')
				.findOne({ id: interaction.guild?.id, user: member.id });

			Font.loadDefault();
			const card = new RankCardBuilder()
				.setUsername(guildMember.username)
				.setDisplayName(guildMember.displayName)
				.setAvatar(guildMember.displayAvatarURL({ format: 'png', size: 512 }))
				.setCurrentXP(data.xp)
				.setRequiredXP((data.level + 1) * settings.levels.level)
				.setLevel(data.level)
				.setBackground('https://shadowdevs.com/img/cozyFluff.jpg');
			const pngBuffer = await card.build({
				format: 'png',
			});

			interaction.reply({
				files: [pngBuffer],
				flags: MessageFlags.Ephemeral,
			});
		} else if (cmd === 'leaderboard') {
			const leaders = await client.db
				.collection('levels')
				.find({ id: interaction.guild?.id })
				.sort({ level: -1 })
				.limit(10)
				.toArray();

			interaction.reply({
				content: `# Top 10 Levels\n1. <@${leaders[0].user}>: ${leaders[0].level} (${leaders[0].xp}xp)`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
