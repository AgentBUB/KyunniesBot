const {
	SlashCommandBuilder,
	MessageFlags,
	InteractionContextType,
} = require('discord.js');
const translate = require('@iamtraction/google-translate');
const { defaultLang } = require('../../../config.json');
const languages = {
	Afrikaans: 'af',
	Albanian: 'sq',
	Amharic: 'am',
	Arabic: 'ar',
	Armenian: 'hy',
	Assamese: 'as',
	Aymara: 'ay',
	Azerbaijani: 'az',
	Bambara: 'bm',
	Basque: 'eu',
	Belarusian: 'be',
	Bengali: 'bn',
	Bhojpuri: 'bho',
	Bosnian: 'bs',
	Bulgarian: 'bg',
	Catalan: 'ca',
	Cebuano: 'ceb',
	'Chinese (Simplified)': 'zh-CN or zh',
	'Chinese (Traditional)': 'zh-TW',
	Corsican: 'co',
	Croatian: 'hr',
	Czech: 'cs',
	Danish: 'da',
	Dhivehi: 'dv',
	Dogri: 'doi',
	Dutch: 'nl',
	English: 'en',
	Esperanto: 'eo',
	Estonian: 'et',
	Ewe: 'ee',
	'Filipino (Tagalog)': 'fil',
	Finnish: 'fi',
	French: 'fr',
	Frisian: 'fy',
	Galician: 'gl',
	Georgian: 'ka',
	German: 'de',
	Greek: 'el',
	Guarani: 'gn',
	Gujarati: 'gu',
	'Haitian Creole': 'ht',
	Hausa: 'ha',
	Hawaiian: 'haw',
	Hebrew: 'he or iw',
	Hindi: 'hi',
	Hmong: 'hmn',
	Hungarian: 'hu',
	Icelandic: 'is',
	Igbo: 'ig',
	Ilocano: 'ilo',
	Indonesian: 'id',
	Irish: 'ga',
	Italian: 'it',
	Japanese: 'ja',
	Javanese: 'jv or jw',
	Kannada: 'kn',
	Kazakh: 'kk',
	Khmer: 'km',
	Kinyarwanda: 'rw',
	Konkani: 'gom',
	Korean: 'ko',
	Krio: 'kri',
	Kurdish: 'ku',
	'Kurdish (Sorani)': 'ckb',
	Kyrgyz: 'ky',
	Lao: 'lo',
	Latin: 'la',
	Latvian: 'lv',
	Lingala: 'ln',
	Lithuanian: 'lt',
	Luganda: 'lg',
	Luxembourgish: 'lb',
	Macedonian: 'mk',
	Maithili: 'mai',
	Malagasy: 'mg',
	Malay: 'ms',
	Malayalam: 'ml',
	Maltese: 'mt',
	Maori: 'mi',
	Marathi: 'mr',
	'Meiteilon (Manipuri)': 'mni-Mtei',
	Mizo: 'lus',
	Mongolian: 'mn',
	'Myanmar (Burmese)': 'my',
	Nepali: 'ne',
	Norwegian: 'no',
	'Nyanja (Chichewa)': 'ny',
	'Odia (Oriya)': 'or',
	Oromo: 'om',
	Pashto: 'ps',
	Persian: 'fa',
	Polish: 'pl',
	'Portuguese (Portugal, Brazil)': 'pt',
	Punjabi: 'pa',
	Quechua: 'qu',
	Romanian: 'ro',
	Russian: 'ru',
	Samoan: 'sm',
	Sanskrit: 'sa',
	'Scots Gaelic': 'gd',
	Sepedi: 'nso',
	Serbian: 'sr',
	Sesotho: 'st',
	Shona: 'sn',
	Sindhi: 'sd',
	'Sinhala (Sinhalese)': 'si',
	Slovak: 'sk',
	Slovenian: 'sl',
	Somali: 'so',
	Spanish: 'es',
	Sundanese: 'su',
	Swahili: 'sw',
	Swedish: 'sv',
	'Tagalog (Filipino)': 'tl',
	Tajik: 'tg',
	Tamil: 'ta',
	Tatar: 'tt',
	Telugu: 'te',
	Thai: 'th',
	Tigrinya: 'ti',
	Tsonga: 'ts',
	Turkish: 'tr',
	Turkmen: 'tk',
	'Twi (Akan)': 'ak',
	Ukrainian: 'uk',
	Urdu: 'ur',
	Uyghur: 'ug',
	Uzbek: 'uz',
	Vietnamese: 'vi',
	Welsh: 'cy',
	Xhosa: 'xh',
	Yiddish: 'yi',
	Yoruba: 'yo',
	Zulu: 'zu',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('translate')
		.setDescription('Translate the last sent message or message ID.')
		.addStringOption((option) =>
			option
				.setName('fromlanguage')
				.setDescription(
					"The language the text is already in. (Default: Detect | Doesn't work with multi langs.)"
				)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('language')
				.setDescription(
					'The language you want to translate to. (Default: English)'
				)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription(
					'The ID of the message you want to translate. (Default: Last Message)'
				)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(0x0000000000002000)
		.setContexts(InteractionContextType.Guild),
	run: async (client, interaction) => {
		let msg = interaction.options.getString('message');
		let fLang = interaction.options.getString('fromlanguage');
		let lang = interaction.options.getString('language');

		try {
			if (msg) {
				msg = (await interaction.channel.messages.fetch(msg)).content;
			} else {
				msg = (await interaction.channel.messages.fetch({ limit: 1 })).first()
					.content;
			}
			if (!fLang) fLang = 'auto';
			if (!lang) lang = defaultLang;

			const choices = [
				'Afrikaans',
				'Albanian',
				'Amharic',
				'Arabic',
				'Armenian',
				'Assamese',
				'Aymara',
				'Azerbaijani',
				'Bambara',
				'Basque',
				'Belarusian',
				'Bengali',
				'Bhojpuri',
				'Bosnian',
				'Bulgarian',
				'Catalan',
				'Cebuano',
				'Chinese (Simplified)',
				'Chinese (Traditional)',
				'Corsican',
				'Croatian',
				'Czech',
				'Danish',
				'Dhivehi',
				'Dogri',
				'Dutch',
				'English',
				'Esperanto',
				'Estonian',
				'Ewe',
				'Filipino (Tagalog)',
				'Finnish',
				'French',
				'Frisian',
				'Galician',
				'Georgian',
				'German',
				'Greek',
				'Guarani',
				'Gujarati',
				'Haitian Creole',
				'Hausa',
				'Hawaiian',
				'Hebrew',
				'Hindi',
				'Hmong',
				'Hungarian',
				'Icelandic',
				'Igbo',
				'Ilocano',
				'Indonesian',
				'Irish',
				'Italian',
				'Japanese',
				'Javanese',
				'Kannada',
				'Kazakh',
				'Khmer',
				'Kinyarwanda',
				'Konkani',
				'Korean',
				'Krio',
				'Kurdish',
				'Kurdish (Sorani)',
				'Kyrgyz',
				'Lao',
				'Latin',
				'Latvian',
				'Lingala',
				'Lithuanian',
				'Luganda',
				'Luxembourgish',
				'Macedonian',
				'Maithili',
				'Malagasy',
				'Malay',
				'Malayalam',
				'Maltese',
				'Maori',
				'Marathi',
				'Meiteilon (Manipuri)',
				'Mizo',
				'Mongolian',
				'Myanmar (Burmese)',
				'Nepali',
				'Norwegian',
				'Nyanja (Chichewa)',
				'Odia (Oriya)',
				'Oromo',
				'Pashto',
				'Persian',
				'Polish',
				'Portuguese (Portugal, Brazil)',
				'Punjabi',
				'Quechua',
				'Romanian',
				'Russian',
				'Samoan',
				'Sanskrit',
				'Scots Gaelic',
				'Sepedi',
				'Serbian',
				'Sesotho',
				'Shona',
				'Sindhi',
				'Sinhala (Sinhalese)',
				'Slovak',
				'Slovenian',
				'Somali',
				'Spanish',
				'Sundanese',
				'Swahili',
				'Swedish',
				'Tagalog (Filipino)',
				'Tajik',
				'Tamil',
				'Tatar',
				'Telugu',
				'Thai',
				'Tigrinya',
				'Tsonga',
				'Turkish',
				'Turkmen',
				'Twi (Akan)',
				'Ukrainian',
				'Urdu',
				'Uyghur',
				'Uzbek',
				'Vietnamese',
				'Welsh',
				'Xhosa',
				'Yiddish',
				'Yoruba',
				'Zulu',
			];
			if (fLang !== 'auto') {
				if (choices.includes(client.utils.capitalize(fLang))) {
					fLang = languages[client.utils.capitalize(fLang)];
				}
			}
			if (lang !== defaultLang) {
				if (choices.includes(client.utils.capitalize(lang))) {
					lang = languages[client.utils.capitalize(lang)];
				}
			}
			const translated = await translate(msg, { from: fLang, to: lang });

			return interaction.reply({
				content: `**The translated message:**\n> ${translated.text.replace(
					/\n/g,
					'\n> '
				)}`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			console.log(err);
			if (err.rawError.message === 'Unknown Message') {
				await interaction.reply({
					content: `The message couldn't be found. One of the following reasons is why:\n\`\`\`Please re-run the command in the channel that contains the message, double check you have the right message ID, the message doesn't exist, or the bot can not read the message.\`\`\``,
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: `Failed to translate:\`\`\`${err}\`\`\``,
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
