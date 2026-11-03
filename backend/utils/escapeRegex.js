// make user text safe to use inside a RegExp (search box)
module.exports = (text = '') => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')