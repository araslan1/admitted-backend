const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    fullname: {
        type: String, 
        required: [true, "Please provide your full name"], 
        unique: false,
    },

    email: {
        type: String, 
        required: [true, "Please provide your name"],
        unique: [true, "Email Exist"],
    }, 

    password: {
        type: String, 
        required: [true, "Please provide a password"],
        unique: false,
    }, 
}); 

// create a user table or collection if there no table with that name already
module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema); 
