const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Open the settings menu to configure this server.')
		.setDefaultMemberPermissions(0x0000000000000020)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const isOwner = client.owners.includes(interaction.user.id);

		const embed = new EmbedBuilder()
			.setTitle(`Settings Menu${isOwner ? ' | Owner Access' : ''}`)
			.setColor('Blurple')
			.setDescription(
				`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				
				**__Categories:__**`
			)
			.addFields([
				{
					name: 'Logs',
					value: "> Set the channel for the bot's logs to be sent to.",
				},
				{
					name: 'Notifications Channels & Status',
					value:
						'> Set what channels notifications go to and what notifications are enabled.',
				},
				{
					name: 'Notifications Pings',
					value: '> Set who gets pinged when notifications are sent.',
				},
				{
					name: 'Chat Filter',
					value: '> Enable the chat filter and configure its settings.',
				},
			])
			.setFooter({
				text: `Kyunnies Bot Settings${isOwner ? ' - Owner Access' : ''}`,
			})
			.setTimestamp();

		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setStyle('Primary')
				.setLabel('Logs')
				.setCustomId(`setLogs-${interaction.user.id}`),
			new ButtonBuilder()
				.setStyle('Primary')
				.setLabel('Notification Channels & Status')
				.setCustomId(`setNotify-${interaction.user.id}`),
			new ButtonBuilder()
				.setStyle('Primary')
				.setLabel('Notification Pings')
				.setCustomId(`setPing-${interaction.user.id}`),
			new ButtonBuilder()
				.setStyle('Primary')
				.setLabel('Mute Role')
				.setCustomId(`setMuteRole-${interaction.user.id}`),
			new ButtonBuilder()
				.setStyle('Primary')
				.setLabel('Chat Filter')
				.setCustomId(`setChatFilter-${interaction.user.id}`)
		);

		let ownerButtons;
		if (isOwner) {
			ownerButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Twitch API Keys')
					.setCustomId(`${interaction.user.id}-setModal_twitch`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Youtube API Keys')
					.setCustomId(`${interaction.user.id}-setModal_youtube`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Twitter API Keys')
					.setCustomId(`${interaction.user.id}-setModal_twitter`)
			);
		}

		let components = [buttons];
		if (isOwner) components = [buttons, ownerButtons];

		await interaction.reply({
			embeds: [embed],
			components,
		});
	},
};
