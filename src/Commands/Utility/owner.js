const {
	SlashCommandBuilder,
	EmbedBuilder,
	Attachment,
	MessageFlags,
} = require('discord.js');
const moment = require('moment');
const filterLevels = {
	0: 'Off',
	1: 'No Role',
	2: 'Everyone',
};
const verificationLevels = {
	0: 'None',
	1: 'Low',
	2: 'Medium',
	3: '(╯°□°）╯︵ ┻━┻',
	4: '┻━┻ ﾐヽ(ಠ益ಠ)ノ彡┻━┻',
};
const locales = {
	'en-US': 'English (United States)',
	'en-GB': 'English (Great Britain)',
	de: 'German',
	fr: 'French',
	ru: 'Russian',
};
const { inspect } = require('util');
const { Type } = require('@anishshobith/deeptype');
const Dispage = require('dispage');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('owner')
		.setDescription('Bot Owner only commands.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('test')
				.setDescription('Run whatever is setup as the test command.')
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('bdreset')
				.setDescription("Delete user's bday database entry.")
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('User to DB delete.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('eval')
				.setDescription('Evaluate code that could be run through the bot.')
				.addStringOption((option) =>
					option
						.setName('code')
						.setDescription('The code you want to evaluate.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('guilds')
				.setDescription('This displays all guilds the bot is in.')
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('refresh')
				.setDescription('Refresh a commands.')
				.addStringOption((option) =>
					option
						.setName('command')
						.setDescription('The command to reload.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('folder')
						.setDescription('Folder where the command file is located.')
						.setRequired(true)
				)
		),
	run: async (client, interaction) => {
		if (!client.owners.includes(interaction.user.id))
			return interaction.reply({
				content: `You do not have permissions to access this command.`,
				flags: MessageFlags.Ephemeral,
			});

		const cmd = interaction.options.getSubcommand();
		if (cmd === 'eval') {
			const code = interaction.options
				.getString('code')
				.replace(/[“”]/g, '"')
				.replace(/[‘’]/g, "'");
			let evaled;
			try {
				const start = process.hrtime();
				evaled = eval(code);
				if (evaled instanceof Promise) {
					evaled = await evaled;
				}
				const stop = process.hrtime(start);
				const response = [
					`**Output:** \`\`\`js\n${clean(
						inspect(evaled, { depth: 0 }),
						client
					)}\n\`\`\``,
					`**Type:** \`\`\`ts\n${new Type(evaled).is}\n\`\`\``,
					`**Time Taken:** \`\`\`${(stop[0] * 1e9 + stop[1]) / 1e6}ms \`\`\``,
				];
				const res = response.join('\n');
				if (response.length < 2000) {
					await interaction.reply(res);
				} else {
					const output = new Attachment(Buffer.from(res), 'output.text');
					await interaction.reply(output);
				}
			} catch (err) {
				return interaction.reply(
					`Error: \`\`\`xl\n${clean(err, client)}\n\`\`\``
				);
			}
		} else if (cmd === 'guilds') {
			const guilds = [...client.guilds.cache.values()];

			const invites = [];
			for (const [, guild] of client.guilds.cache) {
				let invite = 'No Invites';
				const fetch = await guild.invites.fetch().catch(() => undefined);

				if (fetch && fetch.size) {
					invite = fetch.first().url;
					invites.push({ name: guild.name, invite });
					continue;
				}

				for (const [, channel] of guild.channels.cache) {
					if (!invite && channel.createInvite) {
						const attempt = await channel.createInvite().catch(() => undefined);

						if (attempt) {
							invite = attempt.url;
						}
					}
				}

				invites.push({ name: guild.name, invite });
			}

			const generateEmbed = (start) => {
				const current = guilds.slice(start, start + 1);

				const embed = new EmbedBuilder()
					.setAuthor({
						name: `Showing ${start + current.length} out of ${
							guilds.length
						} guild(s).`,
					})
					.setTitle('Guild Information')
					.setColor('Red')
					.setTimestamp()
					.setFooter({ text: `Kyunnies Bot` });

				current.forEach(async (gl) => {
					let invite = 'N/A';
					for (const inv of invites) {
						const invName = inv.name;
						const invInvite = inv.invite;
						if (invName === gl.name) invite = invInvite;
					}

					const roles = gl.roles.cache
						.sort((a, b) => b.position - a.position)
						.map((role) => role.toString());
					const members = gl.members.cache;
					const channels = gl.channels.cache;
					const emojis = gl.emojis.cache;
					const owner = client.users.cache.find(
						(user) => user.id === gl.ownerId
					);
					embed.addFields(
						{
							name: 'General',
							value: `**❯ Name:** ${gl.name}
                        **❯ ID:** ${gl.id}
                        **❯ Invite:** ${invite}
                        **❯ Locale:** ${locales[gl.preferredLocale]}
                        **❯ Boost Tier:** ${
													gl.premiumTier && gl.premiumTier !== 'NONE'
														? `Tier ${gl.premiumTier}`
														: 'None'
												}
                        **❯ Partnered:** ${gl.partnered ? 'Yes' : 'No'}
                        **❯ Verified:** ${gl.verified ? 'Yes' : 'No'}
                        **❯ Explicit Filter:** ${
													filterLevels[gl.explicitContentFilter]
												}
                        **❯ Verification Level:** ${
													verificationLevels[gl.verificationLevel]
												}
                        **❯ Time Created:** ${moment(
													gl.createdTimestamp
												).format('LT')} ${moment(gl.createdTimestamp).format(
								'LL'
							)} ${moment(gl.createdTimestamp).fromNow()}

                        **❯ Owner:**
                        \u3000 Tag: ${owner.tag}
                        \u3000 ID: ${owner.id}
                        \u3000 Mention: ${owner}
                        \u200b`,
						},
						{
							name: 'Statistics',
							value: `**❯ Role Count:** ${roles.length}
                        **❯ Emoji Count:** ${emojis.size}
                        \u3000 **❯ Regular Emoji Count:** ${
													emojis.filter((emoji) => !emoji.animated).size
												}
                        \u3000 **❯ Animated Emoji Count:** ${
													emojis.filter((emoji) => emoji.animated).size
												}
                        **❯ Member Count:** ${gl.memberCount}
                        \u3000 **❯ Humans:** ${
													members.filter((member) => !member.user.bot).size + 1
												}
                        \u3000 **❯ Bots:** ${
													members.filter((member) => member.user.bot).size + 1
												}
                        **❯ Text Channels:** ${
													channels.filter(
														(channel) => channel.type === 'GUILD_TEXT'
													).size
												}
                        **❯ Voice Channels:** ${
													channels.filter(
														(channel) => channel.type === 'GUILD_VOICE'
													).size
												}
                        **❯ Boost Count:** ${gl.premiumSubscriptionCount || '0'}
                        \u200b`,
						}
					);
				});
				return embed;
			};

			const embeds = [];
			for (let index = 0; index < guilds.length; index++) {
				embeds.push(generateEmbed(index));
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
		} else if (cmd === 'refresh') {
			const commandName = interaction.options
				.getString('command', true)
				.toLowerCase();
			const folder = interaction.options.getString('folder');
			const command = interaction.client.commands.get(commandName);

			if (!command) {
				return interaction.reply({
					content: `There is no command with name \`${commandName}\`!`,
					flags: MessageFlags.Ephemeral,
				});
			}

			try {
				delete require.cache[
					require.resolve(`../${folder}/${command.data.name}.js`)
				];

				interaction.client.commands.delete(command.data.name);
				const newCommand = require(`../${folder}/${command.data.name}.js`);
				interaction.client.commands.set(newCommand.data.name, newCommand);
				await interaction.reply({
					content: `Command \`${newCommand.data.name}\` was reloaded!`,
					flags: MessageFlags.Ephemeral,
				});
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``,
					flags: MessageFlags.Ephemeral,
				});
			}
		} else if (cmd === 'bdreset') {
			const member = interaction.options.get('user')?.user;

			await client.db
				.collection('bdays')
				.deleteOne({ id: interaction.guild.id, user: interaction.user.id });

			await interaction.reply({
				content: `${member}'s database has been deleted.`,
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: `erm what`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

function clean(text, client) {
	if (typeof text === 'string') {
		text = text
			.replace(/`/g, `\`${String.fromCharCode(8203)}`)
			.replace(/@/g, `@${String.fromCharCode(8203)}`)
			.replace(new RegExp(client.token, 'gi'), '****');
	}
	return text;
}
