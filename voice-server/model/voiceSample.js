const mongoose = require("mongoose");
const collectionName = "voice-samples";
// note: ** Mongoose automatically looks for the plural, lowercased version of the collection name. **
module.exports = mongoose.model(collectionName, new mongoose.Schema({ ip: String, audio: [[Number]] }));
