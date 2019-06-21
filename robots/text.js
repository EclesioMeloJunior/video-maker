const algorithmia = require("algorithmia");
const algorithmiaApiKey = require("../credentials/algorithmia.json").apiKey;
const sentenceBoundaryDetection = require("sbd");
const watsonApiKey = require("../credentials/watson-nlu.json").apiKey;

const NaturalLanguageUnderstantingV1 = require("watson-developer-cloud/natural-language-understanding/v1.js");

var nlu = new NaturalLanguageUnderstantingV1({
	iam_apikey: watsonApiKey,
	version: "2018-04-05",
	url: "https://gateway.watsonplatform.net/natural-language-understanding/api/"
});

async function robot(content) {
	await fetchContentFromWikipedia(content);
	sanitizeContent(content);
	breakContentIntoSetences(content);

	async function fetchContentFromWikipedia(content) {
		const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
		const wikipediaAlgorithm = algorithmiaAuthenticated.algo(
			"web/WikipediaParser/0.1.2"
		);
		const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm);
		const wikipediaContent = wikipediaResponse.get();
		content.sourceContentOriginal = wikipediaContent.content;
	}

	function sanitizeContent(content) {
		const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(
			content.sourceContentOriginal
		);
		const withoutDatesInParentheses = removeDatesInParentheses(
			withoutBlankLinesAndMarkdown
		);

		content.sourceContentSanitized = withoutDatesInParentheses;

		function removeBlankLinesAndMarkdown(text) {
			const allLines = text.split("\n");

			const withoutBlankLinesAndMarkdown = allLines.filter(line => {
				if (line.trim().length === 0 || line.trim().startsWith("=")) {
					return false;
				}
				return true;
			});

			return withoutBlankLinesAndMarkdown.join(" ");
		}

		function removeDatesInParentheses(text) {
			return text
				.replace(/\((?:\([^()]*\)|[^()])*\)/gm, "")
				.replace(/  /g, " ");
		}
	}

	function breakContentIntoSetences(content) {
		const sentences = sentenceBoundaryDetection.sentences(
			content.sourceContentSanitized
		);

		content.sentences = [];
		sentences.forEach(sentence => {
			content.sentences.push({
				text: sentence,
				keywords: [],
				images: []
			});
		});

		console.log(content);
	}
}

module.exports = robot;
