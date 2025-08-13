const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'voiceStateUpdate',
	execute: async (oldState, newState, client) => {
		const settings = await client.db.collection('settings').findOne({
			id: oldState.guild.id,
		});
		const member = newState.member || oldState.member;

		const joinNotify = member.guild.channels.cache.find(
			(ch) => ch.id === settings.logs.general
		);
		if (joinNotify) {
			const embed = new EmbedBuilder()
				.setColor('Blurple')
				.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
				.setTimestamp()
				.setFooter({ text: 'Shadow Logging System' });

			if (oldState.channelId === null && newState.channelId !== null) {
				const channel = newState.channel;

				embed
					.setTitle(`${member.user.username} Joined Voice Channel`)
					.addFields([
						{
							name: `**❯ User:**`,
							value: `Mention: ${member.user}\nDisplay Name: \`${member.user.displayName}\`\nUsername: \`${member.user.tag}\` \nID: \`${member.user.id}\``,
						},
						{
							name: `**❯ Channel:**`,
							value: `${channel} (${channel.name})`,
						},
					]);
			} else if (oldState.channelId !== null && newState.channelId === null) {
				const channel = oldState.channel;

				embed.setTitle(`${member.user.username} Left Voice Channel`).addFields([
					{
						name: `**❯ User:**`,
						value: `Mention: ${member.user}\nDisplay Name: \`${member.user.displayName}\`\nUsername: \`${member.user.tag}\` \nID: \`${member.user.id}\``,
					},
					{
						name: `**❯ Channel:**`,
						value: `${channel} (${channel.name})`,
					},
				]);
			} else if (
				oldState.channelId !== null &&
				newState.channelId !== null &&
				oldState.channelId !== newState.channelId
			) {
				const oldChannel = oldState.channel;
				const newChannel = newState.channel;

				embed
					.setTitle(`${member.user.username} Moved Voice Channel`)
					.addFields([
						{
							name: `**❯ User:**`,
							value: `Mention: ${member.user}\nDisplay Name: \`${member.user.displayName}\`\nUsername: \`${member.user.tag}\` \nID: \`${member.user.id}\``,
						},
						{
							name: `**❯ Old Channel:**`,
							value: `${oldChannel} (${oldChannel.name})`,
							inline: true,
						},
						{
							name: `**❯ New Channel:**`,
							value: `${newChannel} (${newChannel.name})`,
							inline: true,
						},
					]);
			}

			joinNotify.send({ embeds: [embed] });
		}
	},
};
