const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
	EmbedBuilder,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Send a user to the dungeon for a set length of time.')
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The user to send to the dungeon.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription(
					'Number and unit (s, m, h) | Mins is Default | 1m = 1 minute, 1s = 1 second, 1h = 1 hour'
				)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(0x0000010000000000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const settings = await client.db
			.collection('settings')
			.findOne({ id: interaction.guild ? interaction.guild.id : null });
		if (!settings.muteRole)
			interaction.reply({
				content: `You must set a mute role within the settings first.`,
				flags: MessageFlags.Ephemeral,
			});

		const time = interaction.options.getString('time');
		const member = interaction.options.get('user')?.user;
		const user = await interaction.guild.members.fetch(member.id);

		try {
			const currentlyMuted = await client.db.collection('muted').findOne({
				id: interaction.guild.id,
				user: user.id,
			});

			const botMember = interaction.guild.members.me;
			const botHighestRole = botMember.roles.highest;
			const manageableRoles = user.roles.cache.filter((role) => {
				if (role.id === interaction.guild.id) return false;
				if (role.position >= botHighestRole.position) return false;
				if (role.managed) return false;
				return true;
			});
			const currentRoles = manageableRoles.map((role) => role.id);
			if (currentlyMuted) {
				await client.db.collection('muted').updateOne(
					{ id: interaction.guild.id, user: user.id },
					{
						$set: {
							time: time ? parseTimeString(time).date : null,
						},
					}
				);
			} else {
				await client.db.collection('muted').insertOne({
					id: interaction.guild.id,
					user: user.id,
					time: time ? parseTimeString(time).date : null,
					roles: currentRoles,
				});
			}
			await user.roles.add(settings.muteRole);
			await user.roles.remove(currentRoles);

			const muteEntry = await client.db.collection('muted').findOne({
				id: interaction.guild.id,
				user: user.id,
			});
			scheduleUnmute(client, muteEntry);
			interaction.reply({
				content: `${user} has been muted ${
					time
						? `till <t:${parseTimeString(time).unix}:f> (<t:${
								parseTimeString(time).unix
						  }:R>)`
						: 'permanently'
				}. ${
					currentlyMuted
						? ' *User was already muted, so the time was just extended.*'
						: ''
				}`,
				flags: MessageFlags.Ephemeral,
			});

			const modChannel = interaction.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.mute
			);
			if (modChannel) {
				const embed = new EmbedBuilder()
					.setColor('Red')
					.setTitle('Muted User')
					.addFields([
						{
							name: 'User',
							value: `${member} (${member.id})`,
							inline: true,
						},
						{
							name: 'Done By',
							value: `${interaction.user} (${interaction.user.id})`,
							inline: true,
						},
						{
							name: 'Mute Type',
							value: muteEntry.time
								? `Temporary (expires <t:${Math.floor(
										muteEntry.time.getTime() / 1000
								  )}:R>)`
								: 'Permanent',
							inline: false,
						},
					])
					.setTimestamp()
					.setFooter({ text: 'Shadow Logging System' });

				await modChannel.send({ embeds: [embed] }).catch(console.error);
			}
		} catch (error) {
			console.error(error);
			interaction.reply({
				content: `${user} was not muted. Error: \`${error.message}\``,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

function parseTimeString(timeString) {
	const cleanTime = timeString.trim();
	let match = cleanTime.match(/^(\d+)([smh])?$/);
	if (!match) {
		throw new Error(
			'Invalid time format. Use format like "1m", "30s", "2h", or just "30" for minutes'
		);
	}

	const number = parseInt(match[1]);
	const unit = match[2] || 'm'; // default to minutes

	let milliseconds;
	switch (unit) {
		case 's':
			milliseconds = number * 1000;
			break;
		case 'm':
			milliseconds = number * 60 * 1000;
			break;
		case 'h':
			milliseconds = number * 60 * 60 * 1000;
			break;
		default:
			throw new Error('Invalid unit. Use s, m, or h');
	}

	const futureDate = new Date(Date.now() + milliseconds);

	const unixTimestamp = Math.floor(futureDate.getTime() / 1000);

	return {
		date: futureDate,
		unix: unixTimestamp,
		milliseconds: milliseconds,
	};
}

const activeTimeouts = new Map();
function scheduleUnmute(client, muteEntry) {
	if (muteEntry.time == null) return;

	const timeUntilUnmute = muteEntry.time.getTime() - Date.now();

	if (timeUntilUnmute <= 0) {
		processSingleUnmute(client, muteEntry);
		return;
	}

	if (activeTimeouts.has(`${muteEntry.id}_${muteEntry.user}`)) {
		clearTimeout(activeTimeouts.get(`${muteEntry.id}_${muteEntry.user}`));
	}

	const timeoutId = setTimeout(async () => {
		await processSingleUnmute(client, muteEntry);
		activeTimeouts.delete(`${muteEntry.id}_${muteEntry.user}`);
	}, timeUntilUnmute);

	activeTimeouts.set(`${muteEntry.id}_${muteEntry.user}`, timeoutId);
}
async function processSingleUnmute(client, muteEntry) {
	try {
		const guild = client.guilds.cache.get(muteEntry.id);
		if (!guild) {
			await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
			return;
		}

		const member = await guild.members.fetch(muteEntry.user).catch(() => null);
		if (!member) {
			await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
			return;
		}

		if (muteEntry.roles && muteEntry.roles.length > 0) {
			const validRoles = muteEntry.roles.filter((roleId) =>
				guild.roles.cache.has(roleId)
			);
			await member.roles.set(validRoles, 'Automatic unmute - time expired');
		} else {
			const settings = await client.db
				.collection('settings')
				.findOne({ id: guild.id });
			if (settings?.muteRole) {
				await member.roles.remove(
					settings.muteRole,
					'Automatic unmute - time expired'
				);
			}
		}

		await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
	} catch (error) {
		console.error(`Error processing unmute for user ${muteEntry.user}:`, error);
	}
}
