const {
	SlashCommandBuilder,
	EmbedBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Create/Modify an embed message.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription(
					'Turn a normal message into a fancy embed. | The main body is set after running this command.'
				)
				.addStringOption((option) =>
					option
						.setName('title')
						.setDescription('The title of the embed.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('color')
						.setDescription('The hex color of the poll embed.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('thumbnail')
						.setDescription('The imagine link for the embed thumbnail.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('image')
						.setDescription('The imagine link for the embed image.')
						.setRequired(false)
				)
				.addRoleOption((option) =>
					option
						.setName('ping')
						.setDescription('Who would you like to ping?')
						.setRequired(false)
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Where you want the embed to be sent.')
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Edit the contents of a currently posted embed.')
				.addStringOption((option) =>
					option
						.setName('msgid')
						.setDescription('The ID of the message you want to edit.')
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Channel where the message is located.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('title')
						.setDescription('The title of the embed.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('color')
						.setDescription('The hex color of the poll embed.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('thumbnail')
						.setDescription('The imagine link for the embed thumbnail.')
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('image')
						.setDescription('The imagine link for the embed image.')
						.setRequired(false)
				)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const type = interaction.options.getSubcommand();
		if (type === 'edit') {
			let channel = interaction.options.getChannel('channel');
			channel = await client.channels.fetch(channel.id);
			const msgId = interaction.options.getString('msgid');
			const msg = await channel.messages.fetch(msgId).catch(() => {
				return false;
			});
			if (!msg)
				return interaction.reply({
					content: `Unable to find the message. | Please check the message ID provided.`,
					flags: MessageFlags.Ephemeral,
				});
			const title = interaction.options.getString('title');
			let color = interaction.options.getString('color');
			const thumbnail = interaction.options.getString('thumbnail');
			const image = interaction.options.getString('image');

			const embed = new EmbedBuilder().setColor(
				color || msg.embeds[0].data.color
			);
			if (title !== null) {
				embed.setTitle(title);
			} else if (msg.embeds[0].data.title) {
				embed.setTitle(msg.embeds[0].data.title);
			}
			if (thumbnail) {
				embed.setThumbnail(thumbnail);
			} else if (msg.embeds[0].data.thumbnail) {
				embed.setThumbnail(msg.embeds[0].data.thumbnail.url);
			}
			if (image) {
				embed.setImage(image);
			} else if (msg.embeds[0].data.image) {
				embed.setImage(msg.embeds[0].data.image.url);
			}

			console.log(embed);
			interaction
				.reply({
					content:
						'Please provide the content for the embed as one single message (type `null` to keep current.):',
					flags: MessageFlags.Ephemeral,
				})
				.then(() => {
					const filter = (msg) => interaction.user.id === msg.author.id;

					interaction.channel
						.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] })
						.then((messages) => {
							if (messages.first().content === 'null') {
								embed.setDescription(msg.embeds[0].data.description);
							} else {
								embed.setDescription(messages.first().content);
							}
							messages.first().delete();
							msg.edit({
								embeds: [embed],
								content: msg.content,
								components: msg.components,
							});
							interaction.followUp({
								content: 'Embed successfully edited!',
								flags: MessageFlags.Ephemeral,
							});
						})
						.catch(() => {
							embed.setDescription(msg.embeds[0].data.description);
							msg.edit({
								embeds: [embed],
								content: msg.content,
								components: msg.components,
							});
							interaction.followUp({
								content:
									'Embed successfully edited with no description change.',
								flags: MessageFlags.Ephemeral,
							});
						});
				});
		} else if (type === 'create') {
			const title = interaction.options.getString('title');
			let color = interaction.options.getString('color');
			if (!color) color = 'DarkGrey';
			const thumbnail = interaction.options.getString('thumbnail');
			const image = interaction.options.getString('image');
			const ping = interaction.options.getRole('ping');
			let channel = interaction.options.getChannel('channel');
			if (!channel) channel = interaction.channel;

			const embed = new EmbedBuilder().setColor(color);

			if (title !== null) embed.setTitle(title);
			if (thumbnail) embed.setThumbnail(thumbnail);
			if (image) embed.setImage(image);

			interaction
				.reply({
					content:
						'Please provide the content for the embed *(one single message)*:',
					flags: MessageFlags.Ephemeral,
				})
				.then(() => {
					const filter = (msg) => interaction.user.id === msg.author.id;

					interaction.channel
						.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] })
						.then((messages) => {
							embed.setDescription(messages.first().content);
							messages.first().delete();
							if (ping) {
								channel.send({ content: `<@&${ping.id}>`, embeds: [embed] });
							} else {
								channel.send({ embeds: [embed] });
							}
							interaction.followUp({
								content: 'Embed successfully created & sent!',
								flags: MessageFlags.Ephemeral,
							});
						})
						.catch(() => {
							interaction.followUp({
								content:
									"You didn't provide any content. | Embed Creation Aborted",
								flags: MessageFlags.Ephemeral,
							});
						});
				});
		}
	},
};
