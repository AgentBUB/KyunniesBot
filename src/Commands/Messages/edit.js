const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('edit')
		.setDescription('Edit a message the bot has sent.')
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('This ID of the message you whish to edit.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription(
					'The new message. To add to the end, type "++" at the start. ("<br>" = new line.)'
				)
				.setRequired(true)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const msgId = interaction.options.getString('id');
		let text = interaction.options.getString('message').replace(/<br>/gi, `\n`);

		try {
			const msg = await interaction.channel.messages.fetch(msgId);
			if (text.startsWith('++')) {
				text = msg.content + text;
			}
			return msg.edit(text).then(
				interaction.reply({
					content: `Message successfully edited.`,
					flags: MessageFlags.Ephemeral,
				})
			);
		} catch (err) {
			return interaction.reply({
				content: `Please re-run the command in the channel that contains that message.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
