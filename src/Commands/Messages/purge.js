const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Delete 1 to 100 messages from a channel.')
		.addNumberOption((option) =>
			option
				.setName('number')
				.setDescription('The number of messages to delete.')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)
		)
		.setDefaultMemberPermissions(0x0000000000002000),
	run: async (client, interaction) => {
		const number = interaction.options.getNumber('number');

		try {
			deleteLastMessages(interaction.channel, number);
			return interaction.reply({
				content: `:white_check_mark: Purging ${number} messages.\nNote: Messages over 2 weeks old may not be purged.`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			return interaction.reply({
				content: `:x: There was an error while trying to delete messages.\n\`\`\`${err}\`\`\``,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

async function deleteLastMessages(channel, num) {
	const messages = await channel.messages.fetch({ limit: num });
	const nonPinnedMessages = messages.filter((msg) => !msg.pinned);

	await channel.bulkDelete(nonPinnedMessages, true);
}
