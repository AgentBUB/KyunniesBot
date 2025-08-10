const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'guildMemberAdd',
	execute: async (member, client) => {
		try {
			const activeMute = await client.db.collection('muted').findOne({
				id: member.guild.id,
				user: member.id,
			});
			if (!activeMute) {
				return;
			}

			const settings = await client.db.collection('settings').findOne({
				id: member.guild.id,
			});

			const joinNotify = member.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.general
			);
			if (joinNotify) {
				const embed = new ShadowEmbed()
					.setColor('Green')
					.setDescription(
						`${member} (${member.user.username} - ${member.user.id}) **Joined**`
					)
					.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
					.setTimestamp()
					.setFooter({ text: 'Shadow Logging System' });

				joinNotify.send({ embeds: [embed] });
			}

			if (!settings?.muteRole) {
				console.error(
					`Mute role not configured for guild ${member.guild.name}`
				);
				return;
			}

			await member.roles.add(
				settings.muteRole,
				'Resuming active mute on rejoin'
			);
			const now = new Date();

			if (activeMute.time) {
				if (activeMute.time <= now) {
					if (activeMute.roles && activeMute.roles.length > 0) {
						const validRoles = activeMute.roles.filter((roleId) =>
							member.guild.roles.cache.has(roleId)
						);
						await member.roles.set(validRoles, 'Mute expired during absence');
					} else {
						await member.roles.remove(
							settings.muteRole,
							'Mute expired during absence'
						);
					}

					await member.client.db
						.collection('muted')
						.deleteOne({ _id: activeMute._id });

					return;
				}

				scheduleUnmute(member.client, activeMute);
			}

			const modChannel = member.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.mute
			);
			if (modChannel) {
				const embed = new EmbedBuilder()
					.setColor('#FFA500')
					.setTitle('Muted User Rejoined')
					.setDescription(
						`${member.user.username} rejoined the server with an active mute`
					)
					.addFields([
						{
							name: 'User',
							value: `${member.user} (${member.user.id})`,
							inline: true,
						},
						{
							name: 'Mute Type',
							value: activeMute.time
								? `Temporary (expires <t:${Math.floor(
										activeMute.time.getTime() / 1000
								  )}:R>)`
								: 'Permanent',
							inline: true,
						},
					])
					.setTimestamp()
					.setFooter({ text: 'Shadow Logging System' });

				await modChannel.send({ embeds: [embed] }).catch(console.error);
			}
		} catch (error) {
			console.error(
				`Error checking mute status for rejoining user ${member.user.username}:`,
				error
			);
		}
	},
};

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
