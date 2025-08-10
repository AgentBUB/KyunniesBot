const ShadowEmbed = require('../../Structures/ShadowEmbed');

module.exports = {
	name: 'messageDelete',
	execute: async (message, client) => {
		if (!message.guild) return;

		try {
			if (message.partial) await message.fetch();
		} catch {
			return;
		}
		const settings = await client.db.collection('settings').findOne({
			id: message.guild.id,
		});

		if (message.author.bot) return;
		const channel = message.guild.channels.cache.find(
			(ch) => ch.id === settings.logs.general
		);
		if (!channel) return;

		const attachments = message.attachments.size
			? message.attachments.map((attachment) => attachment.proxyURL)
			: null;
		const embed = new ShadowEmbed()
			.setColor('#0099ff')
			.setAuthor({
				name: message.author.tag,
				iconURL: message.author.displayAvatarURL({ dynamic: true }),
			})
			.setTitle('Message Deleted')
			.addFields(
				{ name: `**❯ Message ID:**`, value: message.id, inline: true },
				{
					name: `**❯ Channel:**`,
					value: message.channel.toString(),
					inline: true,
				},
				{
					name: `**❯ Author:**`,
					value: `Mention: \`${message.author}\` \nUsername: \`${message.author.tag}\` \nID: \`${message.author.id}\``,
				}
			)
			.setTimestamp()
			.setFooter({ text: 'Shadow Logging System' });
		if (attachments) {
			embed.addFields({
				name: `**❯ Attachments:**`,
				value: `${attachments.join('\n')}`,
			});
		}
		if (message.content.length) {
			embed.splitFields(`**❯ Deleted Message:** \n${message.content}`);
		}
		channel.send({ embeds: [embed] });
	},
};
