const mongoose = require("mongoose")
require("dotenv").config({path: "../.env"})
mongoose.connect(process.env.DBurl)

const userCredentialsSchema = new mongoose.Schema({
    email: String,
    password: String
})

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    deadline: String,
    image: String,
    status: String
})

const userDataSchema = new mongoose.Schema({
    email: String,
    pfp: String,
    password: String,
    username: String,
    tasks: [taskSchema],
    taskifyPoints: Number
})

const userListSchema = new mongoose.Schema({
    email: String,
    username: String,
    taskifyPoints: Number
})

const UserData = mongoose.model("UserData", userDataSchema)
const UserCredentials = mongoose.model("UserCredentials", userCredentialsSchema)
const UserList = mongoose.model("UserList",userListSchema )

module.exports = {UserData,  UserCredentials, UserList}