const {
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
} = require('discord.js');
const axios = require('axios');

let keyStates = {};
let currentKeyIndex = {};

function initializeKeyStates(settingId, youtubeDetails) {
	const keyId = `setting_${settingId}`;

	if (!keyStates[keyId]) {
		keyStates[keyId] = {};
		currentKeyIndex[keyId] = 0;

		const apiKeys = Array.isArray(youtubeDetails.apiKey)
			? youtubeDetails.apiKey
			: [youtubeDetails.apiKey];

		for (let i = 0; i < apiKeys.length; i++) {
			keyStates[keyId][`key_${i}`] = {
				isRateLimited: false,
				resetTime: null,
				errorCount: 0,
			};
		}
	}
}

function getAvailableApiKey(settingId, youtubeDetails) {
	const keyId = `setting_${settingId}`;
	const apiKeys = Array.isArray(youtubeDetails.apiKey)
		? youtubeDetails.apiKey
		: [youtubeDetails.apiKey];
	const now = Date.now();

	// Start from current key index
	let startIndex = currentKeyIndex[keyId] || 0;

	for (let i = 0; i < apiKeys.length; i++) {
		const keyIndex = (startIndex + i) % apiKeys.length;
		const keyStateKey = `key_${keyIndex}`;
		const state = keyStates[keyId][keyStateKey];

		// Check if key is available (not rate limited or reset time has passed)
		if (!state.isRateLimited || (state.resetTime && now > state.resetTime)) {
			if (state.resetTime && now > state.resetTime) {
				state.isRateLimited = false;
				state.resetTime = null;
				state.errorCount = 0;
			}

			currentKeyIndex[keyId] = keyIndex;
			return {
				key: apiKeys[keyIndex],
				index: keyIndex,
				keyStateKey: keyStateKey,
			};
		}
	}

	return null; // No available keys
}

function handleApiKeyError(settingId, keyIndex, error) {
	const keyId = `setting_${settingId}`;
	const keyStateKey = `key_${keyIndex}`;
	const state = keyStates[keyId][keyStateKey];

	console.error(
		`Error with API key ${keyIndex} for setting ${settingId}:`,
		error.message
	);

	if (error.response && error.response.status === 403) {
		// Quota exceeded or forbidden
		state.isRateLimited = true;
		state.resetTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
		console.log(`API key ${keyIndex} rate limited for 24 hours`);
	} else if (error.response && error.response.status === 429) {
		// Too many requests
		state.isRateLimited = true;
		state.resetTime = Date.now() + 60 * 60 * 1000; // 1 hour
		console.log(`API key ${keyIndex} rate limited for 1 hour`);
	} else {
		// Other errors - increment error count
		state.errorCount++;
		if (state.errorCount >= 3) {
			// After 3 errors, rate limit for 30 minutes
			state.isRateLimited = true;
			state.resetTime = Date.now() + 30 * 60 * 1000;
			console.log(
				`API key ${keyIndex} temporarily disabled after ${state.errorCount} errors`
			);
		}
	}

	// Move to next key for future requests
	const apiKeys = Array.isArray(keyStates[keyId])
		? Object.keys(keyStates[keyId]).length
		: 1;
	currentKeyIndex[keyId] = (keyIndex + 1) % apiKeys;
}

