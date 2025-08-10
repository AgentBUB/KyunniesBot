const {
	InteractionType,
	EmbedBuilder,
	Collection,
	MessageFlags,
	ChannelType,
	ThreadAutoArchiveDuration,
	ActionRowBuilder,
	ButtonBuilder,
	TextInputBuilder,
	ModalBuilder,
} = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');

module.exports = {
	name: 'interactionCreate',
	execute: async (interaction, client) => {
		const settings = await client.db
			.collection('settings')
			.findOne({ id: interaction.guild ? interaction.guild.id : null });
		if (interaction.guild && !settings?.setup && interaction.guild) {
			await client.db.collection('settings').insertOne({
				id: interaction.guild.id,
				setup: true,
				logs: {
					tickets: null,
					transcripts: null,
					mute: null,
					general: null,
				},
				twitchDetails: {
					clientId: null,
					clientSecret: null,
					channelUsername: null,
				},
				twitterDetails: {
					apiKey: [],
					apiSecret: [],
					username: null,
					displayName: null,
					profileImageUrl: null,
				},
				youtubeDetails: {
					apiKey: [],
					channelId: [],
				},
				notifications: {
					twitch: {
						enabled: false,
						channel: null,
						ping: null,
					},
					youtube: {
						enabled: false,
						channel: {},
						ping: {},
					},
					twitter: {
						enabled: false,
						channel: null,
						ping: null,
					},
				},
				muteRole: null,
			});
		}

		if (
			interaction.type === InteractionType.ApplicationCommand &&
			!interaction.isUserContextMenuCommand()
		) {
			const loadCmd = async (dirs) => {
				const commands = readdirSync(
					`${client.utils.directory}Commands/${dirs}/`
				).filter((djs) => djs.endsWith('.js'));
				for (const commandFile of commands) {
					const command = require(`${client.utils.directory}Commands/${dirs}/${commandFile}`);
					if (
						interaction.commandName.toLowerCase() ===
						command.data.name.toLowerCase()
					) {
						const { cooldowns } = interaction.client;
						if (!cooldowns.has(command.data.name)) {
							cooldowns.set(command.data.name, new Collection());
						}
						const now = Date.now();
						const timestamps = cooldowns.get(command.data.name);
						const defaultCooldownDuration = 0.1;
						const cooldownAmount =
							(command.cooldown ?? defaultCooldownDuration) * 1_000;

						if (timestamps.has(interaction.user.id)) {
							const expirationTime =
								timestamps.get(interaction.user.id) + cooldownAmount;

							if (
								now < expirationTime &&
								!client.owners.includes(interaction.user.id)
							) {
								const expiredTimestamp = Math.round(expirationTime / 1_000);
								return interaction.reply({
									content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
									flags: MessageFlags.Ephemeral,
								});
							}
						}
						timestamps.set(interaction.user.id, now);
						setTimeout(
							() => timestamps.delete(interaction.user.id),
							cooldownAmount
						);

						command.run(client, interaction);
						if (interaction.guild) {
							const cmdLogsChannel = interaction.guild.channels.cache.find(
								(ch) => ch.id === settings.logs.general
							);
							const embed = new EmbedBuilder()
								.setTitle('Command Usage')
								.setColor('Blurple')
								.setTimestamp()
								.setAuthor({
									name: interaction.user.username,
									iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
								})
								.setFooter({ text: 'Shadow Logging System' })
								.addFields(
									{
										name: `Command Used`,
										value: `❯ \`${command.data.name}\``,
									},
									{
										name: 'Used By',
										value: `❯ ${interaction.user} (${interaction.user.id})`,
									},
									{
										name: 'Used In',
										value: `❯ ${
											interaction.channel.type === 1
												? 'Direct Messages'
												: interaction.channel
										}`,
									}
								);

							if (cmdLogsChannel) cmdLogsChannel.send({ embeds: [embed] });
						}
					}
				}
			};
			const cmdDir = `${client.utils.directory}Commands/`;
			const paths = readdirSync(path.join(cmdDir));
			paths.forEach((dirs) => loadCmd(dirs));
			return;
		} else if (interaction.isUserContextMenuCommand()) {
			const loadCmd = async () => {
				const commands = readdirSync(`${client.utils.directory}Menus/`).filter(
					(djs) => djs.endsWith('.js')
				);
				for (const commandFile of commands) {
					const command = require(`${client.utils.directory}Menus/${commandFile}`);
					if (
						interaction.commandName.toLowerCase() ===
						command.data.name.toLowerCase()
					) {
						command.run(client, interaction);
					}
				}
			};

			loadCmd();
			return;
		} else if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) return;
			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.log(error);
			}
			return;
		}
		await interaction.user.fetch();

		//? TICKETS ----
		if (!interaction.guild) return;
		const rMember = interaction.guild.members.cache.find(
			(mm) => mm.user.id === interaction.user.id
		);
		const openButton = await client.db.collection('ticketButton').findOne({
			id: interaction.guild.id,
			msgID: interaction?.message?.id,
			customId: interaction.customId,
		});
		if (openButton) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			return ticketCreator(interaction, rMember, client, await openButton).then(
				async (res) => {
					try {
						await interaction.editReply({
							content: `${rMember}, Your ticket has been open: ${res}`,
							flags: MessageFlags.Ephemeral,
						});
					} catch (error) {
						console.error('Interaction handling error:', error);
					}
				}
			);
		}

		if (
			interaction.isModalSubmit() &&
			interaction.customId === 'closeReason_modal'
		) {
			await interaction.deferUpdate();
			const reason = interaction.fields.getTextInputValue('closeReason');
			return ticketCloseReason(interaction, reason, client);
		}

		if (interaction.customId === 'close_function') {
			const theButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle('Danger')
					.setLabel('Confirm')
					.setCustomId('confirmClose_function'),
				new ButtonBuilder()
					.setStyle('Primary')
					.setLabel('Confirm with Reason')
					.setCustomId('closeReason_function'),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setLabel('Cancel')
					.setCustomId('cancelClose_function')
			);

			await interaction.reply({
				content: 'Are you sure you want to close this ticket?',
				components: [theButtons],
				flags: MessageFlags.Ephemeral,
			});
		} else if (interaction.customId === 'closeReason_function') {
			const modal = new ModalBuilder()
				.setCustomId('closeReason_modal')
				.setTitle('Ticket Closure Reason');

			const input = new TextInputBuilder()
				.setLabel('The reason for the ticket begin closed.')
				.setStyle('Paragraph')
				.setCustomId('closeReason')
				.setMaxLength(2000)
				.setRequired(true);
			modal.addComponents(new ActionRowBuilder().addComponents(input));

			await interaction.showModal(modal);
		} else if (interaction.customId === 'cancelClose_function') {
			await interaction.deferUpdate();
			await interaction.deleteReply();
		} else if (interaction.customId === 'confirmClose_function') {
			await interaction.deferUpdate();
			await interaction.deleteReply();
			ticketClose(interaction, client);
		}
	},
};

