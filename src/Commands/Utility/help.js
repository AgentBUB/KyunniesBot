const {
	SlashCommandBuilder,
	EmbedBuilder,
	MessageFlags,
} = require('discord.js');
const Dispage = require('dispage');
const permissionMap = {
	1: 'CREATE_INSTANT_INVITE',
	2: 'KICK_MEMBERS',
	4: 'BAN_MEMBERS',
	8: 'ADMINISTRATOR',
	16: 'MANAGE_CHANNELS',
	32: 'MANAGE_GUILD',
	64: 'ADD_REACTIONS',
	128: 'VIEW_AUDIT_LOG',
	256: 'PRIORITY_SPEAKER',
	512: 'STREAM',
	1024: 'VIEW_CHANNEL',
	2048: 'SEND_MESSAGES',
	4096: 'SEND_TTS_MESSAGES',
	8192: 'MANAGE_MESSAGES',
	16384: 'EMBED_LINKS',
	32768: 'ATTACH_FILES',
	65536: 'READ_MESSAGE_HISTORY',
	131072: 'MENTION_EVERYONE',
	262144: 'USE_EXTERNAL_EMOJIS',
	524288: 'CONNECT',
	1048576: 'SPEAK',
	2097152: 'MUTE_MEMBERS',
	4194304: 'DEAFEN_MEMBERS',
	8388608: 'MOVE_MEMBERS',
	16777216: 'USE_VAD',
	67108864: 'CHANGE_NICKNAME',
	134217728: 'MANAGE_NICKNAMES',
	268435456: 'MANAGE_ROLES',
	536870912: 'MANAGE_WEBHOOKS',
	1073741824: 'MANAGE_EMOJIS_AND_STICKERS',
	2147483648: 'USE_APPLICATION_COMMANDS',
	4294967296: 'REQUEST_TO_SPEAK',
	8589934592: 'MANAGE_EVENTS',
	17179869184: 'MANAGE_THREADS',
	34359738368: 'CREATE_PUBLIC_THREADS',
	68719476736: 'CREATE_PRIVATE_THREADS',
	137438953472: 'USE_EXTERNAL_STICKERS',
	274877906944: 'SEND_MESSAGES_IN_THREADS',
	549755813888: 'USE_EMBEDDED_ACTIVITIES',
	1099511627776: 'MODERATE_MEMBERS',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays all the commands & command information.')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command you want info on.')
				.setRequired(false)
		),
	run: async (client, interaction) => {
		const command = interaction.options.getString('command');

		const embed = new EmbedBuilder()
			.setColor('Blurple')
			.setAuthor({ name: `Help Menu`, iconURL: client.user.displayAvatarURL() })
			.setFooter({
				text: `Requested by ${
					interaction.user.discriminator !== '0'
						? interaction.user.tag
						: interaction.user.username
				}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
			})
			.setTimestamp();

		if (command) {
			const cmd = await client.commands.get(command);
			if (!cmd)
				return interaction.reply({
					content: `Invalid Command named: \`${command}\``,
					flags: MessageFlags.Ephemeral,
				});
			const { data } = cmd;
			if (data.name === 'owner' && !client.owners.includes(interaction.user.id))
				return interaction.reply({
					content: `You do not have permissions to access: \`${command}\``,
					flags: MessageFlags.Ephemeral,
				});

			embed
				.setAuthor({
					name: `Command Help`,
					iconURL: client.user.displayAvatarURL(),
				})
				.setTitle(`Command: /${data.name}`)
				.addFields(
					{
						name: 'Description',
						value: data.description,
					},
					{
						name: 'Usable in DMs',
						value:
							data.dm_permission === undefined
								? 'False'
								: client.utils.capitalize(data.dm_permission.toString()),
					},
					{
						name: 'Required Permissions',
						value:
							data.default_member_permissions === undefined
								? 'N/A'
								: permissionMap[data.default_member_permissions],
					}
				);

			return interaction.reply({ embeds: [embed] });
		} else {
			embed.setTitle('Information').setDescription(
				`**__Information:__**
                > All commands are slash commands. This means there is no prefix except \`/\` that is accepted.
                > If you run \`/help\` and then type a command name after you can get information for that exact command.
				
				**__Commands:__**
                > Click then next button below to progress through commands.`
			);

			const embeds = [embed];
			const cmdArrays = [];
			const cmdArray = Array.from(client.commands.entries());
			for (let i = 0; i < cmdArray.length; i += 6) {
				cmdArrays.push(cmdArray.slice(i, i + 6));
			}
			for (let i = 0; i < cmdArrays.length; i++) {
				const array = cmdArrays[i];
				const cmdEmbed = new EmbedBuilder()
					.setColor('Blurple')
					.setAuthor({
						name: `Help Menu`,
						iconURL: client.user.displayAvatarURL(),
					})
					.setFooter({
						text: `Requested by ${interaction.user.username}`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					})
					.setTitle(`Commands | Page #${i + 1}`);
				for (let index = 0; index < array.length; index++) {
					const element = array[index][1];
					if (element.data.name !== 'owner')
						cmdEmbed.addFields({
							name: `/${element.data.name}`,
							value: element.data.description,
						});
					if (
						element.data.name === 'owner' &&
						client.owners.includes(interaction.user.id)
					)
						cmdEmbed.addFields({
							name: `/${element.data.name}`,
							value: element.data.description,
						});
				}
				embeds.push(cmdEmbed);
			}

			return new Dispage()
				.setEmbeds(embeds)
				.setMainStyle('Secondary')
				.editButton('previous', {
					emoji: client.config.prevEmojiId,
					label: null,
				})
				.editButton('stop', {
					emoji: client.config.stopEmojiId,
					label: null,
					style: 'Danger',
				})
				.editButton('next', { emoji: client.config.nextEmojiId, label: null })
				.editButton('stop', { style: 'Danger' })
				.start(interaction);
		}
	},
};
