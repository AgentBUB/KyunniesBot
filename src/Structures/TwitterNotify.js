const {
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
} = require('discord.js');
const axios = require('axios');

let bearerTokens = {};
let lastTokenRefresh = {};
let backoffTime = 60 * 60 * 1000;

const keyStates = {};

function initializeKeyStates(twitterDetails) {
	const keyCount = Array.isArray(twitterDetails.apiKey)
		? twitterDetails.apiKey.length
		: 1;

	for (let i = 0; i < keyCount; i++) {
		const keyId = `key_${i}`;
		if (!keyStates[keyId]) {
			keyStates[keyId] = {
				resetTime: null,
				remaining: null,
				isRateLimited: false,
			};
		}
	}
}

function getAvailableKeyIndex(twitterDetails) {
	const now = Date.now();
	const keyCount = Array.isArray(twitterDetails.apiKey)
		? twitterDetails.apiKey.length
		: 1;

	for (let i = 0; i < keyCount; i++) {
		const keyId = `key_${i}`;
		const state = keyStates[keyId];

		if (!state.isRateLimited || (state.resetTime && now > state.resetTime)) {
			if (state.resetTime && now > state.resetTime) {
				state.isRateLimited = false;
				state.resetTime = null;
				state.remaining = null;
				console.log(`Key ${keyId} rate limit expired, marking as available`);
			}
			return i;
		}
	}

	return -1;
}

function areAllKeysRateLimited(twitterDetails) {
	const now = Date.now();
	const keyCount = Array.isArray(twitterDetails.apiKey)
		? twitterDetails.apiKey.length
		: 1;

	for (let i = 0; i < keyCount; i++) {
		const keyId = `key_${i}`;
		const state = keyStates[keyId];
		if (
			!state ||
			!state.isRateLimited ||
			(state.resetTime && now > state.resetTime)
		) {
			return false;
		}
	}

	return true;
}

function getEarliestResetTime(twitterDetails) {
	const keyCount = Array.isArray(twitterDetails.apiKey)
		? twitterDetails.apiKey.length
		: 1;
	let earliest = Number.MAX_SAFE_INTEGER;

	for (let i = 0; i < keyCount; i++) {
		const keyId = `key_${i}`;
		const state = keyStates[keyId];
		if (state && state.resetTime && state.resetTime < earliest) {
			earliest = state.resetTime;
		}
	}

	return earliest === Number.MAX_SAFE_INTEGER
		? Date.now() + backoffTime
		: earliest;
}

