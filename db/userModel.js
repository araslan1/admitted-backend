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
        validate: {
            validator: function (value) {
                // Validate the password field only if isGoogleAuth is false
                return !this.isGoogleAuth || (this.isGoogleAuth && value);
            },
            message: "Please provide a password"
        }
    },
    dashboardId: {
        type: String,
        required: false,
        unique: true
    },
    documentIds: {
        type: Array,
        required: false,
        unique: false, 
    },
    servicesRequested: {
        type: Array,
        required: false, 
        unique: false, 
    },
    isReviewer: {
        type: Boolean, 
        required: false, 
        default: false, 
    },
    isGoogleAuth: {
        type: Boolean,
        required: true, 
        default: false, 
    }
}); 

// create a user table or collection if there no table with that name already
module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema); 
