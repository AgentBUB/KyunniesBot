const {
	EmbedBuilder,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ChannelSelectMenuBuilder,
	ChannelType,
	StringSelectMenuBuilder,
	TextInputStyle,
	ModalBuilder,
	TextInputBuilder,
} = require('discord.js');

module.exports = {
	name: 'interactionCreate',
	execute: async (interaction, client) => {
		if (!interaction.guild) return;
		const { customId } = interaction;

		const settings = await client.db
			.collection('settings')
			.findOne({ id: interaction.guild.id });
		if (!settings) return;
		const isOwner = client.owners.includes(interaction.user.id);

		const embed = new EmbedBuilder().setColor('Blurple');
		const buttons = new ActionRowBuilder();

		if (!customId) return;

		if (customId === `getHome-${interaction.user.id}`) {
			embed
				.setTitle(`Settings Menu${isOwner ? ' | Owner Access' : ''}`)
				.setDescription(
					`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*
				
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
						value:
							'> Enable/Disable the chat filter and configure its settings.',
					},
					{
						name: 'Levels',
						value:
							'> Change xp gain, level requirements, roles for levels, etc.',
					},
				])
				.setFooter({
					text: `Kyunnies Bot Settings System`,
				})
				.setTimestamp();

			buttons.addComponents(
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
					.setCustomId(`setMuteRole-${interaction.user.id}`)
			);
			const buttonsTwo = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Chat Filter')
					.setCustomId(`setChatFilter-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Levels')
					.setCustomId(`setLevels-${interaction.user.id}`)
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
			let components = [buttons, buttonsTwo];
			if (isOwner) components = [buttons, buttonsTwo, ownerButtons];

			try {
				await interaction.message.edit({
					embeds: [embed],
					components,
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`getHome Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}

		if (customId === `setLogs-${interaction.user.id}`) {
			embed.setTitle('Settings Menu | Logs').setDescription(
				`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*

				**__Notice:__**
				> Due to Discord's limit, sadly the drop down can only display 25 options. So, the bot filters the options some, but feel free to use the "Other Input" button alongside a [Discord Channel ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID#h_01HRSTXPS5FMK2A5SMVSX4JW4E) to add a non-listed item.

				**__Actions:__**`
			);

			const ticketSelect = new ChannelSelectMenuBuilder()
				.setCustomId(`setLogs-${interaction.user.id}_ticketChannel`)
				.setPlaceholder('Channel where ticket data is logged.')
				.setChannelTypes(ChannelType.GuildText);
			if (settings.logs.tickets)
				ticketSelect.setDefaultChannels(settings.logs.tickets);
			const transcriptSelect = new ChannelSelectMenuBuilder()
				.setCustomId(`setLogs-${interaction.user.id}_transcriptChannel`)
				.setPlaceholder('Channel where transcripts are logged.')
				.addChannelTypes(ChannelType.GuildText);
			if (settings.logs.transcripts)
				transcriptSelect.setDefaultChannels(settings.logs.transcripts);
			const muteSelect = new ChannelSelectMenuBuilder()
				.setCustomId(`setLogs-${interaction.user.id}_muteChannel`)
				.setPlaceholder('Channel where mute/chat filter actions are logged.')
				.addChannelTypes(ChannelType.GuildText);
			if (settings.logs.mute) muteSelect.setDefaultChannels(settings.logs.mute);
			const generalSelect = new ChannelSelectMenuBuilder()
				.setCustomId(`setLogs-${interaction.user.id}_generalChannel`)
				.setPlaceholder('Channel where general actions are logged.')
				.addChannelTypes(ChannelType.GuildText);
			if (settings.logs.general)
				generalSelect.setDefaultChannels(settings.logs.general);

			const selectTicket = new ActionRowBuilder().addComponents(ticketSelect);
			const selectTranscript = new ActionRowBuilder().addComponents(
				transcriptSelect
			);
			const selectMute = new ActionRowBuilder().addComponents(muteSelect);
			const selectGeneral = new ActionRowBuilder().addComponents(generalSelect);
			buttons.addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334130947620974')
					.setLabel('Back')
					.setCustomId(`getHome-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334132180619365')
					.setLabel('Refresh List')
					.setCustomId(`setLogs-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setEmoji('1342400401688891412')
					.setLabel('Other Input')
					.setCustomId(`${interaction.user.id}-setModal_logs`)
			);

			try {
				await interaction.message.edit({
					embeds: [embed],
					components: [
						selectTicket,
						selectTranscript,
						selectMute,
						selectGeneral,
						buttons,
					],
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`setLogs Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}
		if (customId === `setLogs-${interaction.user.id}_ticketChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'logs.tickets': channelId } }
				);

			interaction.reply({
				content: `Set ticket data logs to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setLogs-${interaction.user.id}_transcriptChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'logs.transcripts': channelId } }
				);

			interaction.reply({
				content: `Set ticket transcript logs to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setLogs-${interaction.user.id}_muteChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'logs.mute': channelId } }
				);

			interaction.reply({
				content: `Set mute command action logs to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setLogs-${interaction.user.id}_generalChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'logs.general': channelId } }
				);

			interaction.reply({
				content: `Set general action logs to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId === `setNotify-${interaction.user.id}`) {
			embed
				.setTitle('Settings Menu | Notification Channels & Status')
				.setDescription(
					`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*

				**__Notice:__**
				> Due to Discord's limit, sadly the drop down can only display 25 options. So, the bot filters the options some, but feel free to use the "Other Input" button alongside a [Discord Channel ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID#h_01HRSTXPS5FMK2A5SMVSX4JW4E) to add a non-listed item.

				**__Actions:__**`
				);

			const twitchChannel = new ChannelSelectMenuBuilder()
				.setCustomId(`setNotify-${interaction.user.id}_twitchChannel`)
				.setPlaceholder('Where notifications for Twitch are sent.')
				.setChannelTypes(ChannelType.GuildText);
			if (settings.notifications.twitch.channel)
				twitchChannel.setDefaultChannels(settings.notifications.twitch.channel);
			const twitterChannel = new ChannelSelectMenuBuilder()
				.setCustomId(`setNotify-${interaction.user.id}_twitterChannel`)
				.setPlaceholder('Where notifications for Twitter are sent.')
				.setChannelTypes(ChannelType.GuildText);
			if (settings.notifications.twitter.channel)
				twitterChannel.setDefaultChannels(
					settings.notifications.twitter.channel
				);

			let youtubeChannel = new ChannelSelectMenuBuilder()
				.setCustomId(`setNotify-${interaction.user.id}_youtubeChannel`)
				.setPlaceholder('Where notifications for Youtube are sent.')
				.setChannelTypes(ChannelType.GuildText);
			if (
				settings.notifications.youtube.channel[
					settings.youtubeDetails.channelId[0]
				]
			)
				youtubeChannel.setDefaultChannels(
					settings.notifications.youtube.channel[
						settings.youtubeDetails.channelId[0]
					]
				);
			if (settings.youtubeDetails.channelId.length > 1) {
				youtubeChannel = new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Youtube Notification Channels Editor')
					.setCustomId(`editYoutubeChannels-${interaction.user.id}`);
			}

			const twitchRow = new ActionRowBuilder().addComponents(twitchChannel);
			const twitterRow = new ActionRowBuilder().addComponents(twitterChannel);
			const youtubeRow = new ActionRowBuilder().addComponents(youtubeChannel);
			const enableButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle(
						settings.notifications.twitch.enabled ? 'Success' : 'Danger'
					)
					.setLabel(
						settings.notifications.twitch.enabled
							? 'Twitch: Enabled'
							: 'Twitch: Disabled'
					)
					.setCustomId(`enableTwitch-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle(
						settings.notifications.youtube.enabled ? 'Success' : 'Danger'
					)
					.setLabel(
						settings.notifications.youtube.enabled
							? 'Youtube: Enabled'
							: 'Youtube: Disabled'
					)
					.setCustomId(`enableYoutube-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle(
						settings.notifications.twitter.enabled ? 'Success' : 'Danger'
					)
					.setLabel(
						settings.notifications.twitter.enabled
							? 'Twitter: Enabled'
							: 'Twitter: Disabled'
					)
					.setCustomId(`enableTwitter-${interaction.user.id}`)
			);
			buttons.addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334130947620974')
					.setLabel('Back')
					.setCustomId(`getHome-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334132180619365')
					.setLabel('Refresh List')
					.setCustomId(`setNotify-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setEmoji('1342400401688891412')
					.setLabel('Other Input')
					.setCustomId(`${interaction.user.id}-setModal_notify`)
			);

			try {
				await interaction.message.edit({
					embeds: [embed],
					components: [
						twitchRow,
						twitterRow,
						youtubeRow,
						enableButtons,
						buttons,
					],
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`setLogs Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}
		if (customId === `setNotify-${interaction.user.id}_twitchChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'notifications.twitch.channel': channelId } }
				);

			interaction.reply({
				content: `Set twitch channel notifications to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setNotify-${interaction.user.id}_youtubeChannel`) {
			const channelId = interaction.channels.keys().next().value;

			const channelData = {};
			channelData[settings.youtubeDetails.channelId[0]] = channelId;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'notifications.youtube.channel': channelData } }
				);

			interaction.reply({
				content: `Set youtube channel notifications to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setNotify-${interaction.user.id}_twitterChannel`) {
			const channelId = interaction.channels.keys().next().value;

			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'notifications.twitter.channel': channelId } }
				);

			interaction.reply({
				content: `Set twitter channel notifications to <#${channelId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `enableTwitch-${interaction.user.id}`) {
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'notifications.twitch.enabled':
							!settings.notifications.twitch.enabled,
					},
				}
			);

			interaction.reply({
				content: `Changed Twitch Status to: ${
					!settings.notifications.twitch.enabled ? 'Enabled' : 'Disabled'
				}.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `enableYoutube-${interaction.user.id}`) {
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'notifications.youtube.enabled':
							!settings.notifications.youtube.enabled,
					},
				}
			);

			interaction.reply({
				content: `Changed Youtube Status to: ${
					!settings.notifications.youtube.enabled ? 'Enabled' : 'Disabled'
				}.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `enableTwitter-${interaction.user.id}`) {
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'notifications.twitter.enabled':
							!settings.notifications.twitter.enabled,
					},
				}
			);

			interaction.reply({
				content: `Changed Twitter Status to: ${
					!settings.notifications.twitter.enabled ? 'Enabled' : 'Disabled'
				}.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `editYoutubeChannels-${interaction.user.id}`) {
			const modal = new ModalBuilder()
				.setCustomId(`editYoutubeChannels_submit`)
				.setTitle(`Youtube Notification Channel Editor`);

			for (const channelId of settings.youtubeDetails.channelId) {
				const input = new TextInputBuilder()
					.setLabel(`Channel ID for: ${channelId}`)
					.setStyle(TextInputStyle.Short)
					.setCustomId(`notifyChannel-${channelId}`)
					.setMaxLength(30)
					.setMinLength(17)
					.setRequired(false);
				if (settings.notifications.youtube.channel[channelId])
					input.setValue(settings.notifications.youtube.channel[channelId]);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
			}

			await interaction.showModal(modal);
		}
		if (
			interaction.isModalSubmit() &&
			customId === 'editYoutubeChannels_submit'
		) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const updated = {};
			const updatedPublic = [];

			for (const channelId of settings.youtubeDetails.channelId) {
				const input = interaction.fields.getTextInputValue(
					`notifyChannel-${channelId}`
				);

				updated[channelId] = input;
				updatedPublic.push(
					`[\`${channelId}\`](https://www.youtube.com/channel/${channelId}): ${
						input.length > 1 ? `<#${input}>` : 'None'
					}`
				);
			}
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'notifications.youtube.channel': updated,
					},
				}
			);

			await interaction.editReply({
				content: `The following channels were updated to settings:\n> - ${
					updatedPublic.length > 0 ? updatedPublic.join('\n> - ') : 'None'
				}`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId === `setPing-${interaction.user.id}`) {
			embed.setTitle('Settings Menu | Notification Pings').setDescription(
				`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*

				**__Notices:__**
				> Due to Discord's limit, sadly the drop down can only display 25 options. So, the bot filters the options some, but feel free to use the "Other Input" button alongside a [Discord Channel ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID#h_01HRSTXPS5FMK2A5SMVSX4JW4E) to add a non-listed item.

				**__Actions:__**`
			);

			const generateRoleOptions = (selectedRoleId) => {
				const roleOptions = [
					{
						label: 'Disabled',
						value: 'null',
						emoji: '1342356500605308969',
						default: false,
					},
					{
						label: 'everyone',
						value: 'everyone',
						emoji: '1342360974983823410',
						default: selectedRoleId == 'everyone',
					},
					{
						label: 'here',
						value: 'here',
						emoji: '1342360974983823410',
						default: selectedRoleId == 'here',
					},
				];

				const allRoles = interaction.guild.roles.cache
					.filter((role) => role.name !== '@everyone')
					.map((role) => ({
						label: role.name,
						value: role.id,
						emoji: '1342360974983823410',
						default: role.id === selectedRoleId,
					}));

				roleOptions.push(...allRoles);

				return roleOptions.slice(0, 25);
			};

			const twitch = new StringSelectMenuBuilder()
				.setCustomId(`setPing-${interaction.user.id}_twitch`)
				.setPlaceholder('What is pinged for Twitch notifications.')
				.addOptions(generateRoleOptions(settings.notifications.twitch.ping));
			const twitter = new StringSelectMenuBuilder()
				.setCustomId(`setPing-${interaction.user.id}_twitter`)
				.setPlaceholder('What is pinged for Twitter notifications.')
				.addOptions(generateRoleOptions(settings.notifications.twitter.ping));

			let youtube = new StringSelectMenuBuilder()
				.setCustomId(`setPing-${interaction.user.id}_youtube`)
				.setPlaceholder('What is pinged for Youtube notifications.')
				.addOptions(
					generateRoleOptions(
						settings.notifications.youtube.ping[
							settings.youtubeDetails.channelId[0]
						]
					)
				);
			if (settings.youtubeDetails.channelId.length > 1) {
				youtube = new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Youtube Notification Ping Editor')
					.setCustomId(`editYoutubePings-${interaction.user.id}`);
			}

			const twitchComp = new ActionRowBuilder().addComponents(twitch);
			const youtubeComp = new ActionRowBuilder().addComponents(youtube);
			const twitterComp = new ActionRowBuilder().addComponents(twitter);
			buttons.addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334130947620974')
					.setLabel('Back')
					.setCustomId(`getHome-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334132180619365')
					.setLabel('Refresh List')
					.setCustomId(`setPing-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setEmoji('1342400401688891412')
					.setLabel('Other Input')
					.setCustomId(`${interaction.user.id}-setModal_ping`)
			);

			try {
				await interaction.message.edit({
					embeds: [embed],
					components: [twitchComp, twitterComp, youtubeComp, buttons],
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`setLogs Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}
		if (customId === `setPing-${interaction.user.id}_twitch`) {
			const roleId =
				interaction.values[0] == 'null' ? null : interaction.values[0];

			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: { 'notifications.twitch.ping': roleId },
				}
			);

			interaction.reply({
				content: `Set Twitch notification ping role to <@&${roleId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setPing-${interaction.user.id}_youtube`) {
			const roleId =
				interaction.values[0] == 'null' ? null : interaction.values[0];

			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: { 'notifications.youtube.ping': roleId },
				}
			);

			interaction.reply({
				content: `Set Youtube notification ping role to <@&${roleId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setPing-${interaction.user.id}_twitter`) {
			const roleId =
				interaction.values[0] == 'null' ? null : interaction.values[0];

			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: { 'notifications.twitter.ping': roleId },
				}
			);

			interaction.reply({
				content: `Set Twitter notification ping role to <@&${roleId}>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `editYoutubePings-${interaction.user.id}`) {
			const modal = new ModalBuilder()
				.setCustomId(`editYoutubePings_submit`)
				.setTitle(`Youtube Notification Ping Editor`);

			for (const channelId of settings.youtubeDetails.channelId) {
				const input = new TextInputBuilder()
					.setLabel(`Ping for: ${channelId}`)
					.setStyle(TextInputStyle.Short)
					.setCustomId(`notifyPing-${channelId}`)
					.setPlaceholder('everyone, here, or Role ID')
					.setRequired(false);
				if (settings.notifications.youtube.ping[channelId])
					input.setValue(settings.notifications.youtube.ping[channelId]);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
			}

			await interaction.showModal(modal);
		}
		if (interaction.isModalSubmit() && customId === 'editYoutubePings_submit') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const updated = {};
			const updatedPublic = [];

			for (const channelId of settings.youtubeDetails.channelId) {
				const input = interaction.fields.getTextInputValue(
					`notifyPing-${channelId}`
				);

				updated[channelId] = input;
				if (input == 'everyone') {
					updatedPublic.push(
						`[\`${channelId}\`](https://www.youtube.com/channel/${channelId}): @everyone`
					);
				} else if (input == 'here') {
					updatedPublic.push(
						`[\`${channelId}\`](https://www.youtube.com/channel/${channelId}): @here`
					);
				} else if (input) {
					updatedPublic.push(
						`[\`${channelId}\`](https://www.youtube.com/channel/${channelId}): <@&${input}>`
					);
				} else {
					updatedPublic.push(
						`[\`${channelId}\`](https://www.youtube.com/channel/${channelId}): No Ping`
					);
				}
			}
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'notifications.youtube.ping': updated,
					},
				}
			);

			await interaction.editReply({
				content: `The following pings were updated to settings:\n> - ${
					updatedPublic.length > 0 ? updatedPublic.join('\n> - ') : 'None'
				}`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId === `setMuteRole-${interaction.user.id}`) {
			const modal = new ModalBuilder()
				.setCustomId(`setMuteRole_submit`)
				.setTitle(`Change the mute role ID`);

			const input = new TextInputBuilder()
				.setLabel(`Mute Role`)
				.setStyle(TextInputStyle.Short)
				.setCustomId(`role`)
				.setRequired(true);
			if (settings.muteRole) input.setValue(settings.muteRole);

			modal.addComponents(new ActionRowBuilder().addComponents(input));
			await interaction.showModal(modal);
		}
		if (interaction.isModalSubmit() && customId === 'setMuteRole_submit') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const role = interaction.fields.getTextInputValue(`role`);

			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						muteRole: role,
					},
				}
			);

			await interaction.editReply({
				content: `The following role has been set as the mute role: <@&${role}>`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId === `setChatFilter-${interaction.user.id}`) {
			embed.setTitle('Settings Menu | Chat Filter').setDescription(
				`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*

				**__List of Scam Links:__**
				> These lists are what the bot runs through to prevent phishing or suspicious links from being posted.
				> - Phishing: https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json
				> - Suspicious:https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/suspicious-list.json

				**__Notice:__**
				> Due to Discord's limit, sadly the drop down can only display 25 options. So, the bot filters the options some, but feel free to use the "Other Input" button alongside a [Discord Channel ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID#h_01HRSTXPS5FMK2A5SMVSX4JW4E) to add a non-listed item.
				
				**__Action Details:__**
				> - Warning Message: This is a simple message that pings the user telling them about their violation, then it will delete itself after a few seconds.
				> - Auto Kick: This will automatically kick the user if they violate the filter 3 or more times within 5 minutes.

				**__Actions:__**`
			);

			const settingsButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Whitelists: Users, Roles, Content')
					.setCustomId(`${interaction.user.id}-setModal_filterWhitelist`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Blacklist Content')
					.setCustomId(`${interaction.user.id}-setModal_filterBlacklist`)
			);
			const enableButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle(settings.chatFilter.enabled ? 'Success' : 'Danger')
					.setLabel(
						settings.chatFilter.enabled
							? 'Chat Filter: Enabled'
							: 'Chat Filter: Disabled'
					)
					.setCustomId(`setChatFilter-${interaction.user.id}_enableChatFilter`),
				new ButtonBuilder()
					.setStyle(settings.chatFilter.warningMessage ? 'Success' : 'Danger')
					.setLabel(
						settings.chatFilter.warningMessage
							? 'Warning Message: Enabled'
							: 'Warning Message: Disabled'
					)
					.setCustomId(
						`setChatFilter-${interaction.user.id}_enableWarningMessage`
					),
				new ButtonBuilder()
					.setStyle(settings.chatFilter.autoKick ? 'Success' : 'Danger')
					.setLabel(
						settings.chatFilter.autoKick
							? 'Auto Kick: Enabled'
							: 'Auto Kick: Disabled'
					)
					.setCustomId(`setChatFilter-${interaction.user.id}_enableAutoKick`)
			);
			buttons.addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334130947620974')
					.setLabel('Back')
					.setCustomId(`getHome-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334132180619365')
					.setLabel('Refresh List')
					.setCustomId(`setChatFilter-${interaction.user.id}`)
			);

			try {
				await interaction.message.edit({
					embeds: [embed],
					components: [settingsButtons, enableButtons, buttons],
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`setLogs Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}
		if (customId === `setChatFilter-${interaction.user.id}_enableChatFilter`) {
			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'chatFilter.enabled': !settings.chatFilter.enabled } }
				);

			interaction.reply({
				content: `Changes the status of the **Chat Filter** to: \`${
					!settings.chatFilter.enabled ? 'Disabled' : 'Enabled'
				}\``,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (
			customId === `setChatFilter-${interaction.user.id}_enableWarningMessage`
		) {
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'chatFilter.warningMessage': !settings.chatFilter.warningMessage,
					},
				}
			);

			interaction.reply({
				content: `Changes the status of **Warning Message** to: \`${
					!settings.chatFilter.warningMessage ? 'Disabled' : 'Enabled'
				}\``,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (customId === `setChatFilter-${interaction.user.id}_enableAutoKick`) {
			await client.db.collection('settings').updateOne(
				{ id: interaction.guild.id },
				{
					$set: {
						'chatFilter.autoKick': !settings.chatFilter.autoKick,
					},
				}
			);

			interaction.reply({
				content: `Changes the status of **Auto Kick** to: \`${
					!settings.chatFilter.autoKick ? 'Disabled' : 'Enabled'
				}\``,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId === `setLevels-${interaction.user.id}`) {
			embed.setTitle('Settings Menu | Levels').setDescription(
				`**__Information:__**
				> Manage all the settings for \`${interaction.guild.name}\`.
				> Blue buttons are for configurable settings and grey are for view only.
				> *Note: Only the person who ran the command, can interact with things.*

				**__Notice:__**
				> Due to Discord's limit, sadly the drop down can only display 25 options. So, the bot filters the options some, but feel free to use the "Other Input" button alongside a [Discord Channel ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID#h_01HRSTXPS5FMK2A5SMVSX4JW4E) to add a non-listed item.

				**__Actions:__**`
			);

			const actionButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle(settings.levels.enabled ? 'Success' : 'Danger')
					.setLabel(
						settings.levels.enabled
							? 'Level System: Enabled'
							: 'Level System: Disabled'
					)
					.setCustomId(`enableLevels-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('XP Settings')
					.setCustomId(`${interaction.user.id}-setModal_levelXp`)
			);
			buttons.addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334130947620974')
					.setLabel('Back')
					.setCustomId(`getHome-${interaction.user.id}`),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setEmoji('1342334132180619365')
					.setLabel('Refresh List')
					.setCustomId(`setLevels-${interaction.user.id}`)
			);

			try {
				await interaction.message.edit({
					embeds: [embed],
					components: [actionButtons, buttons],
				});
				await interaction.deferUpdate();
			} catch (error) {
				if (error) {
					console.error(`setLogs Error Occurred:`, error);
					await interaction.reply({
						content:
							'Message no longer editable or an error has occurred. Please rerun `/settings` or get help.',
						flags: MessageFlags.Ephemeral,
					});
					interaction.message.delete();
				}
			}
		}
		if (customId === `enableLevels-${interaction.user.id}`) {
			await client.db
				.collection('settings')
				.updateOne(
					{ id: interaction.guild.id },
					{ $set: { 'levels.enabled': !settings.levels.enabled } }
				);

			interaction.reply({
				content: `Set ticket system status to: ${
					!settings.levels.enabled ? 'Enabled' : 'Disabled'
				}.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (customId.includes(`${interaction.user.id}-setModal_`)) {
			const type = customId.split(`${interaction.user.id}-setModal_`)[1];

			const modal = new ModalBuilder()
				.setCustomId(`setModalSubmit_${type}`)
				.setTitle(`Additional Inputs | ${client.utils.capitalize(type)}`);

			if (type == 'logs') {
				const ticket = new TextInputBuilder()
					.setLabel('Ticket Logs Channel ID')
					.setStyle(TextInputStyle.Short)
					.setCustomId('ticket')
					.setMaxLength(30)
					.setMinLength(17)
					.setRequired(false);
				if (settings.logs.tickets) ticket.setValue(settings.logs.tickets);
				const transcript = new TextInputBuilder()
					.setLabel('Ticket Transcript Logs Channel ID')
					.setStyle(TextInputStyle.Short)
					.setCustomId('transcript')
					.setMaxLength(30)
					.setMinLength(17)
					.setRequired(false);
				if (settings.logs.transcripts)
					transcript.setValue(settings.logs.transcripts);

				modal.addComponents(new ActionRowBuilder().addComponents(ticket));
				modal.addComponents(new ActionRowBuilder().addComponents(transcript));
			} else if (type == 'notify') {
				const twitch = new TextInputBuilder()
					.setLabel('Twitch Channel ID')
					.setStyle(TextInputStyle.Short)
					.setCustomId('twitch')
					.setMaxLength(30)
					.setMinLength(17)
					.setRequired(false);
				if (settings.notifications.twitch.channel)
					twitch.setValue(settings.notifications.twitch.channel);
				const twitter = new TextInputBuilder()
					.setLabel('Twitter Channel ID')
					.setStyle(TextInputStyle.Short)
					.setCustomId('twitter')
					.setMaxLength(30)
					.setMinLength(17)
					.setRequired(false);
				if (settings.notifications.twitter.channel)
					twitter.setValue(settings.notifications.twitter.channel);

				modal.addComponents(new ActionRowBuilder().addComponents(twitch));
				modal.addComponents(new ActionRowBuilder().addComponents(twitter));
			} else if (type == 'ping') {
				const twitch = new TextInputBuilder()
					.setLabel('Twitch Ping')
					.setStyle(TextInputStyle.Short)
					.setCustomId('twitch')
					.setMaxLength(30)
					.setRequired(false);
				if (settings.notifications.twitch.ping)
					twitch.setValue(settings.notifications.twitch.ping);
				const youtube = new TextInputBuilder()
					.setLabel('Youtube Ping')
					.setStyle(TextInputStyle.Short)
					.setCustomId('youtube')
					.setMaxLength(30)
					.setRequired(false);
				if (settings.notifications.youtube.ping)
					youtube.setValue(settings.notifications.youtube.ping);
				const twitter = new TextInputBuilder()
					.setLabel('Twitter Ping')
					.setStyle(TextInputStyle.Short)
					.setCustomId('twitter')
					.setMaxLength(30)
					.setRequired(false);
				if (settings.notifications.twitter.ping)
					twitter.setValue(settings.notifications.twitter.ping);

				modal.addComponents(new ActionRowBuilder().addComponents(twitch));
				modal.addComponents(new ActionRowBuilder().addComponents(youtube));
				modal.addComponents(new ActionRowBuilder().addComponents(twitter));
			} else if (type == 'twitch' && isOwner) {
				const clientId = new TextInputBuilder()
					.setLabel('Twitch Developer Client ID')
					.setStyle(TextInputStyle.Short)
					.setCustomId('id')
					.setRequired(false);
				if (settings.twitchDetails.clientId)
					clientId.setValue(settings.twitchDetails.clientId);
				const clientSecret = new TextInputBuilder()
					.setLabel('Twitch Developer Client Secret')
					.setStyle(TextInputStyle.Short)
					.setCustomId('secret')
					.setRequired(false);
				if (settings.twitchDetails.clientSecret)
					clientSecret.setValue(settings.twitchDetails.clientSecret);
				const channelName = new TextInputBuilder()
					.setLabel('Channel Usernames (Comma Separated)')
					.setStyle(TextInputStyle.Short)
					.setCustomId('channel')
					.setRequired(false);
				if (settings.twitchDetails.channelUsername)
					channelName.setValue(
						settings.twitchDetails.channelUsername.join(',')
					);

				modal.addComponents(new ActionRowBuilder().addComponents(clientId));
				modal.addComponents(new ActionRowBuilder().addComponents(clientSecret));
				modal.addComponents(new ActionRowBuilder().addComponents(channelName));
			} else if (type == 'youtube' && isOwner) {
				const apiKey = new TextInputBuilder()
					.setLabel('YT Developer API Keys (Comma Separated)')
					.setStyle(TextInputStyle.Short)
					.setCustomId('api')
					.setRequired(false);
				if (settings.youtubeDetails.apiKey)
					apiKey.setValue(settings.youtubeDetails.apiKey.join(','));
				const channelId = new TextInputBuilder()
					.setLabel('YT Channel IDs (Comma Separated)')
					.setStyle(TextInputStyle.Short)
					.setCustomId('channel')
					.setRequired(false);
				if (settings.youtubeDetails.channelId)
					channelId.setValue(settings.youtubeDetails.channelId.join(','));

				modal.addComponents(new ActionRowBuilder().addComponents(apiKey));
				modal.addComponents(new ActionRowBuilder().addComponents(channelId));
			} else if (type == 'twitter' && isOwner) {
				const apiKey = new TextInputBuilder()
					.setLabel('Developer API Keys (Comma Separated)')
					.setStyle(TextInputStyle.Short)
					.setCustomId('key')
					.setRequired(false);
				if (settings.twitterDetails.apiKey)
					apiKey.setValue(settings.twitterDetails.apiKey.join(','));
				const apiSecret = new TextInputBuilder()
					.setLabel('Developer API Secrets (Comma Separated)')
					.setStyle(TextInputStyle.Short)
					.setCustomId('secret')
					.setRequired(false);
				if (settings.twitterDetails.apiSecret)
					apiSecret.setValue(settings.twitterDetails.apiSecret.join(','));
				const username = new TextInputBuilder()
					.setLabel('Twitter Username for Notifications')
					.setStyle(TextInputStyle.Short)
					.setCustomId('username')
					.setRequired(false);
				if (settings.twitterDetails.username)
					username.setValue(settings.twitterDetails.username);
				const displayName = new TextInputBuilder()
					.setLabel('Twitter Display Name for Notifications')
					.setStyle(TextInputStyle.Short)
					.setCustomId('display')
					.setRequired(false);
				if (settings.twitterDetails.displayName)
					displayName.setValue(settings.twitterDetails.displayName);
				const profileImageUrl = new TextInputBuilder()
					.setLabel('Twitter Profile Image URL for Notifications')
					.setStyle(TextInputStyle.Short)
					.setCustomId('img')
					.setRequired(false);
				if (settings.twitterDetails.profileImageUrl)
					profileImageUrl.setValue(settings.twitterDetails.profileImageUrl);

				modal.addComponents(new ActionRowBuilder().addComponents(apiKey));
				modal.addComponents(new ActionRowBuilder().addComponents(apiSecret));
				modal.addComponents(new ActionRowBuilder().addComponents(username));
				modal.addComponents(new ActionRowBuilder().addComponents(displayName));
				modal.addComponents(
					new ActionRowBuilder().addComponents(profileImageUrl)
				);
			} else if (type == 'filterWhitelist') {
				modal.setTitle('Chat Filter Whitelists');

				const userIds = new TextInputBuilder()
					.setLabel('User IDs (Comma Separated)')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('123123815801,1298419028401924,1290481902840')
					.setCustomId('users')
					.setRequired(false);
				if (settings.chatFilter.whitelist.users.length > 0)
					userIds.setValue(settings.chatFilter.whitelist.users.join(','));
				const roleIds = new TextInputBuilder()
					.setLabel('Role IDs (Comma Separated)')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('123123815801,1298419028401924,1290481902840')
					.setCustomId('roles')
					.setRequired(false);
				if (settings.chatFilter.whitelist.roles.length > 0)
					roleIds.setValue(settings.chatFilter.whitelist.roles.join(','));
				const content = new TextInputBuilder()
					.setLabel('Content (Comma Separated)')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('discord.gg/shadowdevs,your mom,idk.com')
					.setCustomId('content')
					.setRequired(false);
				if (settings.chatFilter.whitelist.content.length > 0)
					content.setValue(settings.chatFilter.whitelist.content.join(','));

				modal.addComponents(new ActionRowBuilder().addComponents(userIds));
				modal.addComponents(new ActionRowBuilder().addComponents(roleIds));
				modal.addComponents(new ActionRowBuilder().addComponents(content));
			} else if (type == 'filterBlacklist') {
				modal.setTitle('Chat Filter Blacklisted Content');

				const content = new TextInputBuilder()
					.setLabel('Content (Comma Separated)')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('discord.gg/shadowdevs,your mom,idk.com')
					.setCustomId('content')
					.setRequired(false);
				if (settings.chatFilter.blacklist.length > 0)
					content.setValue(settings.chatFilter.blacklist.join(','));

				modal.addComponents(new ActionRowBuilder().addComponents(content));
			} else if (type == 'levelXp') {
				const xp = new TextInputBuilder()
					.setLabel('XP Gained Per Message')
					.setStyle(TextInputStyle.Short)
					.setCustomId('xp')
					.setRequired(false);
				if (settings.levels.xp) xp.setValue(String(settings.levels.xp));
				const levelReq = new TextInputBuilder()
					.setLabel('XP Multiplied for Level Requirement')
					.setStyle(TextInputStyle.Short)
					.setPlaceholder(
						'100 (This means each level is multiplied by 100, ie: level 2 requires 200xp)'
					)
					.setCustomId('levelReq')
					.setRequired(false);
				if (settings.levels.xp)
					levelReq.setValue(String(settings.levels.level));

				modal.addComponents(new ActionRowBuilder().addComponents(xp));
				modal.addComponents(new ActionRowBuilder().addComponents(levelReq));
			}

			await interaction.showModal(modal);
		}
		if (interaction.isModalSubmit() && customId.includes('setModalSubmit_')) {
			const type = customId.split('ModalSubmit_')[1];
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			if (type == 'logs') {
				const updated = [];
				const tickets = interaction.fields.getTextInputValue('ticket');
				const transcripts = interaction.fields.getTextInputValue('transcript');

				if (tickets) {
					const isChannel = interaction.guild.channels.cache.find(
						(channel) => channel.id === tickets
					);
					if (isChannel) {
						updated.push(`Ticket Logs: ${isChannel}`);

						await client.db
							.collection('settings')
							.updateOne(
								{ id: interaction.guild.id },
								{ $set: { 'logs.tickets': tickets } }
							);
					}
				}
				if (transcripts) {
					const isChannel = interaction.guild.channels.cache.find(
						(channel) => channel.id === transcripts
					);
					if (isChannel) {
						updated.push(`Ticket Transcript Logs: ${isChannel}`);

						await client.db
							.collection('settings')
							.updateOne(
								{ id: interaction.guild.id },
								{ $set: { 'logs.transcripts': transcripts } }
							);
					}
				}

				await interaction.editReply({
					content: `The following channels were updated to your custom settings:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'notify') {
				const updated = [];
				const twitch = interaction.fields.getTextInputValue('twitch');
				const youtube = interaction.fields.getTextInputValue('youtube');
				const twitter = interaction.fields.getTextInputValue('twitter');

				if (twitch) {
					const isChannel = interaction.guild.channels.cache.find(
						(channel) => channel.id === twitch
					);
					if (isChannel) {
						updated.push(`Twitch Channel: ${isChannel}`);

						await client.db
							.collection('settings')
							.updateOne(
								{ id: interaction.guild.id },
								{ $set: { 'notifications.twitch.channel': twitch } }
							);
					}
				}
				if (youtube) {
					const isChannel = interaction.guild.channels.cache.find(
						(channel) => channel.id === youtube
					);
					if (isChannel) {
						updated.push(`Youtube Channel: ${isChannel}`);

						await client.db
							.collection('settings')
							.updateOne(
								{ id: interaction.guild.id },
								{ $set: { 'notifications.youtube.channel': youtube } }
							);
					}
				}
				if (twitter) {
					const isChannel = interaction.guild.channels.cache.find(
						(channel) => channel.id === twitter
					);
					if (isChannel) {
						updated.push(`Twitter Channel: ${isChannel}`);

						await client.db
							.collection('settings')
							.updateOne(
								{ id: interaction.guild.id },
								{ $set: { 'notifications.twitter.channel': twitter } }
							);
					}
				}

				await interaction.editReply({
					content: `The following channels were updated to your custom settings:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'twitch' && isOwner) {
				const updated = [];
				const clientId = interaction.fields.getTextInputValue('id');
				const clientSecret = interaction.fields.getTextInputValue('secret');
				const channelName = interaction.fields
					.getTextInputValue('channel')
					.split(',');

				if (clientId) {
					updated.push(`Twitch Client ID: \`${clientId}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitchDetails.clientId': clientId } }
						);
				}
				if (clientSecret) {
					updated.push(`Twitch Client Secret: \`${clientSecret}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitchDetails.clientSecret': clientSecret } }
						);
				}
				if (channelName) {
					updated.push(
						`Twitch Channel Username(s): \`${channelName.join(', ')}\``
					);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitchDetails.channelUsername': channelName } }
						);
				}

				await interaction.editReply({
					content: `The following Twitch API Settings were updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'youtube' && isOwner) {
				const updated = [];
				const apiKey = interaction.fields.getTextInputValue('api').split(',');
				const channelId = interaction.fields
					.getTextInputValue('channel')
					.split(',');

				if (apiKey) {
					updated.push(`Developer API Key: \`${apiKey.join('`, `')}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'youtubeDetails.apiKey': apiKey } }
						);
				}
				if (channelId.length > 1) {
					updated.push(`Channel IDs: \`${channelId.join('`, `')}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'youtubeDetails.channelId': channelId } }
						);
				}

				await interaction.editReply({
					content: `The following Youtube API Settings were updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'twitter' && isOwner) {
				const updated = [];
				const apiKey = interaction.fields.getTextInputValue('key');
				const apiSecret = interaction.fields.getTextInputValue('secret');
				const username = interaction.fields.getTextInputValue('username');
				const displayName = interaction.fields.getTextInputValue('display');
				const profileImageUrl = interaction.fields.getTextInputValue('img');

				if (apiKey) {
					updated.push(`Developer API Key(s): \`${apiKey.split('`, `')}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitterDetails.apiKey': apiKey.split(',') } }
						);
				}
				if (apiSecret) {
					updated.push(
						`Developer API Secret(s): \`${apiSecret.split('`, `')}\``
					);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitterDetails.apiSecret': apiSecret.split(',') } }
						);
				}
				if (username) {
					updated.push(`Username: \`${username}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitterDetails.username': username } }
						);
				}
				if (displayName) {
					updated.push(`Display Name: \`${displayName}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitterDetails.displayName': displayName } }
						);
				}
				if (profileImageUrl) {
					updated.push(`Profile Image URL: \`${profileImageUrl}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'twitterDetails.profileImageUrl': profileImageUrl } }
						);
				}

				await interaction.editReply({
					content: `The following Twitter API Settings were updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'filterWhitelist') {
				const updated = [];
				const users = interaction.fields.getTextInputValue('users');
				const roles = interaction.fields.getTextInputValue('roles');
				const content = interaction.fields.getTextInputValue('content');

				if (users) {
					updated.push(`Users: \`${users}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'chatFilter.whitelist.users': users.split(',') } }
						);
				}
				if (roles) {
					updated.push(`Roles: \`${roles}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'chatFilter.whitelist.roles': roles.split(',') } }
						);
				}
				if (content) {
					updated.push(`Content: \`${content}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'chatFilter.whitelist.content': content.split(',') } }
						);
				}

				await interaction.editReply({
					content: `The following settings have been updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'filterBlacklist') {
				const updated = [];
				const content = interaction.fields.getTextInputValue('content');

				if (content) {
					updated.push(`Blacklist Content: \`${content}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'chatFilter.blacklist': content.split(',') } }
						);
				}

				await interaction.editReply({
					content: `The following settings have been updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			} else if (type == 'levelXp') {
				const updated = [];
				const xp = interaction.fields.getTextInputValue('xp');
				const levelReq = interaction.fields.getTextInputValue('levelReq');

				if (xp) {
					updated.push(`XP Gained Per Messaged: \`${xp}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'levels.xp': Number(xp) || 1 } }
						);
				}
				if (levelReq) {
					updated.push(`XP Multiplied for Level Requirement: \`${levelReq}\``);

					await client.db
						.collection('settings')
						.updateOne(
							{ id: interaction.guild.id },
							{ $set: { 'levels.level': Number(levelReq) || 100 } }
						);
				}

				await interaction.editReply({
					content: `The following Level System Settings were updated:\n> - ${
						updated.length > 0 ? updated.join('\n> - ') : 'None'
					}`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
