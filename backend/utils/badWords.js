
const { Filter } = require('bad-words');

const filter = new Filter();

const maskBadWords = (text) => filter.clean(String(text || ''));

module.exports = maskBadWords;

