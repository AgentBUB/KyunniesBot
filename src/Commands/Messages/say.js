const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Make the bot say something.')
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription(
					'The message you want the bot to send. (Use "<br>" to create a new line.)'
				)
				.setRequired(true)
		)
		.addChannelOption((option) =>
			option
				.setName('channel')
				.setDescription('Where you want the message to be sent.')
				.setRequired(false)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const text = interaction.options
			.getString('message')
			.replace(/<br>/gi, `\n`);
		const channel = interaction.options.getChannel('channel');

		if (channel === null)
			return (
				interaction.channel.send(text) &&
				interaction.reply({
					content: 'I have sent the message provided.',
					flags: MessageFlags.Ephemeral,
				})
			);
		return (
			channel.send(`${text}`) &&
			interaction.reply({
				content: `I have sent the message provided in ${channel}.`,
				flags: MessageFlags.Ephemeral,
			})
		);
	},
};
