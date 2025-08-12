const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('steal')
		.setDescription('Steal an emoji or sticker.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('emoji')
				.setDescription('Steal an emoji.')
				.addStringOption((option) =>
					option
						.setName('emote')
						.setDescription('The emoji, emote ID, or URL.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription(
							'New name for the emote; otherwise, the current one will be used.'
						)
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('sticker')
				.setDescription('Steal a sticker.')
				.addStringOption((option) =>
					option
						.setName('sticker')
						.setDescription('The sticker ID, URL, or message ID.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription(
							'New name for the sticker; otherwise, the current one will be used.'
						)
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('emote')
						.setDescription(
							'The "related emoji". Must be default Discord emoji or from this server.'
						)
						.setRequired(false)
				)
		)
		.setDefaultMemberPermissions(0x0000080000000000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const cmd = interaction.options.getSubcommand();
		const emote = interaction.options.getString('emote');
		const newName = interaction.options.getString('name');

		if (cmd === 'emoji') {
			if (emote.includes('https://cdn.discordapp.com/emojis/')) {
				const name = emote.split('/emojis/')[1].split('.')[0];
				const upload = await interaction.guild.emojis.create({
					attachment: emote,
					name: newName || name,
					reason: 'Stolen Emote ;)',
				});

				interaction.reply({
					content: `## Emoji Added!\n- **Emote:** ${upload}\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\``,
				});
			} else if (emote.includes('<:')) {
				const name = emote.split('<:')[1].split(':')[0];
				const id = emote.split('<:')[1].split(':')[1].split('>')[0];
				const upload = await interaction.guild.emojis.create({
					attachment: `https://cdn.discordapp.com/emojis/${id}.webp?size=128&animated=true`,
					name: newName || name,
					reason: 'Stolen Emote ;)',
				});

				interaction.reply({
					content: `## Emoji Added!\n- **Emote:** ${upload}\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\``,
				});
			} else if (Number(emote) !== NaN) {
				const upload = await interaction.guild.emojis.create({
					attachment: `https://cdn.discordapp.com/emojis/${emote}.webp?size=128&animated=true`,
					name: newName || emote,
					reason: 'Stolen Emote ;)',
				});

				interaction.reply({
					content: `## Emoji Added!\n- **Emote:** ${upload}\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\``,
				});
			}
		} else if (cmd === 'sticker') {
			const sticker = interaction.options.getString('sticker');
			let msg;
			try {
				msg = await interaction.channel.messages.fetch(sticker);
			} catch (error) {
				msg = null;
			}

			if (sticker.includes('https://media.discordapp.net/stickers/')) {
				const name = sticker.split('/stickers/')[1].split('.')[0];
				const upload = await interaction.guild.stickers.create({
					file: sticker,
					name: newName || name,
					tags: emote || null,
					reason: 'Stolen Sticker ;)',
				});

				interaction.reply({
					content: `## Sticker Added!\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\`\n- **Sticker:** *Sent Below*`,
				});
				interaction.channel.send({
					content: '*Stolen Sticker Preview*',
					stickers: [upload],
				});
			} else if (Number(sticker) !== NaN && !msg) {
				const upload = await interaction.guild.stickers.create({
					file: `https://media.discordapp.net/stickers/${sticker}.png?size=160`,
					name: newName || sticker,
					tags: emote || null,
					reason: 'Stolen Sticker ;)',
				});

				interaction.reply({
					content: `## Sticker Added!\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\`\n- **Sticker:** *Sent Below*`,
				});
				interaction.channel.send({
					content: '*Stolen Sticker Preview*',
					stickers: [upload],
				});
			} else if (msg) {
				const stickerData = msg.stickers.values().next().value;
				const upload = await interaction.guild.stickers.create({
					file: `https://media.discordapp.net/stickers/${stickerData.id}.png?size=160`,
					name: newName || stickerData.name,
					tags: emote || null,
					reason: 'Stolen Sticker ;)',
				});

				interaction.reply({
					content: `## Sticker Added!\n- **Name:** \`${upload.name}\`\n- **ID:** \`${upload.id}\`\n- **Sticker:** *Sent Below*`,
				});
				interaction.channel.send({
					content: '*Stolen Sticker Preview*',
					stickers: [upload],
				});
			}
		}
	},
};
