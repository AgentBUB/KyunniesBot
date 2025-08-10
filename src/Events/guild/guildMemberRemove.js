module.exports = {
	name: 'guildMemberRemove',
	execute: async (member, client) => {
		const settings = await client.db.collection('settings').findOne({
			id: member.guild.id,
		});

		const joinNotify = member.guild.channels.cache.find(
			(ch) => ch.id === settings.logs.general
		);
		if (joinNotify) {
			const embed = new ShadowEmbed()
				.setColor('Orange')
				.setDescription(
					`${member} (${member.user.username} - ${member.user.id}) **Left**`
				)
				.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
				.setTimestamp()
				.setFooter({ text: 'Shadow Logging System' });

			joinNotify.send({ embeds: [embed] });
		}
	},
};
