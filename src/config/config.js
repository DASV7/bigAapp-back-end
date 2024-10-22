const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    api: {
        prefix: '/api/v1/'
    },    
    mongo: {
        MONGO_USERNAME: "dasvv",
        MONGO_PASS: "dasv",
        MONGO_DB: process.env.MongoDb || "bigApp-rc",
    },
    tokenSecret: process.env.TOKEN_SECRET || "secret-key-vinc",
    cors: process.env.CORS || '*',        
}