async function getTwitterTokenForKey(twitterDetails, keyIndex) {
	try {
		const keyId = `key_${keyIndex}`;
		const now = Date.now();

		if (
			bearerTokens[keyId] &&
			now - (lastTokenRefresh[keyId] || 0) < 24 * 60 * 60 * 1000
		) {
			return { token: bearerTokens[keyId], keyIndex, keyId };
		}

		const apiKey = Array.isArray(twitterDetails.apiKey)
			? twitterDetails.apiKey[keyIndex]
			: twitterDetails.apiKey;
		const apiSecret = Array.isArray(twitterDetails.apiSecret)
			? twitterDetails.apiSecret[keyIndex]
			: twitterDetails.apiSecret;

		const response = await axios.post(
			'https://api.twitter.com/oauth2/token',
			'grant_type=client_credentials',
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${Buffer.from(
						`${apiKey}:${apiSecret}`
					).toString('base64')}`,
				},
			}
		);

		bearerTokens[keyId] = response.data.access_token;
		lastTokenRefresh[keyId] = now;

		console.log(`Twitter token obtained successfully for ${keyId}`);
		return { token: bearerTokens[keyId], keyIndex, keyId };
	} catch (error) {
		console.error(`Error getting token for key_${keyIndex}:`, error.message);
		return null;
	}
}

function handleTwitterError(error, actionDescription, keyId) {
	console.error(`Error ${actionDescription}:`, error.message);

	if (error.response && error.response.status === 429) {
		if (keyId && keyStates[keyId]) {
			const headers = error.response.headers;
			const resetHeader = headers['x-rate-limit-reset'];

			if (resetHeader) {
				const resetTime = parseInt(resetHeader) * 1000;
				keyStates[keyId].resetTime = resetTime + 2 * 60 * 1000; // Add 2 min buffer
				keyStates[keyId].remaining = 0;
				keyStates[keyId].isRateLimited = true;

				const waitTime = resetTime - Date.now();
				console.log(
					`Twitter API key ${keyId} rate limited. Available again after ${new Date(
						resetTime + 2 * 60 * 1000
					).toLocaleTimeString()} (${Math.ceil(
						(waitTime + 2 * 60 * 1000) / 1000 / 60
					)} minutes)`
				);
			} else {
				keyStates[keyId].resetTime = Date.now() + 30 * 60 * 1000; // 30 minutes default
				keyStates[keyId].remaining = 0;
				keyStates[keyId].isRateLimited = true;

				console.log(
					`Twitter API key ${keyId} rate limited without reset header. Available again in 30 minutes`
				);
			}
		}
		return;
	}

	if (error.response) {
		console.error('Response status:', error.response.status);
		console.error('Response data:', error.response.data);
		console.error('Response headers:', error.response.headers);
	}
}

function updateRateLimits(keyId, headers) {
	if (!keyStates[keyId]) {
		console.log(`Unknown key: ${keyId}`);
		return;
	}

	const limitHeader = headers['x-rate-limit-limit'];
	const remainingHeader = headers['x-rate-limit-remaining'];
	const resetHeader = headers['x-rate-limit-reset'];

	if (resetHeader && remainingHeader) {
		keyStates[keyId].resetTime = parseInt(resetHeader) * 1000;
		keyStates[keyId].remaining = parseInt(remainingHeader);

		// Mark as rate limited if we're at or near the limit
		if (keyStates[keyId].remaining <= 1) {
			keyStates[keyId].isRateLimited = true;
			console.log(
				`Key ${keyId} marked as rate limited (${keyStates[keyId].remaining} remaining)`
			);
		}

		console.log(
			`Rate limits for ${keyId}: ${
				keyStates[keyId].remaining
			}/${limitHeader} remaining, resets at ${new Date(
				keyStates[keyId].resetTime
			).toLocaleTimeString()}`
		);
	}
}

async function attemptTwitterRequest(twitterDetails, userInfo, setting) {
	const keyCount = Array.isArray(twitterDetails.apiKey)
		? twitterDetails.apiKey.length
		: 1;

	for (let attempt = 0; attempt < keyCount; attempt++) {
		const keyIndex = getAvailableKeyIndex(twitterDetails);

		if (keyIndex === -1) {
			console.log('No available Twitter API keys');
			return null;
		}

		console.log(
			`Attempting Twitter request with key_${keyIndex} (attempt ${
				attempt + 1
			}/${keyCount})`
		);

		const tokenData = await getTwitterTokenForKey(twitterDetails, keyIndex);
		if (!tokenData) {
			console.log(
				`Failed to get token for key_${keyIndex}, marking as rate limited`
			);
			keyStates[`key_${keyIndex}`].isRateLimited = true;
			keyStates[`key_${keyIndex}`].resetTime = Date.now() + 30 * 60 * 1000;
			continue;
		}

		try {
			const searchQuery = `from:${twitterDetails.username} -is:reply -is:retweet`;
			const tweetsResponse = await axios.get(
				`https://api.twitter.com/2/tweets/search/recent`,
				{
					params: {
						query: searchQuery,
						max_results: 10,
						'tweet.fields': 'created_at,public_metrics',
						expansions: 'attachments.media_keys',
						'media.fields': 'url,preview_image_url',
					},
					headers: {
						Authorization: `Bearer ${tokenData.token}`,
					},
				}
			);

			updateRateLimits(tokenData.keyId, tweetsResponse.headers);

			console.log(`Successfully retrieved tweets using ${tokenData.keyId}`);
			return { tweetsResponse, tokenData };
		} catch (error) {
			handleTwitterError(error, 'checking Twitter status', tokenData?.keyId);

			if (error.response && error.response.status === 429) {
				console.log(
					`Key ${tokenData.keyId} hit rate limit, trying next key...`
				);
				continue; // Try next key immediately
			} else {
				// For non-rate-limit errors, stop trying
				console.error('Non-rate-limit error occurred, stopping attempts');
				return null;
			}
		}
	}

	console.log('All available keys have been tried and are rate limited');
	return null;
}

