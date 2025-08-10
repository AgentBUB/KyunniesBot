require('dotenv').config();
const {
	Client,
	REST,
	Collection,
	Routes,
	GatewayIntentBits,
	Partials,
} = require('discord.js');
const { owners } = require('../config');
const { readdirSync } = require('fs');
const { MongoClient } = require('mongodb');
const database = new MongoClient(process.env.MONGO_URL);
try {
	database.connect();
	console.log(`System has connected to the database.`);
} catch (error) {
	console.log('There was an error while connecting to the database.');
	process.exit();
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.MessageContent,
	],
	shards: 'auto',
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Reaction,
		Partials.GuildScheduledEvent,
		Partials.User,
		Partials.ThreadMember,
	],
	allowedMentions: { parse: ['everyone', 'users', 'roles'], repliedUser: true },
});
const path = require('path');
const Util = require('./Structures/Util');
const config = require('../config.json');
client.utils = new Util();
client.owners = owners;
client.client = client;
client.config = config;
client.db = database.db();

client.commands = new Collection();
client.menus = new Collection();
client.cooldowns = new Collection();

const rest = new REST().setToken(process.env.TOKEN);
const commandsArray = [];

const loadCmd = (dirs) => {
	const commands = readdirSync(
		`${client.utils.directory}Commands/${dirs}/`
	).filter((djs) => djs.endsWith('.js'));
	for (const commandFile of commands) {
		delete require.cache[commandFile];
		const command = require(`${client.utils.directory}Commands/${dirs}/${commandFile}`);
		commandsArray.push(command.data.toJSON());
		client.commands.set(command.data.name, command);
	}
};
const cmdDir = `${client.utils.directory}Commands/`;
const paths = readdirSync(path.join(cmdDir));
paths.forEach((dirs) => loadCmd(dirs));

const loadMenus = () => {
	const commands = readdirSync(`${client.utils.directory}Menus/`).filter(
		(djs) => djs.endsWith('.js')
	);
	for (const commandFile of commands) {
		delete require.cache[commandFile];
		const command = require(`${client.utils.directory}Menus/${commandFile}`);
		commandsArray.push(command.data.toJSON());
		client.menus.set(command.data.name, command);
	}
};
loadMenus();

client.on('ready', async () => {
	try {
		await rest.put(Routes.applicationCommands(client.user.id), {
			body: await commandsArray,
		});
	} catch (error) {
		console.error(error);
	}
});

client.events = new Collection();
const loadEvents = (dirs) => {
	const events = readdirSync(`${client.utils.directory}Events/${dirs}/`).filter(
		(djs) => djs.endsWith('.js')
	);
	for (const eventFile of events) {
		delete require.cache[eventFile];
		const event = require(`${client.utils.directory}Events/${dirs}/${eventFile}`);
		client.events.set(event.name, event);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client));
		} else {
			client.on(event.name, (...args) => event.execute(...args, client));
		}
	}
};
const eventsDir = `${client.utils.directory}Events/`;
const pathsEvents = readdirSync(path.join(eventsDir));
pathsEvents.forEach((dirs) => loadEvents(dirs));

client.login(process.env.TOKEN);
