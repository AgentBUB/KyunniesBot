const ShadowEmbed = require('../../Structures/ShadowEmbed');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
	name: 'messageUpdate',
	execute: async (old, message, client) => {
		if (!message.guild || message.author.bot) return;

		try {
			if (message.partial) await message.fetch();
			if (old.partial) await message.fetch();
			if (old.author.tag) {
				if (old.content === message.content) return;
			}

			const settings = await client.db.collection('settings').findOne({
				id: message.guild.id,
			});
			const channel = message.guild.channels.cache.find(
				(ch) => ch.id === settings.logs.general
			);
			if (!channel) return;

			const { embed, files } = createMessageUpdateEmbed(old, message);
			if (files.length > 0) {
				await channel.send({ embeds: [embed], files: files });
			} else {
				await channel.send({ embeds: [embed] });
			}
		} catch (err) {
			return;
		}
	},
};

function createMessageUpdateEmbed(oldMessage, newMessage) {
	const embed = new ShadowEmbed()
		.setColor('Blue')
		.setAuthor({
			name: newMessage.author.tag,
			iconURL: newMessage.author.displayAvatarURL({ dynamic: true }),
		})
		.setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
		.setTitle('Message Updated')
		.addFields(
			{ name: `**❯ Message ID:**`, value: oldMessage.id, inline: true },
			{
				name: `**❯ Channel:**`,
				value: oldMessage.channel.toString(),
				inline: true,
			},
			{
				name: `**❯ Author:**`,
				value: `Display Name: \`${oldMessage.member.displayName}\` \nUsername: \`${oldMessage.author.tag}\` \nID: \`${oldMessage.author.id}\``,
			}
		)
		.setTimestamp()
		.setURL(oldMessage.url)
		.setFooter({ text: 'Shadow Logging System' });

	const files = [];
	const oldContent = oldMessage.content || '*No content*';
	const newContent = newMessage.content || '*No content*';

	const oldContentLength = oldContent.length;
	const newContentLength = newContent.length;
	const maxFieldLength = 1024;

	if (oldContentLength > maxFieldLength || newContentLength > maxFieldLength) {
		if (oldContentLength > maxFieldLength) {
			const oldFile = new AttachmentBuilder(Buffer.from(oldContent, 'utf-8'), {
				name: 'old_message.txt',
			});
			files.push(oldFile);
			embed.addFields({
				name: '**❯ Old Message:**',
				value: '*Message too long - see old_message.txt*',
				inline: false,
			});
		} else {
			embed.addFields({
				name: '**❯ Old Message:**',
				value: `\`\`\`${oldContent}\`\`\``,
				inline: false,
			});
		}

		if (newContentLength > maxFieldLength) {
			const newFile = new AttachmentBuilder(Buffer.from(newContent, 'utf-8'), {
				name: 'new_message.txt',
			});
			files.push(newFile);
			embed.addFields({
				name: '**❯ New Message:**',
				value: '*Message too long - see new_message.txt*',
				inline: false,
			});
		} else {
			embed.addFields({
				name: '**❯ New Message:**',
				value: `\`\`\`${newContent}\`\`\``,
				inline: false,
			});
		}
	} else {
		embed.addFields(
			{
				name: '**❯ Old Message:**',
				value: `\`\`\`${oldContent}\`\`\``,
				inline: false,
			},
			{
				name: '**❯ New Message:**',
				value: `\`\`\`${newContent}\`\`\``,
				inline: false,
			}
		);
	}

	return { embed, files };
}
