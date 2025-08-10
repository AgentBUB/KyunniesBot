module.exports = {
	name: 'messageReactionRemove',
	execute: async (reaction, user, _, client) => {
		if (reaction.partial) await reaction.fetch();

		const data = await client.db.collection('reactRoles').findOne({
			id: reaction.message.guildId,
			msg: reaction.message.id,
			emoji: reaction.emoji.id || reaction.emoji.name,
		});
		if (data) {
			const guild = client.guilds.cache.get(reaction.message.guildId);
			const guildMember = await guild.members.fetch(user.id);

			if (guildMember.roles.cache.has(data.role))
				await guildMember.roles.remove(data.role);
		}
	},
};
