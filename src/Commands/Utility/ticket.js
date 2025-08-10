const {
	SlashCommandBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription(
			'Interact with tickets or create a new ticket button (attaches to pre-made embed).'
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription(
					'Add a ticket open button to pre-made message from this bot.'
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('Ticket Type (Preset).')
						.setRequired(true)
						.setChoices(
							{ name: 'Reports', value: 'report' },
							{ name: 'Custom', value: 'custom' }
						)
				)
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription(
							'This ID of the message you whish to add a button to.'
						)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('support')
						.setDescription(
							'Role IDs (must be role ID) for the "ticket support". | Separate with a comma (,) and NO spaces.'
						)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('buttoncolor')
						.setDescription('The color of the button.')
						.setRequired(true)
						.setChoices(
							{ name: 'Blurple', value: 'Primary' },
							{ name: 'Grey', value: 'Secondary' },
							{ name: 'Green', value: 'Success' },
							{ name: 'Red', value: 'Danger' }
						)
				)
				.addStringOption((option) =>
					option
						.setName('buttontext')
						.setDescription('The text on the button.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('buttonemoji')
						.setDescription(
							'The emoji on the button. | Ensure to use default emojis or custom emojis that the bot can access.'
						)
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Where is the message for the button located?')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add a user or role to the ticket.')
				.addMentionableOption((option) =>
					option
						.setName('input')
						.setDescription('The role or user you wish to add to the ticket.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Remove a user or role from the ticket.')
				.addUserOption((option) =>
					option
						.setName('input')
						.setDescription('The user you wish to remove from the ticket.')
						.setRequired(true)
				)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const cmd = interaction.options.getSubcommand();

		if (cmd === 'create') {
			if (!client.owners.includes(interaction.user.id))
				return interaction.reply({
					content: `You do not have permissions to access this command.`,
					flags: MessageFlags.Ephemeral,
				});

			try {
				const type = interaction.options.getString('type');
				const buttonColor = interaction.options.getString('buttoncolor');
				const buttonText = interaction.options.getString('buttontext');
				const buttonEmoji = interaction.options.getString('buttonemoji');
				const support = interaction.options.getString('support');
				const msgId = interaction.options.getString('id');
				const channel = interaction.options.getChannel('channel');
				const customId = `openTicket_${buttonText}_${Math.floor(
					Math.random() * channel
				)}_${msgId}_${Math.floor(Math.random() * msgId)}`;

				const regex = buttonEmoji.replace(/^<a?:\w+:(\d+)>$/, '$1');
				const fEmoji = interaction.guild.emojis.cache.find(
					(emj) => emj.name === buttonEmoji || emj.id === regex
				);
				let emoji = buttonEmoji;
				if (fEmoji) {
					emoji = fEmoji;
				}

				const msg = await channel.messages.fetch(msgId);
				let buttons = msg.components;
				if (buttons.length) buttons = msg.components.pop().components;

				buttons.push(
					new ButtonBuilder()
						.setStyle(buttonColor)
						.setCustomId(customId)
						.setLabel(buttonText)
						.setEmoji(emoji)
				);
				const row = new ActionRowBuilder().addComponents(buttons);

				await msg.edit({
					contents: msg.content,
					embeds: msg.embeds ? msg.embeds : [],
					components: [row],
				});

				await client.db.collection('ticketButton').insertOne({
					id: interaction.guild.id,
					type,
					msgID: msgId,
					channel: channel.id,
					customId: customId.toString(),
					support: support.split(','),
				});

				return interaction.reply({
					content: `✅ Ticket Creation Complete | Button added to the embed.`,
					flags: MessageFlags.Ephemeral,
				});
			} catch (error) {
				console.log(error);
				return interaction.reply({
					content: `:x: Ticket Creation Failed\`\`\`${error}\`\`\``,
					flags: MessageFlags.Ephemeral,
				});
			}
		} else if (cmd === 'add') {
			const input = interaction.options.getMentionable('input');
			const ticket = await client.db.collection('tickets').findOne({
				id: interaction.guild.id,
				channelId: interaction.channel.id,
			});
			if (!ticket)
				return interaction.reply({
					content: `This channel is not found to be a ticket channel.`,
					flags: MessageFlags.Ephemeral,
				});

			let isSupport = false;
			for (const supportRole of ticket.support) {
				if (interaction.member.roles.cache.has(supportRole)) isSupport = true;
				break;
			}

			if (isSupport || interaction.member.permissions.has('ADMINISTRATOR')) {
				interaction.reply(`${input} has been added to the ticket.`);
			} else {
				interaction.reply({
					content: 'You are required to be Ticket Support to use this command.',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else if (cmd === 'remove') {
			const input = interaction.options.getUser('input');
			const ticket = await client.db.collection('tickets').findOne({
				id: interaction.guild.id,
				channelId: interaction.channel.id,
			});
			if (!ticket)
				return interaction.reply({
					content: `This channel is not found to be a ticket channel.`,
					flags: MessageFlags.Ephemeral,
				});

			let isSupport = false;
			for (const supportRole of ticket.support) {
				if (interaction.member.roles.cache.has(supportRole)) isSupport = true;
				break;
			}

			if (isSupport || interaction.member.permissions.has('ADMINISTRATOR')) {
				await interaction.channel.members.remove(input.id);
				await interaction.reply({
					content: '*Removed User.*',
					flags: MessageFlags.Ephemeral,
				});
				await interaction.deleteReply();
			} else {
				interaction.reply({
					content: 'You are required to be Ticket Support to use this command.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
