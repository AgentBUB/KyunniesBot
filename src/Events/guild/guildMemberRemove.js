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
			joinNotify.send(
				`${member} (${
					member.user.discriminator !== '0'
						? member.user.tag
						: member.user.username
				} - ${member.user.id}) **Left**`
			);
		}
	},
};
