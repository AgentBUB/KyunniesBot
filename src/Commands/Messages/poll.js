const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
	EmbedBuilder,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('poll')
		.setDescription('Make a poll.')
		.addStringOption((option) =>
			option
				.setName('topic')
				.setDescription('The topic or question for the poll.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('option1')
				.setDescription('An option of the poll.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('option2')
				.setDescription('An option of the poll.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('option3')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option4')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option5')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option6')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option7')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option8')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option9')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('option10')
				.setDescription('An option of the poll.')
				.setRequired(false)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		const topic = interaction.options.getString('topic');
		const option1 = interaction.options.getString('option1');
		const option2 = interaction.options.getString('option2');
		const option3 = interaction.options.getString('option3');
		const option4 = interaction.options.getString('option4');
		const option5 = interaction.options.getString('option5');
		const option6 = interaction.options.getString('option6');
		const option7 = interaction.options.getString('option7');
		const option8 = interaction.options.getString('option8');
		const option9 = interaction.options.getString('option9');
		const option10 = interaction.options.getString('option10');

		let options = [];
		if (option3) options.push(`3️⃣: ${option3}`);
		if (option4) options.push(`4️⃣: ${option4}`);
		if (option5) options.push(`5️⃣: ${option5}`);
		if (option6) options.push(`6️⃣: ${option6}`);
		if (option7) options.push(`7️⃣: ${option7}`);
		if (option8) options.push(`8️⃣: ${option8}`);
		if (option9) options.push(`9️⃣: ${option9}`);
		if (option10) options.push(`🔟: ${option10}`);

		const embed = new EmbedBuilder()
			.setTitle(topic)
			.setColor('Random')
			.setDescription(
				`1️⃣: ${option1}
			2️⃣: ${option2}
			${options.join(`\n`)}`
			);

		const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
		await msg.react(`1️⃣`);
		await msg.react(`2️⃣`);
		if (option3) await msg.react(`3️⃣`);
		if (option4) await msg.react(`4️⃣`);
		if (option5) await msg.react(`5️⃣`);
		if (option6) await msg.react(`6️⃣`);
		if (option7) await msg.react(`7️⃣`);
		if (option8) await msg.react(`8️⃣`);
		if (option9) await msg.react(`9️⃣`);
		if (option10) await msg.react(`🔟`);
	},
};
