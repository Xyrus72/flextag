const mongoose = require('mongoose')

/**
 * One-time signup codes. Stored in Mongo (not memory) so a server restart or a
 * second instance can't orphan in-flight signups. Mongo's TTL monitor deletes
 * documents once `expiresAt` passes.
 */
const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  code:      { type: String, required: true },
  attempts:  { type: Number, default: 0 },           // wrong guesses; the code is voided after MAX_ATTEMPTS
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true })

module.exports = mongoose.model('Otp', otpSchema)
