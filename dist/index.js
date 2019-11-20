
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./twitch-simple-irc.cjs.production.min.js')
} else {
  module.exports = require('./twitch-simple-irc.cjs.development.js')
}
