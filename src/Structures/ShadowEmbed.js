const { EmbedBuilder } = require('discord.js');

const ZWS = '\u200B';

module.exports = class ShadowEmbed extends EmbedBuilder {
	splitFields(contentOrTitle, rawContent) {
		if (typeof contentOrTitle === 'undefined') return this.data;
		if (this.data.fields === undefined) this.data.fields = [];

		let title;
		let content;
		if (typeof rawContent === 'undefined') {
			title = ZWS;
			content = contentOrTitle;
		} else {
			title = contentOrTitle;
			content = rawContent;
		}

		if (Array.isArray(content)) content = content.join('\n');
		if (title === ZWS && !this.description && content.length < 2048) {
			this.data.description = content;
			return this;
		}

		let x;
		let slice;
		while (content.length) {
			if (content.length < 1024) {
				this.data.fields.push({ name: title, value: content, inline: false });
				return this.data;
			}

			slice = content.slice(0, 1024);
			x = slice.lastIndexOf('\n');
			if (x === -1) x = slice.lastIndexOf('');
			if (x === -1) x = 1024;

			this.data.fields.push({
				name: title,
				value: content.trim().slice(0, x),
				inline: false,
			});
			content = content.slice(x + 1);
			title = ZWS;
		}
		return this.data;
	}
};
