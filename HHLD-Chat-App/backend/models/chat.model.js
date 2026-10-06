import mongoose from "mongoose";

const msgSchema = mongoose.Schema({
    text: {
        type: String
    },
    ciphertext: {
        type: String
    },
    iv: {
        type: String
    },
    senderKey: {
        type: String
    },
    receiverKey: {
        type: String
    },
    sender: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    }
})

const conversationSchema = mongoose.Schema({
    users: [
        {
            type: String,
            required: true
        }
    ],
    msgs: [msgSchema]
})

const conversation = mongoose.model('Conversation', conversationSchema);
export default conversation;