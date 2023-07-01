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
    completed: {
        type: Boolean,
        default: false,
    }
})

module.exports = model.Document || model("Document", Document);