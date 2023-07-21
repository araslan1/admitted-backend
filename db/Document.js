const { Schema, model } = require('mongoose'); 

const Document = new Schema({
    _id: String,
    data: Object,
    name: {
        type: String, 
        required: false, 
        unique: false, 
        default: "Untitled Document",
    },
    comments: {
        type: Array,
        required: false,
        unique: false, 
    },
    reviewerMatched: {
        type: Boolean,
        default: false, 
    },
    reviewerId: {
        type: String,
        required: false, 
        unique: true, 
    },
    userHasSubmitted: {
        type: Boolean,
        default: false,
    },
    essaysReviewed: {
        type: Boolean,
        default: false,
    },
    dueBy: {
        type: String, 
        default: "undecided",
    }
})

module.exports = model.Document || model("Document", Document);