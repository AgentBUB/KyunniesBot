const {
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
} = require('discord.js');
const axios = require('axios');

let accessToken = '';
let isLive = false;
let lastStreamState = {};

async function getTwitchToken(twitchDetails) {
	try {
		const response = await axios.post(
			`https://id.twitch.tv/oauth2/token?client_id=${twitchDetails.clientId}&client_secret=${twitchDetails.clientSecret}&grant_type=client_credentials`
		);
		accessToken = response.data.access_token;
		console.log('Twitch token obtained successfully');
	} catch (error) {
		console.error('Error getting Twitch token:', error);
	}
}

async function checkStream(client, setting) {
	if (
		!setting.twitchDetails?.clientId ||
		!setting.twitchDetails?.clientSecret ||
		!setting.twitchDetails?.channelUsername
	)
		return;
	if (!accessToken) await getTwitchToken(setting.twitchDetails);

	const usernames = Array.isArray(setting.twitchDetails.channelUsername)
		? setting.twitchDetails.channelUsername
		: [setting.twitchDetails.channelUsername];

	for (const channelUsername of usernames) {
		await checkSingleStream(client, setting, channelUsername);
	}
}

async function checkSingleStream(client, setting, channelUsername) {
	try {
		const response = await axios.get(
			`https://api.twitch.tv/helix/streams?user_login=${channelUsername}`,
			{
				headers: {
					'Client-ID': setting.twitchDetails.clientId,
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		const streamData = response.data.data[0];
		const isCurrentlyLive = streamData ? true : false;

		if (isCurrentlyLive) {
			isLive = true;
		}

		const stateKey = `${setting.id}_${channelUsername}`;
		let wasLive = lastStreamState[stateKey]?.isLive || false;

		if (isCurrentlyLive) {
			lastStreamState[stateKey] = {
				isLive: true,
				streamId: streamData.id,
				startedAt: streamData.started_at,
				channelUsername: channelUsername,
			};

			const shouldSendNotification = await checkLastNotification(
				client,
				setting.notifications.twitch.channel,
				channelUsername
			);

			if (shouldSendNotification.status) {
				const userResponse = await axios.get(
					`https://api.twitch.tv/helix/users?login=${channelUsername}`,
					{
						headers: {
							'Client-ID': setting.twitchDetails.clientId,
							Authorization: `Bearer ${accessToken}`,
						},
					}
				);

				const userData = userResponse.data.data[0];
				sendLiveEmbed(
					streamData,
					userData,
					client,
					setting.notifications.twitch,
					channelUsername
				);
			} else if (shouldSendNotification.msg.embeds.length == 1) {
				updateLiveEmbed(
					shouldSendNotification.msg,
					streamData,
					channelUsername
				);
			}
		} else if (wasLive && !isCurrentlyLive) {
			await handleStreamEnd(client, setting, channelUsername);
			lastStreamState[stateKey] = {
				isLive: false,
				streamId: null,
				startedAt: null,
				channelUsername: channelUsername,
			};
		} else {
			lastStreamState[stateKey] = {
				isLive: false,
				streamId: null,
				startedAt: null,
				channelUsername: channelUsername,
			};
		}
	} catch (error) {
		console.error(
			`Error checking stream status for ${channelUsername}:`,
			error
		);
		if (error.response && error.response.status === 401) {
			accessToken = '';
			await getTwitchToken(setting.twitchDetails);
		}
	}
}

async function checkLastNotification(client, channelId, channelUsername) {
	const channel = client.channels.cache.get(channelId);
	if (!channel) {
		console.error('Discord channel not found');
		return { status: true };
	}

	try {
		const messages = await channel.messages.fetch({ limit: 10 });
		if (messages.size === 0) return { status: true };

		for (const message of messages.values()) {
			if (
				message.author.id === client.user.id &&
				message.embeds.length > 0 &&
				message.embeds[0].url &&
				message.embeds[0].url.includes(channelUsername)
			) {
				const hoursAgo = Date.now() - 12 * 60 * 60 * 1000;
				return {
					status: message.createdTimestamp < hoursAgo,
					msg: message,
				};
			}
		}

		return { status: true };
	} catch (error) {
		console.error('Error checking last notification:', error);
		return { status: true };
	}
}

function sendLiveEmbed(
	streamData,
	userData,
	client,
	settings,
	channelUsername
) {
	const channel = client.channels.cache.get(settings.channel);
	if (!channel) return console.error('Discord channel not found');

	try {
		let thumbnail = `${streamData?.thumbnail_url
			.replace('{width}', '1280')
			.replace('{height}', '720')}?t=${Date.now()}`;
		if (!streamData?.thumbnail_url) thumbnail = userData.offline_image_url;

		const embed = new EmbedBuilder()
			.setColor('#6441A4')
			.setAuthor({
				name: userData.display_name,
				iconURL: userData.profile_image_url,
			})
			.setURL(`https://twitch.tv/${channelUsername}`)
			.setTitle(
				streamData?.title || 'Live Streaming - Testing Message or Error'
			)
			.addFields(
				{
					name: 'Playing',
					value: streamData?.game_name || 'Just Chatting',
					inline: true,
				},
				{
					name: 'Viewers',
					value: streamData?.viewer_count.toString() || '0',
					inline: true,
				},
				{
					name: 'Started At',
					value: `<t:${Math.floor(
						new Date(streamData?.started_at || new Date()).getTime() / 1000
					)}:t> (<t:${Math.floor(
						new Date(streamData?.started_at || new Date()).getTime() / 1000
					)}:R>)`,
					inline: false,
				}
			)
			.setImage(thumbnail)
			.setThumbnail(userData.profile_image_url)
			.setTimestamp()
			.setFooter({ text: 'Twitch Stream Notification' });

		const actionRow = new ActionRowBuilder();
		actionRow.addComponents(
			new ButtonBuilder()
				.setLabel(`View Stream`)
				.setURL(`https://twitch.tv/${channelUsername}`)
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
		console.error('Error sending notification:', error);
		return false;
	}
}

function updateLiveEmbed(message, streamData, channelUsername) {
	const embedData = message.embeds[0];

	try {
		let thumbnail = `${streamData?.thumbnail_url
			.replace('{width}', '1280')
			.replace('{height}', '720')}?t=${Date.now()}`;
		if (!streamData?.thumbnail_url) thumbnail = embedData.image.url;

		const embed = new EmbedBuilder()
			.setColor('#6441A4')
			.setAuthor({
				name: embedData.author.name,
				iconURL: embedData.author.icon_url,
			})
			.setURL(embedData.url)
			.setTitle(streamData?.title || embedData.title)
			.addFields(
				{
					name: 'Playing',
					value: streamData?.game_name || embedData.fields[0].value,
					inline: true,
				},
				{
					name: 'Viewers',
					value:
						streamData?.viewer_count.toString() || embedData.fields[1].value,
					inline: true,
				},
				{
					name: 'Started At',
					value: `<t:${Math.floor(
						new Date(
							streamData?.started_at || new Date(message.createdTimestamp)
						).getTime() / 1000
					)}:t> (<t:${Math.floor(
						new Date(
							streamData?.started_at || new Date(message.createdTimestamp)
						).getTime() / 1000
					)}:R>)`,
					inline: false,
				}
			)
			.setImage(thumbnail)
			.setThumbnail(embedData.thumbnail.url)
			.setTimestamp()
			.setFooter({ text: 'Twitch Stream Notification (Updated)' });

		const actionRow = new ActionRowBuilder();
		actionRow.addComponents(
			new ButtonBuilder()
				.setLabel(`View Stream`)
				.setURL(`https://twitch.tv/${channelUsername}`)
				.setStyle(ButtonStyle.Link)
		);

		message.edit({
			components: [actionRow],
			embeds: [embed],
		});
	} catch (error) {
		console.error('Error updating notification:', error);
		return false;
	}
}

async function handleStreamEnd(client, setting, channelUsername) {
	try {
		const userResponse = await axios.get(
			`https://api.twitch.tv/helix/users?login=${channelUsername}`,
			{
				headers: {
					'Client-ID': setting.twitchDetails.clientId,
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		const userId = userResponse.data.data[0].id;
		const stateKey = `${setting.id}_${channelUsername}`;
		const streamStartTime = lastStreamState[stateKey]?.startedAt;
		if (!streamStartTime) return;

		const vodResponse = await axios.get(`https://api.twitch.tv/helix/videos`, {
			params: {
				user_id: userId,
				type: 'archive',
				first: 5,
			},
			headers: {
				'Client-ID': setting.twitchDetails.clientId,
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!vodResponse.data.data || vodResponse.data.data.length === 0) return;

		const streamStart = new Date(streamStartTime);
		let matchingVod = null;

		for (const vod of vodResponse.data.data) {
			const vodStart = new Date(vod.created_at);
			const timeDiff = Math.abs(vodStart.getTime() - streamStart.getTime());

			if (timeDiff < 8 * 60 * 1000) {
				matchingVod = vod;
				break;
			}
		}

		if (matchingVod) {
			await updateEmbedWithVOD(client, setting, matchingVod, channelUsername);
		} else {
			await updateEmbedWithNoVOD(client, setting, channelUsername);
		}
	} catch (error) {
		console.error('Error handling stream end:', error);
	}
}

async function updateEmbedWithVOD(client, setting, vod, channelUsername) {
	try {
		const channel = client.channels.cache.get(
			setting.notifications.twitch.channel
		);
		if (!channel) return;

		const messages = await channel.messages.fetch({ limit: 10 });
		let lastNotification = null;

		// Find the specific notification for this channel
		for (const message of messages.values()) {
			if (
				message.author.id === client.user.id &&
				message.embeds.length > 0 &&
				message.embeds[0].url &&
				message.embeds[0].url.includes(channelUsername)
			) {
				lastNotification = message;
				break;
			}
		}

		if (!lastNotification) return;

		const originalEmbed = lastNotification.embeds[0];

		const updatedEmbed = new EmbedBuilder()
			.setColor('#6441A4')
			.setAuthor(originalEmbed.author)
			.setTitle(originalEmbed.title)
			.setURL(vod.url)
			.setDescription(originalEmbed.description)
			.setThumbnail(originalEmbed.thumbnail?.url)
			.setTimestamp()
			.setFooter({ text: 'Stream Ended - VOD Available' });

		if (originalEmbed.fields) {
			const fields = [];
			for (const field of originalEmbed.fields) {
				if (field.name !== 'Started At' && field.name !== 'Playing') {
					fields.push(field);
				} else if (field.name === 'Playing') {
					fields.push({
						name: 'Playing Last',
						value: field.value,
						inline: true,
					});
				}
			}

			fields.push({
				name: 'Stream Duration',
				value: vod.duration,
				inline: true,
			});

			fields.push({
				name: 'Stream Ended',
				value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
				inline: true,
			});

			updatedEmbed.addFields(fields);
		}

		const actionRow = new ActionRowBuilder();
		actionRow.addComponents(
			new ButtonBuilder()
				.setLabel(`Watch VOD`)
				.setURL(vod.url)
				.setStyle(ButtonStyle.Link)
		);

		await lastNotification.edit({
			components: [actionRow],
			embeds: [updatedEmbed],
		});
	} catch (error) {
		console.error('Error updating embed with VOD:', error);
	}
}

async function updateEmbedWithNoVOD(client, setting, channelUsername) {
	try {
		const channel = client.channels.cache.get(
			setting.notifications.twitch.channel
		);
		if (!channel) return;

		const messages = await channel.messages.fetch({ limit: 10 });
		let lastNotification = null;

		for (const message of messages.values()) {
			if (
				message.author.id === client.user.id &&
				message.embeds.length > 0 &&
				message.embeds[0].url &&
				message.embeds[0].url.includes(channelUsername)
			) {
				lastNotification = message;
				break;
			}
		}

		if (!lastNotification) return;

		const originalEmbed = lastNotification.embeds[0];

		const updatedEmbed = new EmbedBuilder()
			.setColor('#6441A4')
			.setAuthor(originalEmbed.author)
			.setTitle(originalEmbed.title)
			.setURL(originalEmbed.url)
			.setDescription(originalEmbed.description)
			.setThumbnail(originalEmbed.thumbnail?.url)
			.setTimestamp()
			.setFooter({ text: 'Stream Ended' });

		if (originalEmbed.fields) {
			const fields = [];
			for (const field of originalEmbed.fields) {
				if (field.name !== 'Started At' && field.name !== 'Playing') {
					fields.push(field);
				} else if (field.name === 'Playing') {
					fields.push({
						name: 'Playing Last',
						value: field.value,
						inline: true,
					});
				}
			}

			fields.push({
				name: 'Stream Ended',
				value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
				inline: true,
			});

			updatedEmbed.addFields(fields);
		}

		await lastNotification.edit({
			components: [],
			embeds: [updatedEmbed],
		});
	} catch (error) {
		console.error('Error updating embed with no VOD:', error);
	}
}

function getIsLive() {
	const now = Date.now();
	for (const stateKey in lastStreamState) {
		const state = lastStreamState[stateKey];
		if (state.isLive) {
			return true;
		}
	}

	isLive = false;
	return false;
}

module.exports = {
	checkStream,
	getIsLive,
};
