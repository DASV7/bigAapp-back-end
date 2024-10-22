const { connect, set } = require('mongoose');
const config = require("../config/config");

function connectDbMongo() {
  try {
    const uri = `mongodb+srv://${config.mongo.MONGO_USERNAME}:${config.mongo.MONGO_PASS}@cluster0.gbdva.mongodb.net/${config.mongo.MONGO_DB}?retryWrites=true&w=majority`;
    set("strictQuery", false);
    connect(uri).then(e => console.log("✅---------Connected to MongoDB Succesfully--------✅"))
  } catch (error) {
    throw error;
  }
}
module.exports = connectDbMongo