//? TICKETS---
async function ticketCreator(button, person, client, buttonData) {
	let response = false;
	const { message, user } = button;
	const { customId, support, type } = await buttonData;

	const embed = new EmbedBuilder()
		.setColor('Blurple')
		.setFooter({ text: `© ${new Date().getFullYear()} Kyunnies Bot` })
		.setTimestamp();
	if (type == 'report') {
		embed
			.setDescription(
				`**Dear <@${person.id}>!**\n
				Thank you for reaching out to the mod team! Please provide all the details listed in the format below so that our mods can handle this report as swiftly as possible.
				If you have any questions, concerns, or similar then feel free to state those in this chat as well.
				*Our mods will be with you as soon as possible, so unless this is an urgent matter there isn't a need to ping them.*
				\u200b`
			)
			.addFields({
				name: 'Format',
				value:
					'```\nTheir Discord and/or Twitch Username:\n-\nTheir Discord ID (if applicable):\n-\nWhat this report about?:\n-\nAny evidence you have:\n-```',
			});
	} else {
		embed
			.setDescription(
				`**Dear <@${person.id}>!**\n
				Thank you for reaching out to us! We will be with you soon!
				Please ensure that you read any information attached to the ticket creation embed or within said channel.
				\u200b
				**Staff Commands:**`
			)
			.addFields({
				name: 'Adding/Removing Users/Roles',
				value: `**❯ Add:** Use \`/ticket add <user or role>\` to add a user or role to the ticket.
					**❯ Remove:** Use \`/ticket remove <user or role>\` to remove a user or role to the ticket.`,
			});
	}

	const { logs } = await client.db
		.collection('settings')
		.findOne({ id: message.guild.id });
	const owner = button.message.guild.members.cache.find(
		(mm) => mm.user.id === person.id
	);

	let channelName = `ticket-${user.username}`;
	if (type == 'report') channelName = `report-${user.username}`;

	await message.channel.threads
		.create({
			name: channelName,
			type: ChannelType.PrivateThread,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			invitable: false,
			reason: 'Creating Ticket Thread',
		})
		.then(async (thread) => {
			if (thread.joinable) await thread.join();
			await thread.members.add(user.id);
			support.forEach((role) => {
				thread.send(`<@&${role}> adding to thread.`);
			});

			const closeButtons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setStyle('Secondary')
					.setCustomId('close_function')
					.setLabel('Close Ticket')
					.setEmoji('🔒', false),
				new ButtonBuilder()
					.setStyle('Secondary')
					.setCustomId('closeReason_function')
					.setLabel('Close Ticket With Reason')
					.setEmoji('🔏', false)
			);

			const embedInfoMessage = await thread.send({
				embeds: [embed],
				components: [closeButtons],
			});
			await embedInfoMessage.pin();
			await embedInfoMessage.channel.bulkDelete(1);

			await client.db.collection('tickets').insertOne({
				id: message.guild.id,
				owner: user.id,
				customId: customId,
				timeOpen: (await new Date().toLocaleString()).toString(),
				lastMsgSent: (await new Date().toLocaleString()).toString(),
				channelId: thread.id,
				support: support,
			});

			const logEmbed = new EmbedBuilder()
				.setTitle('Ticket Open')
				.setDescription(`Ticket: ${thread.name} (${thread.id})`)
				.setColor('Green')
				.addFields({
					name: 'Owner',
					value: `**❯ Username:** ${owner.user.username}
						**❯ ID:** ${owner.id}
						**❯ Mention:** ${owner}
						\u200b`,
				})
				.setFooter({ text: 'Shadow Logging System' })
				.setTimestamp();
			if (logs.tickets) {
				const ticLogsChannel = message.guild.channels.cache.find(
					(ch) => ch.id === logs.tickets
				);
				await ticLogsChannel.send({ embeds: [logEmbed] });
			}

			response = thread;
		});

	return await response;
}

