const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'guildMemberUpdate',
	execute: async (oldMember, newMember, client) => {
		const settings = await client.db.collection('settings').findOne({
			id: newMember.guild.id,
		});

		if (oldMember._roles.length > newMember._roles.length) {
			const difference = oldMember._roles.filter(
				(role) => newMember._roles.indexOf(role) === -1
			);
			const preppedRoles = [];
			difference.forEach((role) => {
				preppedRoles.push(`<@&${role}>`);
			});

			const embed = new EmbedBuilder()
				.setTitle('~Role Removed~')
				.setColor('Orange')
				.setAuthor({
					name: oldMember.user.tag,
					iconURL: oldMember.user.displayAvatarURL({ dynamic: true }),
				})
				.setThumbnail(oldMember.user.displayAvatarURL({ dynamic: true }))
				.addFields(
					{
						name: 'Removed From',
						value: `**❯ Username**: ${
							oldMember.user.discriminator !== '0'
								? oldMember.user.tag
								: oldMember.user.username
						}${
							oldMember.user.discriminator !== '0'
								? `\n**❯ Discriminator:** ${oldMember.user.discriminator}`
								: ''
						}
				**❯ ID:** ${oldMember.user.id}
				**❯ Mention:** ${oldMember.user}
				\u200b`,
					},
					{
						name: 'Role(s) Removed',
						value: `**❯** ${preppedRoles.join('\n**❯** ')}
				\u200b`,
					}
				)
				.setFooter({ text: 'Shadow Logging System' })
				.setTimestamp();

			const roleChannel = oldMember.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.general
			);
			if (roleChannel) {
				roleChannel.send({ embeds: [embed] });
			}
		} else if (oldMember._roles.length < newMember._roles.length) {
			const difference = newMember._roles.filter(
				(role) => oldMember._roles.indexOf(role) === -1
			);
			const preppedRoles = [];
			difference.forEach((role) => {
				preppedRoles.push(`<@&${role}>`);
			});

			const embed = new EmbedBuilder()
				.setTitle('~Role Added~')
				.setColor('Green')
				.setAuthor({
					name: newMember.user.tag,
					iconURL: newMember.user.displayAvatarURL({ dynamic: true }),
				})
				.setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
				.addFields(
					{
						name: 'Added To',
						value: `**❯ Username**: ${
							newMember.user.discriminator !== '0'
								? newMember.user.tag
								: newMember.user.username
						}${
							newMember.user.discriminator !== '0'
								? `\n**❯ Discriminator:** ${newMember.user.discriminator}`
								: ''
						}
				**❯ ID:** ${newMember.user.id}
				**❯ Mention:** ${newMember.user}
				\u200b`,
					},
					{
						name: 'Role(s) Added',
						value: `**❯** ${preppedRoles.join('\n**❯** ')}
				\u200b`,
					}
				)
				.setFooter({ text: 'Shadow Logging System' })
				.setTimestamp();

			const roleChannel = newMember.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.general
			);
			if (roleChannel) {
				roleChannel.send({ embeds: [embed] });
			}
		}
	},
};