async function makeYouTubeRequest(settingId, youtubeDetails, endpoint, params) {
	initializeKeyStates(settingId, youtubeDetails);

	const apiKeys = Array.isArray(youtubeDetails.apiKey)
		? youtubeDetails.apiKey
		: [youtubeDetails.apiKey];

	for (let attempt = 0; attempt < apiKeys.length; attempt++) {
		const keyData = getAvailableApiKey(settingId, youtubeDetails);

		if (!keyData) {
			console.log(`No available API keys for setting ${settingId}`);
			return null;
		}

		try {
			const requestParams = { ...params, key: keyData.key };
			const response = await axios.get(endpoint, { params: requestParams });

			// Success - reset error count for this key
			const keyId = `setting_${settingId}`;
			keyStates[keyId][keyData.keyStateKey].errorCount = 0;

			console.log(
				`Successfully used API key ${keyData.index} for setting ${settingId}`
			);
			return response;
		} catch (error) {
			handleApiKeyError(settingId, keyData.index, error);

			// If this was the last attempt or a non-recoverable error, break
			if (
				attempt === apiKeys.length - 1 ||
				(error.response &&
					error.response.status !== 403 &&
					error.response.status !== 429)
			) {
				console.error(
					`All API keys failed or non-recoverable error for setting ${settingId}`
				);
				return null;
			}

			// Continue to next key
			console.log(`Trying next API key for setting ${settingId}...`);
		}
	}

	return null;
}

async function checkYouTube(client, setting) {
	if (!setting.youtubeDetails?.apiKey || !setting.youtubeDetails?.channelId)
		return;

	const channelIds = Array.isArray(setting.youtubeDetails.channelId)
		? setting.youtubeDetails.channelId
		: [setting.youtubeDetails.channelId];

	for (const channelId of channelIds) {
		await checkSingleYouTubeChannel(client, setting, channelId);
	}
}

async function checkSingleYouTubeChannel(client, setting, channelId) {
	try {
		const response = await makeYouTubeRequest(
			setting.id,
			setting.youtubeDetails,
			'https://www.googleapis.com/youtube/v3/search',
			{
				channelId: channelId,
				part: 'snippet',
				order: 'date',
				maxResults: 1,
				type: 'video',
			}
		);

		if (!response || !response.data.items || response.data.items.length === 0) {
			return;
		}

		const latestVideo = response.data.items[0];
		const videoId = latestVideo.id.videoId;

		const shouldSendNotification = await checkLastYouTubeNotification(
			client,
			videoId,
			setting.notifications.youtube.channel[channelId],
			channelId
		);

		if (shouldSendNotification) {
			const videoDetailsResponse = await makeYouTubeRequest(
				setting.id,
				setting.youtubeDetails,
				'https://www.googleapis.com/youtube/v3/videos',
				{
					id: videoId,
					part: 'snippet,contentDetails,statistics',
				}
			);

			if (
				videoDetailsResponse &&
				videoDetailsResponse.data.items &&
				videoDetailsResponse.data.items.length > 0
			) {
				const videoDetails = videoDetailsResponse.data.items[0];
				sendYouTubeEmbed(
					videoDetails,
					client,
					setting.notifications.youtube,
					channelId
				);
			}
		}
	} catch (error) {
		console.error(
			`Error in checkSingleYouTubeChannel for ${channelId}:`,
			error.message
		);
	}
}

async function checkLastYouTubeNotification(
	client,
	videoId,
	discordChannelId,
	youtubeChannelId
) {
	const channel = client.channels.cache.get(discordChannelId);
	if (!channel) {
		console.error('Discord channel not found');
		return true;
	}

	try {
		const messages = await channel.messages.fetch({ limit: 20 });
		if (messages.size === 0) return true;

		for (const message of messages.values()) {
			if (message.author.id === client.user.id && message.embeds.length > 0) {
				const embed = message.embeds[0];

				if (embed.url && embed.url.includes(videoId)) {
					console.log(
						`Found duplicate video (URL): ${videoId} for channel ${youtubeChannelId}`
					);
					return false;
				}

				if (
					embed.author &&
					embed.author.url &&
					embed.author.url.includes(youtubeChannelId) &&
					embed.url &&
					embed.url.includes(videoId)
				) {
					console.log(
						`Found duplicate video from channel ${youtubeChannelId}: ${videoId}`
					);
					return false;
				}
			}
		}

		return true;
	} catch (error) {
		console.error('Error checking last YouTube notification:', error);
		return true;
	}
}

