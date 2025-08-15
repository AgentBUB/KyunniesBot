const filter = require('../../Structures/ChatFilter');

module.exports = {
	name: 'messageCreate',
	execute: async (message, client) => {
		if (message.channel.type === 1) return;

		const settings = await client.db
			.collection('settings')
			.findOne({ id: message.guild ? message.guild.id : null });
		if (message.guild && !settings?.setup) {
			await client.db.collection('settings').insertOne({
				id: message.guild.id,
				setup: true,
				logs: {
					tickets: null,
					transcripts: null,
					mute: null,
					general: null,
				},
				twitchDetails: {
					clientId: null,
					clientSecret: null,
					channelUsername: null,
				},
				twitterDetails: {
					apiKey: [],
					apiSecret: [],
					username: null,
					displayName: null,
					profileImageUrl: null,
				},
				youtubeDetails: {
					apiKey: [],
					channelId: [],
				},
				notifications: {
					twitch: {
						enabled: false,
						channel: null,
						ping: null,
					},
					youtube: {
						enabled: false,
						channel: {},
						ping: {},
					},
					twitter: {
						enabled: false,
						channel: null,
						ping: null,
					},
				},
				muteRole: null,
				chatFilter: {
					enabled: false,
					warningMessage: false,
					autoKick: false,
					whitelist: {
						users: [],
						roles: [],
						content: [],
					},
					blacklist: [],
				},
				levels: {
					enabled: false,
					xp: 5,
					level: 100,
				},
			});
		}

		if (message.author.bot) return;

		if (message.guild && settings?.chatFilter?.enabled)
			await filter(message, client);

		const mentionRegex = RegExp(`^<@!?${client.user.id}>$`);
		if (message.content.match(mentionRegex)) {
			message.reply(
				`I use slash commands, so please do \`/\` to begin a command. *Do \`/help\` for more information.*`
			);
		}

		if (message.guild && settings.levels.enabled) {
			let data = await client.db
				.collection('levels')
				.findOne({ id: message.guild?.id, user: message.author?.id });

			if (!data) {
				await client.db.collection('levels').insertOne({
					id: message.guild?.id,
					user: message.author?.id,
					xp: settings.levels.xp,
					level: 0,
					lastLevelUp: null,
				});
			} else {
				await client.db
					.collection('levels')
					.updateOne(
						{ id: message.guild?.id, user: message.author?.id },
						{ $inc: { xp: settings.levels.xp } }
					);
				data = await client.db
					.collection('levels')
					.findOne({ id: message.guild?.id, user: message.author?.id });

				if ((data.level + 1) * settings.levels.level <= data.xp) {
					await client.db
						.collection('levels')
						.updateOne(
							{ id: message.guild?.id, user: message.author?.id },
							{ $inc: { level: 1 }, $set: { lastLevelUp: new Date() } }
						);
				}
			}
		}
	},
};