async function ticketClose(button, client) {
	const { message } = button;
	const { channel } = message;

	await ticketTranscript(button, client);

	const data = await client.db
		.collection('tickets')
		.findOne({ id: message.guild.id, channelId: channel.id });
	let owner;
	try {
		owner =
			(await button.guild.members.fetch(data.owner)) ||
			(await button.message.guild.members.cache.find(
				(mm) => mm.user.id === data.owner
			));
	} catch (err) {
		if (err) {
			owner = {
				user: { username: 'N/A' },
				id: data.owner,
				failed: true,
			};
		}
	}

	await button.channel.setLocked(true);
	await button.channel.setArchived(true);

	const { logs } = await client.db
		.collection('settings')
		.findOne({ id: message.guild.id });
	const logEmbed = new EmbedBuilder()
		.setTitle(`Ticket Closed`)
		.setDescription(`Ticket: ${button.channel.name} (${button.channel.id})`)
		.setColor('Orange')
		.addFields(
			{
				name: 'Owner',
				value: `**❯ Username:** ${owner.user.username}
				**❯ ID:** ${owner.id}
				**❯ Mention:** ${owner.failed ? 'N/A' : owner}
				\u200b`,
			},
			{
				name: 'By',
				value: `**❯ Username:** ${button.user.username}
				**❯ ID:** ${button.user.id}
				**❯ Mention:** ${button.user}
				\u200b`,
			},
			{
				name: 'Times',
				value: `**❯ Opened:** ${data.timeOpen}
				**❯ Closed:** ${new Date().toLocaleString()}
				 **❯ Total Time (HH:MM:SS.MS):** ${dateDifference(
						new Date(data.timeOpen),
						new Date()
					)}
				\u200b`,
			}
		)
		.setFooter({ text: 'Shadow Logging System' })
		.setTimestamp();
	if (logs.tickets) {
		const ticLogsChannel = message.guild.channels.cache.find(
			(ch) => ch.id === logs.tickets
		);
		await ticLogsChannel.send({ embeds: [logEmbed] });
	}

	await client.db
		.collection('tickets')
		.deleteOne({ id: message.guild.id, channelId: channel.id });
}
async function ticketCloseReason(button, reason, client) {
	const { message } = button;
	const { channel } = message;

	await ticketTranscript(button, client);

	const data = await client.db
		.collection('tickets')
		.findOne({ id: message.guild.id, channelId: channel.id });
	let owner;
	try {
		owner =
			(await button.guild.members.fetch(data.owner)) ||
			(await button.message.guild.members.cache.find(
				(mm) => mm.user.id === data.owner
			));
	} catch (err) {
		if (err) {
			owner = {
				user: { username: 'N/A' },
				id: data.owner,
				failed: true,
			};
		}
	}

	try {
		await owner.send(
			`Your ticket was closed for the following reason:\`\`\`\n${reason}\n\`\`\``
		);
	} catch {
		message.channel.send(
			`${button.user}, an error has ocurred. Ticket ticket creator will not get the closure reason. | They likely have DMs off or left the server.`
		);
	}

	await button.channel.setLocked(true);
	await button.channel.setArchived(true);

	const { logs } = await client.db
		.collection('settings')
		.findOne({ id: message.guild.id });
	const logEmbed = new EmbedBuilder()
		.setTitle(`Ticket Closed`)
		.setDescription(`Ticket: ${button.channel.name} (${button.channel.id})`)
		.setColor('Orange')
		.addFields(
			{
				name: 'Owner',
				value: `**❯ Username:** ${owner.user.username}
				**❯ ID:** ${owner.id}
				**❯ Mention:** ${owner.failed ? 'N/A' : owner}
				\u200b`,
			},
			{
				name: 'By',
				value: `**❯ Username:** ${button.user.username}
				**❯ ID:** ${button.user.id}
				**❯ Mention:** ${button.user}
				\u200b`,
			},
			{
				name: 'Times',
				value: `**❯ Opened:** ${data.timeOpen}
				**❯ Closed:** ${new Date().toLocaleString()}
				 **❯ Total Time (HH:MM:SS.MS):** ${dateDifference(
						new Date(data.timeOpen),
						new Date()
					)}
				\u200b`,
			},
			{
				name: 'Reason',
				value: `\`\`\`\n${reason}\n\`\`\``,
			}
		)
		.setFooter({ text: 'Shadow Logging System' })
		.setTimestamp();
	if (logs.tickets) {
		const ticLogsChannel = message.guild.channels.cache.find(
			(ch) => ch.id === logs.tickets
		);
		await ticLogsChannel.send({ embeds: [logEmbed] });
	}

	await client.db
		.collection('tickets')
		.deleteOne({ id: message.guild.id, channelId: channel.id });
}

