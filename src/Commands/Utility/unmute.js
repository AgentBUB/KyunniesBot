const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
	EmbedBuilder,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Save someone from the dungeon.')
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The user to send to the dungeon.')
				.setRequired(true)
		)
		.setDefaultMemberPermissions(0x0000010000000000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const settings = await client.db
			.collection('settings')
			.findOne({ id: interaction.guild ? interaction.guild.id : null });
		if (!settings.muteRole)
			interaction.reply({
				content: `You must set a mute role within the settings first.`,
				flags: MessageFlags.Ephemeral,
			});

		const member = interaction.options.get('user')?.user;
		const user = await interaction.guild.members.fetch(member.id);

		try {
			const currentlyMuted = await client.db.collection('muted').findOne({
				id: interaction.guild.id,
				user: user.id,
			});

			if (user.roles.cache.has(settings.muteRole))
				await user.roles.remove(settings.muteRole);

			if (currentlyMuted) {
				for (const role of currentlyMuted.roles) {
					try {
						await user.roles.add(role);
					} catch (error) {
						// fuck off
					}
				}

				await client.db.collection('muted').deleteOne({
					id: interaction.guild.id,
					user: user.id,
				});
			}

			interaction.reply({
				content: `${user} has been unmuted and their previous roles ${
					currentlyMuted ? 'have been restored' : 'were not restored'
				}.`,
				flags: MessageFlags.Ephemeral,
			});

			const modChannel = interaction.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.mute
			);
			if (modChannel) {
				const embed = new EmbedBuilder()
					.setColor('Green')
					.setTitle('Unmuted User')
					.setThumbnail(user.displayAvatarURL({ dynamic: true }))
					.addFields([
						{
							name: 'User',
							value: `${member} (${member.id})`,
							inline: true,
						},
						{
							name: 'Done By',
							value: `${interaction.user} (${interaction.user.id})`,
							inline: true,
						},
					])
					.setTimestamp()
					.setFooter({ text: 'Shadow Logging System' });

				await modChannel.send({ embeds: [embed] }).catch(console.error);
			}
		} catch (error) {
			console.error(error);
			interaction.reply({
				content: `${user} was not unmuted. Error: \`${error.message}\``,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

function parseTimeString(timeString) {
	const cleanTime = timeString.trim();
	let match = cleanTime.match(/^(\d+)([smh])?$/);
	if (!match) {
		throw new Error(
			'Invalid time format. Use format like "1m", "30s", "2h", or just "30" for minutes'
		);
	}

	const number = parseInt(match[1]);
	const unit = match[2] || 'm'; // default to minutes

	let milliseconds;
	switch (unit) {
		case 's':
			milliseconds = number * 1000;
			break;
		case 'm':
			milliseconds = number * 60 * 1000;
			break;
		case 'h':
			milliseconds = number * 60 * 60 * 1000;
			break;
		default:
			throw new Error('Invalid unit. Use s, m, or h');
	}

	const futureDate = new Date(Date.now() + milliseconds);

	const unixTimestamp = Math.floor(futureDate.getTime() / 1000);

	return {
		date: futureDate,
		unix: unixTimestamp,
		milliseconds: milliseconds,
	};
}
