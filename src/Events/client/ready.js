const { ActivityType } = require('discord.js');
const { checkStream, getIsLive } = require('../../Structures/TwitchNotify');
const { checkTwitter } = require('../../Structures/TwitterNotify');
const { checkYouTube } = require('../../Structures/YoutubeNotify');

module.exports = {
	name: 'ready',
	once: true,
	execute: async (client) => {
		console.log(
			[
				`Bot Started`,
				`Logged in as ${client.user.tag}`,
				`Loaded ${client.commands.size} commands!`,
				`Loaded ${client.menus.size} menus!`,
				`Loaded ${client.events.size} events!`,
			].join('\n')
		);

		const settings = await client.db
			.collection('settings')
			.find({ setup: true })
			.toArray();

		for (const setting of settings) {
			// Initialize notification systems with staggered starts
			if (setting.notifications.twitch.enabled) checkStream(client, setting);
			if (setting.notifications.youtube.enabled) checkYouTube(client, setting);
			if (setting.notifications.twitter.enabled)
				setTimeout(() => checkTwitter(client, setting), 2000); // after 2 seconds

			// Set intervals for checking
			if (setting.notifications.twitch.enabled)
				setInterval(() => checkStream(client, setting), 5 * 60 * 1000); // every 5 minute
			if (setting.notifications.youtube.enabled)
				setInterval(() => checkYouTube(client, setting), 30 * 60 * 1000); // every 30 minutes
			if (setting.notifications.twitter.enabled)
				setInterval(() => checkTwitter(client, setting), 20 * 60 * 1000); // every 20 minutes
		}

		// Process any expired mutes from when bot was offline
		await processExpiredMutes(client);
		// Load all active timeouts
		await loadAllActiveTimeouts(client);

		setInterval(() => {
			if (getIsLive()) {
				client.user.setActivity(`twitch.tv/minorikyun`, {
					type: ActivityType.Streaming,
					url: `https://twitch.tv/minorikyun`,
				});
				return;
			}

			const activities = [
				`twitch.tv/minorikyun`,
				`x.com/Minorikyun`,
				`youtube.com/@Minorikyun`,
				`youtube.com/@MinorikyunASMR`,
				`${client.guilds.cache.reduce(
					(a, b) => a + b.memberCount,
					0
				)} kyunnies!`,
			];

			client.user.setActivity(
				`${activities[Math.floor(Math.random() * activities.length)]}`,
				{
					type: ActivityType.Watching,
				}
			);
		}, 15000);
	},
};

async function processExpiredMutes(client) {
	try {
		const now = new Date();
		const expiredMutes = await client.db
			.collection('muted')
			.find({
				time: { $ne: null, $lte: now },
			})
			.toArray();

		for (const muteEntry of expiredMutes) {
			try {
				const guild = client.guilds.cache.get(muteEntry.id);
				if (!guild) {
					await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
					continue;
				}

				const member = await guild.members
					.fetch(muteEntry.user)
					.catch(() => null);
				if (!member) {
					await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
					continue;
				}

				if (muteEntry.roles && muteEntry.roles.length > 0) {
					const validRoles = muteEntry.roles.filter((roleId) =>
						guild.roles.cache.has(roleId)
					);
					await member.roles.set(validRoles, 'Automatic unmute - time expired');
				} else {
					const settings = await client.db
						.collection('settings')
						.findOne({ id: guild.id });
					if (settings?.muteRole) {
						await member.roles.remove(
							settings.muteRole,
							'Automatic unmute - time expired'
						);
					}
				}

				await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
			} catch (error) {
				console.error(
					`Error processing expired mute for user ${muteEntry.user}:`,
					error
				);
			}
		}

		console.log(`Processed ${expiredMutes.length} expired mutes`);
	} catch (error) {
		console.error('Error processing expired mutes:', error);
	}
}

const activeTimeouts = new Map();
function scheduleUnmute(client, muteEntry) {
	if (muteEntry.time == null) return;

	const timeUntilUnmute = muteEntry.time.getTime() - Date.now();

	if (timeUntilUnmute <= 0) {
		processSingleUnmute(client, muteEntry);
		return;
	}

	if (activeTimeouts.has(`${muteEntry.id}_${muteEntry.user}`)) {
		clearTimeout(activeTimeouts.get(`${muteEntry.id}_${muteEntry.user}`));
	}

	const timeoutId = setTimeout(async () => {
		await processSingleUnmute(client, muteEntry);
		activeTimeouts.delete(`${muteEntry.id}_${muteEntry.user}`);
	}, timeUntilUnmute);

	activeTimeouts.set(`${muteEntry.id}_${muteEntry.user}`, timeoutId);
}
async function processSingleUnmute(client, muteEntry) {
	try {
		const guild = client.guilds.cache.get(muteEntry.id);
		if (!guild) {
			await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
			return;
		}

		const member = await guild.members.fetch(muteEntry.user).catch(() => null);
		if (!member) {
			await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
			return;
		}

		if (muteEntry.roles && muteEntry.roles.length > 0) {
			const validRoles = muteEntry.roles.filter((roleId) =>
				guild.roles.cache.has(roleId)
			);
			await member.roles.set(validRoles, 'Automatic unmute - time expired');
		} else {
			const settings = await client.db
				.collection('settings')
				.findOne({ id: guild.id });
			if (settings?.muteRole) {
				await member.roles.remove(
					settings.muteRole,
					'Automatic unmute - time expired'
				);
			}
		}

		await client.db.collection('muted').deleteOne({ _id: muteEntry._id });
	} catch (error) {
		console.error(`Error processing unmute for user ${muteEntry.user}:`, error);
	}
}
async function loadAllActiveTimeouts(client) {
	try {
		const now = new Date();
		const activeMutes = await client.db
			.collection('muted')
			.find({
				time: { $ne: null, $gt: now },
			})
			.toArray();

		for (const muteEntry of activeMutes) {
			scheduleUnmute(client, muteEntry);
		}

		console.log(`Loaded ${activeMutes.length} active mute timeouts`);
	} catch (error) {
		console.error('Error loading active timeouts:', error);
	}
}
