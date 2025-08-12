const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reactrole')
		.setDescription('Interact with role reactions.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Create a new reaction role.')
				.addStringOption((option) =>
					option
						.setName('msg')
						.setDescription('The message ID for the reaction role.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription(
							'The emoji for the reaction role. Must be from this server or default.'
						)
						.setRequired(true)
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('The role to gain/remove when reacting/unreacting.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Delete a reaction role from a message.')
				.addStringOption((option) =>
					option
						.setName('msg')
						.setDescription('The message ID for the reaction role.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('The emoji for the reaction role.')
						.setRequired(true)
				)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const cmd = interaction.options.getSubcommand();

		if (cmd === 'create') {
			const msgId = interaction.options.getString('msg');
			const emoji = interaction.options.getString('emoji');
			const role = interaction.options.getRole('role');

			const regex = emoji.replace(/^<a?:\w+:(\d+)>$/, '$1');
			const fEmoji = interaction.guild.emojis.cache.find(
				(emj) => emj.name === emoji || emj.id === regex
			);

			try {
				const msg = await interaction.channel.messages.fetch(msgId);

				if (fEmoji) {
					msg.react(fEmoji);
				} else if (emoji.includes('<:')) {
					return interaction.reply({
						content: `Error Occurred. | Unable to find the emoji you provided. | Make sure it is from this server or a default Discord emoji.`,
						flags: MessageFlags.Ephemeral,
					});
				} else {
					msg.react(emoji);
				}

				await client.db.collection('reactRoles').insertOne({
					id: interaction.guild.id,
					msg: msgId,
					emoji: fEmoji ? fEmoji.id : emoji,
					role: role.id,
				});
				return interaction.reply({
					content: `Reaction Successfully Added.`,
					flags: MessageFlags.Ephemeral,
				});
			} catch (err) {
				console.error(err);
				return interaction.reply({
					content: `Error Occurred. | Please ensure you run the command containing the message.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		} else if (cmd === 'remove') {
			const msgId = interaction.options.getString('msg');
			const emoji = interaction.options.getString('emoji');
			const regex = emoji.replace(/^<a?:\w+:(\d+)>$/, '$1');
			const fEmoji = interaction.guild.emojis.cache.find(
				(emj) => emj.name === emoji || emj.id === regex
			);

			try {
				const msg = await interaction.channel.messages.fetch(msgId);

				await msg.reactions.cache.get(fEmoji ? fEmoji.id : emoji)?.remove();
				await client.db.collection('reactRoles').deleteOne({
					id: interaction.guild.id,
					msg: msgId,
					emoji: fEmoji ? fEmoji.id : emoji,
				});
				return interaction.reply({
					content: `Reaction Successfully Removed.`,
					flags: MessageFlags.Ephemeral,
				});
			} catch (err) {
				console.error(err);
				return interaction.reply({
					content: `Error Occurred. | Please ensure you run the command containing the message.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