async function ticketTranscript(button, client) {
	const { message } = button;
	const { channel } = message;

	const savingEmbed = new EmbedBuilder()
		.setColor('Blue')
		.setAuthor({
			name: 'Saving Transcript...',
			iconURL:
				'https://cdn.discordapp.com/emojis/875974030778306610.webp?size=96&animated=true',
		})
		.setFooter({ text: `© ${new Date().getFullYear()} Kyunnies Bot` })
		.setTimestamp();
	const savingEmbedMSG = await message.channel.send({ embeds: [savingEmbed] });
	const savedEmbed = new EmbedBuilder()
		.setColor('Green')
		.setAuthor({
			name: 'Transcript Saved.',
			iconURL:
				'https://cdn.discordapp.com/emojis/767253267130220556.webp?size=96&animated=true',
		})
		.setFooter({ text: `© ${new Date().getFullYear()} Kyunnies Bot` })
		.setTimestamp();

	const file = await discordTranscripts.createTranscript(channel);

	const { logs } = await client.db
		.collection('settings')
		.findOne({ id: message.guild.id });
	const data = await client.db
		.collection('tickets')
		.findOne({ id: message.guild.id, channelId: channel.id });
	let owner;
	try {
		owner =
			(await button.guild.members.fetch(data.owner)) ||
			(await button.message.guild.members.cache.find(
				(mm) => mm.user.id === data.owner
			));
	} catch (err) {
		if (err) {
			owner = {
				user: { username: 'N/A' },
				id: data.owner,
				failed: true,
			};
		}
	}
	const logEmbed = new EmbedBuilder()
		.setTitle('Transcript Saved')
		.setDescription(`Ticket: ${button.channel.name} (${button.channel.id})`)
		.setColor('Blue')
		.addFields(
			{
				name: 'Owner',
				value: `**❯ Username:** ${owner.user.username}
				**❯ ID:** ${owner.id}
				**❯ Mention:** ${owner.failed ? 'N/A' : owner}
				\u200b`,
			},
			{
				name: 'By',
				value: `**❯ Username:** ${button.user.username}
				**❯ ID:** ${button.user.id}
				**❯ Mention:** ${button.user}
				\u200b`,
			}
		)
		.setFooter({ text: 'Shadow Logging System' })
		.setTimestamp();

	if (logs.transcripts) {
		const ticLogsChannel = message.guild.channels.cache.find(
			(ch) => ch.id === logs.transcripts
		);
		const fileSent = await ticLogsChannel.send({
			embeds: [logEmbed],
			files: [file],
		});
		if (fileSent) {
			await savingEmbedMSG
				.delete()
				.then(channel.send({ embeds: [savedEmbed] }));
		}
	} else {
		const saveFailedEmbed = new EmbedBuilder()
			.setColor('DarkRed')
			.setAuthor({
				name: 'Transcript Failed to Save.',
				iconURL:
					'https://cdn.discordapp.com/attachments/633499606164176897/876544222193397780/danger.png',
			})
			.setDescription(
				"Make sure you have your transcript logs setup within the bot's settings."
			)
			.setFooter({ text: `© ${new Date().getFullYear()} Kyunnies Bot` })
			.setTimestamp();
		await savingEmbedMSG
			.delete()
			.then(channel.send({ embeds: [saveFailedEmbed] }));
	}
}

function dateDifference(date2, date1) {
	const diffTime = Math.abs(date2 - date1);
	return msToTime(diffTime);
}
function msToTime(sec) {
	function pad(nn, zz) {
		zz = zz || 2;
		return `00${nn}`.slice(-zz);
	}
	var ms = sec % 1000;
	sec = (sec - ms) / 1000;
	var secs = sec % 60;
	sec = (sec - secs) / 60;
	var mins = sec % 60;
	var hrs = (sec - mins) / 60;
	return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}