function formatDuration(isoDuration) {
	let hours = 0;
	let minutes = 0;
	let seconds = 0;

	const hourMatch = isoDuration.match(/(\d+)H/);
	const minuteMatch = isoDuration.match(/(\d+)M/);
	const secondMatch = isoDuration.match(/(\d+)S/);

	if (hourMatch) hours = parseInt(hourMatch[1]);
	if (minuteMatch) minutes = parseInt(minuteMatch[1]);
	if (secondMatch) seconds = parseInt(secondMatch[1]);

	let formattedDuration = '';
	if (hours > 0) {
		formattedDuration += `${hours}:`;
		formattedDuration += minutes < 10 ? `0${minutes}:` : `${minutes}:`;
	} else {
		formattedDuration += `${minutes}:`;
	}
	formattedDuration += seconds < 10 ? `0${seconds}` : `${seconds}`;

	return formattedDuration;
}

function formatCount(count) {
	return parseInt(count).toLocaleString();
}

function sendYouTubeEmbed(videoDetails, client, settings, channelId) {
	const channel = client.channels.cache.get(settings.channel[channelId]);
	if (!channel) return console.error('Discord channel not found');

	try {
		const snippet = videoDetails.snippet;
		const stats = videoDetails.statistics;
		const videoId = videoDetails.id;

		const publishDate = new Date(snippet.publishedAt);
		const timestamp = Math.floor(publishDate.getTime() / 1000);

		const thumbnail =
			snippet.thumbnails.maxres ||
			snippet.thumbnails.standard ||
			snippet.thumbnails.high ||
			snippet.thumbnails.medium ||
			snippet.thumbnails.default;

		const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

		let duration = '';
		if (videoDetails.contentDetails && videoDetails.contentDetails.duration) {
			duration = formatDuration(videoDetails.contentDetails.duration);
		}

		const embed = new EmbedBuilder()
			.setColor('#FF0000')
			.setTitle(snippet.title)
			.setURL(videoUrl)
			.setAuthor({
				name: snippet.channelTitle,
				url: `https://www.youtube.com/channel/${snippet.channelId}`,
			})
			.setDescription(
				`${
					snippet.description
						? snippet.description.substring(0, 150) + '...'
						: 'No description'
				}`
			)
			.setImage(thumbnail.url)
			.setTimestamp()
			.setFooter({ text: `Youtube Video Notification` });

		const fields = [];

		if (duration) {
			fields.push({
				name: 'Duration',
				value: duration,
				inline: true,
			});
		}

		if (stats) {
			if (stats.viewCount) {
				fields.push({
					name: 'Views',
					value: formatCount(stats.viewCount),
					inline: true,
				});
			}

			if (stats.likeCount) {
				fields.push({
					name: 'Likes',
					value: formatCount(stats.likeCount),
					inline: true,
				});
			}
		}

		fields.push({
			name: 'Published',
			value: `<t:${timestamp}:t> (<t:${timestamp}:R>)`,
			inline: false,
		});

		if (fields.length > 0) {
			embed.addFields(fields);
		}

		const actionRow = new ActionRowBuilder();
		actionRow.addComponents(
			new ButtonBuilder()
				.setLabel(`View Video`)
				.setURL(videoUrl)
				.setStyle(ButtonStyle.Link)
		);

		if (settings.ping[channelId] == 'everyone') {
			channel.send({
				content: '@everyone',
				components: [actionRow],
				embeds: [embed],
			});
		} else if (settings.ping[channelId] == 'here') {
			channel.send({
				content: '@here',
				components: [actionRow],
				embeds: [embed],
			});
		} else if (settings.ping[channelId]) {
			channel.send({
				content: `<@&${settings.ping[channelId]}>`,
				components: [actionRow],
				embeds: [embed],
			});
		} else {
			channel.send({
				components: [actionRow],
				embeds: [embed],
			});
		}
	} catch (error) {
		console.error('Error sending YouTube notification:', error);
		return false;
	}
}

module.exports = {
	checkYouTube,
};
