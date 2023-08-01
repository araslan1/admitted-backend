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
    whichReviewerMatched: {
        type: String, 
        unique: false,
        default: "not matched", 
    },
    userHasSubmitted: {
        type: Boolean,
        default: false,
        unique: false,
    },
    submittedData: {
        type: Date, 
        unique: false,
    },
    essayMatched: {
        type: Boolean,
        default: false, 
        unique: false,
    },
    essaysReviewed: {
        type: Boolean,
        default: false,
        unique: false,
    },
    dueBy: {
        type: Date, 
        unique: false,
    },
})

module.exports = model.Document || model("Document", Document);