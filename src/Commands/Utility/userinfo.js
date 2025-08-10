const {
	SlashCommandBuilder,
	EmbedBuilder,
	InteractionContextType,
} = require('discord.js');
const moment = require('moment');
const flags = {
	Staff: 'Discord Employee',
	Partner: 'Discord Partner',
	BugHunterLevel1: 'Bug Hunter (Level 1)',
	BugHunterLevel2: 'Bug Hunter (Level 2)',
	Hypesquad: 'HypeSquad Events',
	HypeSquadOnlineHouse1: 'House of Bravery',
	HypeSquadOnlineHouse2: 'House of Brilliance',
	HypeSquadOnlineHouse3: 'House of Balance',
	PremiumEarlySupporter: 'Early Supporter',
	TeamPseudoUser: 'Team User',
	System: 'System',
	VerifiedBot: 'Verified Bot',
	VerifiedDeveloper: 'Verified Bot Developer',
	ActiveDeveloper: 'Active Developer',
	Spammer: 'Spammer',
	Quarantined: 'Quarantined',
	CertifiedModerator: 'Certified Moderator',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('userinfo')
		.setDescription('Get information on an user.')
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The avatar of the user you want to display.')
				.setRequired(false)
		)
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(0x0000000000002000),
	run: async (client, interaction) => {
		const member = interaction.options.get('user')?.user || interaction.user;
		const guildMember = await interaction.guild.members.fetch(member.id);
		const user = await guildMember.user.fetch(true);

		const roles = guildMember.roles.cache
			.sort((a, b) => b.position - a.position)
			.map((role) => role.toString())
			.slice(0, -1);
		const userFlags = user.flags.toArray();
		const embed = new EmbedBuilder()
			.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
			.setColor(user.hexAccentColor || 'Blurple')
			.addFields(
				{
					name: 'User',
					value: `**❯ Username:** ${
						user.discriminator !== '0'
							? user.tag
							: user.discriminator !== '0'
							? user.tag
							: user.username
					}${
						user.discriminator !== '0'
							? `\n**❯ Discriminator:** ${user.discriminator}`
							: ''
					}
				**❯ ID:** ${member.id}
				**❯ Flags:**
					> - ${
						userFlags.length
							? userFlags.map((flag) => flags[flag]).join('\n> - ')
							: 'None'
					}
				**❯ Avatar:** [Link to avatar](${user.displayAvatarURL({
					dynamic: true,
					size: 4096,
				})})
				**❯ Banner:** ${
					user.bannerURL() === null
						? 'No Banner'
						: `[Link to avatar](${user.bannerURL({
								dynamic: true,
								size: 4096,
						  })})`
				}
				**❯ Hex Accent Color:** ${
					user.hexAccentColor ? user.hexAccentColor.toString() : 'N/A'
				}
				**❯ Time Created:** ${moment(user.createdTimestamp).format('LT')} ${moment(
						user.createdTimestamp
					).format('LL')} ${moment(user.createdTimestamp).fromNow()}
				\u200b`,
				},
				{
					name: 'Member',
					value: `**❯ Highest Role:** ${
						guildMember.roles.highest.id === interaction.guild.id
							? 'None'
							: guildMember.roles.highest.name
					}
				**❯ Server Join Date:** ${moment(guildMember.joinedAt).format('LL LTS')}
				**❯ Hoist Role:** ${
					guildMember.roles.hoist ? guildMember.roles.hoist.name : 'None'
				}
				**❯ Roles [${roles.length}]:** ${
						roles.length < 10
							? roles.join(', ')
							: roles.length > 10
							? this.client.utils.trimArray(roles)
							: 'None'
					}
				\u200b`,
				}
			);

		return interaction.reply({ embeds: [embed] });
	},
};
