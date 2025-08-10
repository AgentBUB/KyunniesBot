const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('react')
		.setDescription('Add an emoji to a message.')
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('This ID of the message you whish to react to.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('emoji')
				.setDescription('The emoji that you want reacted to a message.')
				.setRequired(true)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		if (interaction.partial) await interaction.fetch();
		const msgId = interaction.options.getString('id');
		const emoji = interaction.options.getString('emoji');

		const regex = emoji.replace(/^<a?:\w+:(\d+)>$/, '$1');
		const fEmoji = interaction.guild.emojis.cache.find(
			(emj) => emj.name === emoji || emj.id === regex
		);

		try {
			const msg = await interaction.channel.messages.fetch(msgId);

			if (fEmoji) {
				msg.react(fEmoji);
			} else {
				msg.react(emoji);
			}
			return interaction.reply({
				content: `Reaction Successfully Added.`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			return interaction.reply({
				content: `Please re-run the command in the channel that contains that message.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