async function checkTwitter(client, setting) {
	if (
		(!Array.isArray(setting.twitterDetails.apiKey) &&
			setting.twitterDetails.apiKey.length == 0) ||
		(Array.isArray(setting.twitterDetails.apiKey) &&
			setting.twitterDetails.apiKey.length == 0) ||
		(!Array.isArray(setting.twitterDetails.apiSecret) &&
			setting.twitterDetails.apiSecret.length == 0) ||
		(Array.isArray(setting.twitterDetails.apiSecret) &&
			setting.twitterDetails.apiSecret.length == 0) ||
		!setting.twitterDetails?.username ||
		!setting.twitterDetails?.displayName ||
		!setting.twitterDetails?.profileImageUrl
	)
		return;

	initializeKeyStates(setting.twitterDetails);

	if (areAllKeysRateLimited(setting.twitterDetails)) {
		const earliestReset = getEarliestResetTime(setting.twitterDetails);
		console.log(
			`All Twitter API keys rate limited. Next available at ${new Date(
				earliestReset
			).toLocaleTimeString()}`
		);
		return;
	}

	const userInfo = {
		name: setting.twitterDetails.displayName || setting.twitterDetails.username,
		username: setting.twitterDetails.username,
		profile_image_url: setting.twitterDetails.profileImageUrl || null,
	};

	const result = await attemptTwitterRequest(
		setting.twitterDetails,
		userInfo,
		setting
	);

	if (!result) {
		console.log('Failed to get tweets from any available key');
		return;
	}

	const { tweetsResponse } = result;

	if (!tweetsResponse.data.data || tweetsResponse.data.data.length === 0) {
		return;
	}

	const recentTweets = tweetsResponse.data.data.slice(0, 5);
	const postedTweetIds = await getPostedTweetIds(
		client,
		20,
		setting.notifications.twitter.channel
	);

	for (const tweet of recentTweets) {
		if (postedTweetIds.includes(tweet.id)) {
			continue;
		}

		let mediaUrl = null;
		if (
			tweet.attachments &&
			tweet.attachments.media_keys &&
			tweetsResponse.data.includes &&
			tweetsResponse.data.includes.media
		) {
			const media = tweetsResponse.data.includes.media.find(
				(m) => m.media_key === tweet.attachments.media_keys[0]
			);
			if (media) {
				mediaUrl = media.url || media.preview_image_url;
			}
		}

		await sendTweetEmbed(
			tweet,
			userInfo,
			mediaUrl,
			client,
			setting.notifications.twitter
		);
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

async function getPostedTweetIds(client, messageCount, channelId) {
	const channel = client.channels.cache.get(channelId);
	if (!channel) {
		console.error('Discord channel not found');
		return [];
	}

	try {
		const messages = await channel.messages.fetch({ limit: messageCount });
		if (messages.size === 0) return [];

		const postedTweetIds = [];
		for (const message of messages.values()) {
			if (message.author.id === client.user.id && message.embeds.length > 0) {
				const embed = message.embeds[0];

				if (embed.url) {
					const match = embed.url.match(/\/status\/(\d+)/);
					if (match && match[1]) {
						postedTweetIds.push(match[1]);
					}
				}

				if (message.components && message.components.length > 0) {
					for (const row of message.components) {
						for (const component of row.components) {
							if (
								component.type === 2 &&
								component.style === 5 &&
								component.url
							) {
								const match = component.url.match(/\/status\/(\d+)/);
								if (match && match[1]) {
									postedTweetIds.push(match[1]);
								}
							}
						}
					}
				}
			}
		}

		return postedTweetIds;
	} catch (error) {
		console.error('Error checking posted tweets:', error);
		return [];
	}
}

function sendTweetEmbed(tweet, userInfo, mediaUrl, client, settings) {
	const channel = client.channels.cache.get(settings.channel);
	if (!channel) return console.error('Discord channel not found');

	try {
		const tweetUrl = `https://twitter.com/${userInfo.username}/status/${tweet.id}`;

		const embed = new EmbedBuilder()
			.setColor('#1DA1F2')
			.setURL(tweetUrl)
			.setTitle('New Tweet has been posted!')
			.setDescription(`${tweet.text}`)
			.setTimestamp()
			.setFooter({ text: 'Twitter Post Notification' });
		if (userInfo) {
			embed.setAuthor({
				name: `${userInfo.name} (@${userInfo.username})`,
				iconURL: userInfo.profile_image_url,
				url: `https://twitter.com/${userInfo.username}`,
			});
		}
		if (mediaUrl) {
			embed.setImage(mediaUrl);
		}

		const actionRow = new ActionRowBuilder();
		actionRow.addComponents(
			new ButtonBuilder()
				.setLabel(`View Tweet`)
				.setURL(tweetUrl)
				.setStyle(ButtonStyle.Link)
		);

		if (settings.ping == 'everyone') {
			channel.send({
				content: '@everyone',
				components: [actionRow],
				embeds: [embed],
			});
		} else if (settings.ping == 'here') {
			channel.send({
				content: '@here',
				components: [actionRow],
				embeds: [embed],
			});
		} else if (settings.ping) {
			channel.send({
				content: `<@&${settings.ping}>`,
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
		console.error('Error sending Twitter notification:', error);
		return null;
	}
}

module.exports = {
	checkTwitter,
};
