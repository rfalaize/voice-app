const mongoose = require("mongoose");
const collectionName = "health-checks";
// note: ** Mongoose automatically looks for the plural, lowercased version of the collection name. **
module.exports = mongoose.model(collectionName, new mongoose.Schema());
