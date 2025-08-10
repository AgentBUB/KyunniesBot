const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Cache for phishing and suspicious links (updated every 30 minutes)
let phishingLinks = new Set();
let suspiciousLinks = new Set();
let lastUpdated = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const violations = {};

async function updateLinkLists() {
	const now = Date.now();
	if (now - lastUpdated < CACHE_DURATION) {
		return; // Cache is still valid
	}

	try {
		const phishingResponse = await axios.get(
			'https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json',
			{ timeout: 10000 }
		);
		phishingLinks = new Set(phishingResponse.data?.domains);

		const suspiciousResponse = await axios.get(
			'https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/suspicious-list.json',
			{ timeout: 10000 }
		);
		suspiciousLinks = new Set(suspiciousResponse.data?.domains);

		lastUpdated = now;
		console.log(
			`Updated link lists: ${phishingLinks.size} phishing, ${suspiciousLinks.size} suspicious`
		);
	} catch (error) {
		console.error('Error updating link lists:', error.message);
	}
}

function extractDomains(text) {
	const domains = new Set();

	const urlRegex = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)/gi;
	let match;

	while ((match = urlRegex.exec(text)) !== null) {
		domains.add(match[1].toLowerCase());
	}

	const words = text.split(/\s+/);

	for (let word of words) {
		word = word.replace(/[.,!?;:()'"]+$/, '');

		const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
		if (domainRegex.test(word)) {
			const domain = word.toLowerCase();

			if (!domain.match(/\.(jpg|jpeg|png|gif|mp4|pdf|doc|txt|zip)$/i)) {
				domains.add(domain);
			}
		}
	}

	return Array.from(domains);
}

async function containsDiscordInvite(text, guild) {
	const inviteRegex =
		/(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)([a-zA-Z0-9-]+)/gi;
	const matches = text.matchAll(inviteRegex);

	for (const match of matches) {
		const inviteCode = match[2];

		if (inviteCode.toLowerCase() === guild.vanityURLCode?.toLowerCase()) {
			continue;
		}

		try {
			const invite = await guild.client.fetchInvite(inviteCode);
			if (!invite.guild || invite.guild.id !== guild.id) {
				return true;
			}
		} catch (error) {
			return true;
		}
	}

	return false;
}

function isUserWhitelisted(message, whitelist) {
	if (!whitelist) return false;

	if (message.client.owners.includes(message.author.id)) {
		return true;
	}

	if (message.member && message.member.permissions.has('Administrator')) {
		return true;
	}

	if (whitelist.users && whitelist.users.includes(message.author.id)) {
		return true;
	}

	if (whitelist.roles && message.member) {
		const userRoles = message.member.roles.cache.map((role) => role.id);
		if (whitelist.roles.some((roleId) => userRoles.includes(roleId))) {
			return true;
		}
	}

	return false;
}

function containsWhitelistedContent(text, whitelistContent) {
	if (!whitelistContent || !Array.isArray(whitelistContent)) return false;

	return whitelistContent.some((whitelisted) =>
		text.toLowerCase().includes(whitelisted.toLowerCase())
	);
}

async function handleAutoKick(settings, message, reason, trigger) {
	if (violations[message.author.id]) {
		violations[message.author.id].push(new Date());

		if (violations[message.author.id].length >= 3) {
			const recentViolations = violations[message.author.id].slice(-3);
			const oldestViolation = recentViolations[0];
			const newestViolation = recentViolations[2];
			const timeDifference =
				newestViolation.getTime() - oldestViolation.getTime();
			const fiveMinutesInMs = 5 * 60 * 1000;

			if (timeDifference <= fiveMinutesInMs) {
				try {
					if (settings?.logs?.mute) {
						const logChannel = message.guild.channels.cache.get(
							settings.logs.mute
						);
						if (logChannel) {
							const embed = new EmbedBuilder()
								.setColor('#FF0000')
								.setTitle('User Kicked - Multiple Violations')
								.addFields([
									{
										name: 'User',
										value: `${message.author.tag} (${message.author.id})`,
										inline: true,
									},
									{
										name: 'Violation',
										value: reason,
										inline: true,
									},
									{
										name: 'Violation Trigger',
										value: trigger,
										inline: true,
									},
									{
										name: 'Time Span',
										value: `${Math.round(timeDifference / 1000)} seconds`,
										inline: true,
									},
									{
										name: 'Reason',
										value: 'Multiple chat filter violations within 5 minutes',
										inline: false,
									},
								])
								.setTimestamp();

							await logChannel.send({ embeds: [embed] });
						}
					}

					try {
						await message.client.users.send(
							message.author.id,
							`**You have been kicked** from \`${message.guild.name}\` **for multiple chat filter violations within 5 minutes**.`
						);
					} catch (error) {
						// don't care
					}

					await message.member.kick(
						'Multiple chat filter violations within 5 minutes'
					);
					delete violations[message.author.id];

					return true;
				} catch (error) {
					console.error(
						`❌ Failed to kick ${message.author.tag}:`,
						error.message
					);
					return false;
				}
			}
		}
	} else {
		violations[message.author.id] = [new Date()];
		return false;
	}
}

async function handleFiltered(settings, message, reason, trigger) {
	try {
		await message.delete();

		if (settings.chatFilter.autoKick) {
			if (await handleAutoKick(settings, message, reason, trigger)) return;
		}

		if (settings.chatFilter.warningMessage) {
			const warningMessage = await message.channel.send({
				content: `${message.author}, your message was removed: \`${reason}\``,
			});
			setTimeout(() => {
				warningMessage.delete().catch(() => {});
			}, 2500);
		}

		if (settings?.logs?.mute) {
			const logChannel = message.guild.channels.cache.get(settings.logs.mute);
			if (logChannel) {
				const embed = new EmbedBuilder()
					.setColor('#FF0000')
					.setTitle('Message Filtered')
					.setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
					.addFields([
						{
							name: 'User',
							value: `${message.author.tag} (${message.author.id})`,
							inline: true,
						},
						{
							name: 'Channel',
							value: message.channel.toString(),
							inline: true,
						},
						{ name: 'Reason', value: reason, inline: false },
						{
							name: 'Content',
							value: message.content.substring(0, 1000) || '*No content*',
							inline: false,
						},
					])
					.setFooter({ text: 'Shadow Logging System' })
					.setTimestamp();
				if (trigger)
					embed.addFields({
						name: 'Trigger',
						value: trigger,
						inline: false,
					});

				await logChannel.send({ embeds: [embed] });
			}
		}
	} catch (error) {
		console.error('Error handling filtered message:', error);
	}
}

module.exports = async function filter(message, client) {
	try {
		if (!message.guild) return { allowed: true };

		const settings = await client.db
			.collection('settings')
			.findOne({ id: message.guild.id });
		const { chatFilter } = settings || {};

		if (!chatFilter) return { allowed: true };

		// if (isUserWhitelisted(message, chatFilter.whitelist)) {
		// 	return { allowed: true, reason: 'User whitelisted' };
		// }

		if (
			containsWhitelistedContent(message.content, chatFilter.whitelist?.content)
		) {
			return { allowed: true, reason: 'Content whitelisted' };
		}

		const content = message.content.toLowerCase();

		if (await containsDiscordInvite(message.content, message.guild)) {
			await handleFiltered(settings, message, 'Discord invite detected');
			return {
				allowed: false,
				reason: 'Discord invite detected',
				type: 'discord_invite',
			};
		}

		if (chatFilter.blacklist && Array.isArray(chatFilter.blacklist)) {
			for (const blacklisted of chatFilter.blacklist) {
				if (content.includes(blacklisted.toLowerCase())) {
					await handleFiltered(
						settings,
						message,
						`Blacklisted content`,
						blacklisted
					);
					return {
						allowed: false,
						reason: `Blacklisted content: ${blacklisted}`,
						type: 'blacklisted_content',
						trigger: blacklisted,
					};
				}
			}
		}

		await updateLinkLists();

		const domains = extractDomains(message.content);

		for (const domain of domains) {
			if (phishingLinks.has(domain)) {
				await handleFiltered(
					settings,
					message,
					`Phishing link detected`,
					domain
				);
				return {
					allowed: false,
					reason: `Phishing link detected: ${domain}`,
					type: 'phishing_link',
					trigger: domain,
				};
			}
		}

		for (const domain of domains) {
			if (suspiciousLinks.has(domain)) {
				await handleFiltered(
					settings,
					message,
					`Suspicious link detected`,
					domain
				);
				return {
					allowed: false,
					reason: `Suspicious link detected: ${domain}`,
					type: 'suspicious_link',
					trigger: domain,
				};
			}
		}

		return { allowed: true };
	} catch (error) {
		console.error('Error in message filter:', error);
		return { allowed: true, error: error.message };
	}
};

updateLinkLists();
setInterval(() => {
	// Help prevent memory leaks, so clear if no recent violations
	const now = new Date();
	const oneHourAgo = now.getTime() - 60 * 60 * 1000;

	for (const userId in violations) {
		violations[userId] = violations[userId].filter(
			(violation) => violation.getTime() > oneHourAgo
		);

		if (violations[userId].length === 0) {
			delete violations[userId];
		}
	}
}, 60 * 60 * 1000); // per hour
