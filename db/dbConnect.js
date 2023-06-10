const mongoose = require('mongoose'); 
require('dotenv').config();

async function dbConnect(){
    mongoose
        .connect(
            process.env.DB_URL,
           {
            // these are options to ensure connection is done properly
            useNewUrlParser: true,
            useUnifiedTopology: true, 
           }
        )
        .then(() => {
            console.log("Successfully connect to MongoDB Atlas!"); 
        })
        .catch((error) => {
            console.log("Unable to connect to MongoDB Atlas!"); 
            console.error(error); 
        })
}

module.exports = dbConnect; 