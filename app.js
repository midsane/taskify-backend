const express = require("express")
const app = express()
const z = require("zod")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const {UserCredentials, UserData, UserList} = require("./db/db")
const authMiddlware = require("./middlware/middleware")
const PORT = process.env.PORT
const cors = require("cors")
const Secret = process.env.SECRET
const mongoose = require("mongoose")

app.use(cors({
    origin: '*', // Allow requests from this origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true // Allow cookies to be sent with requests
  }));
  

app.use(express.json())
const emailSchema = z.string().email()
const passwordSchema = z.string().min(6).max(19)

app.get("/top-users", async(req, res)=> {
    try{
        const userlist = await UserList.find({})
        res.status(200).json({userlist})
    }
    catch(error){
        console.error(error)
        res.status(500).json({message:"could not fetch userlist"})
    }
   
})


app.post("/signup", async(req, res)=> {
    const email = req.body.email
    const password = req.body.password
    if(!email && !password){
        return res.status(400).json({message: "password and email are required"})
    }
    const emailValid = emailSchema.safeParse(email)
    const passwordValid = passwordSchema.safeParse(password)

    if(!emailValid.success) return res.status(400).json({message: "invalid email"})
    if(!passwordValid.success) return res.status(400).json({message: "invalid password"})
        
    try{
        const existingUser = await UserCredentials.findOne({email})
        if(existingUser){
            return res.status(400).json({message: "user already exist"})
        }
        
        const newUser = new UserCredentials({email, password})
        await newUser.save()
      
        firstUserName = email
        const newUserData = new UserData({email, password,
            username: (email.length >= 15? email.substring(0,15) : email),
            pfp: "",
            tasks: [],
            taskifyPoints: 0,
         })

        await newUserData.save()

        const newUserInList = new UserList({username: email, taskifyPoints: 0, email})
        await newUserInList.save()

        res.status(200).json({message: "user created succesfully"})

    }
    catch(error){
        console.error("error creating user" +error)
        res.status(500).json({message: "internal server error"})
    }
    

})

app.post("/login", async(req, res)=> {
    const email = req.body.email
    const emailValid = emailSchema.safeParse(email)
    if(!emailValid.success){
        return res.status(400).json({message: "invalid email"})
    }
    const password = req.body.password
    const user = await UserCredentials.findOne({email})
    if(!user){
        return res.status(400).json({message: "user not found"})
    }
    if(user.password != password){
        return res.status(400).json({message: "wrong password"})
    }
    const token = jwt.sign({email}, Secret)
    
    
  
    return res.status(200).json({message: "user logged in successfully", token})

})




app.get("/topusers", async(req, res)=> {
    try{
        const userList = await UserList.find({})
        return res.status(200).json({message: "successfully fetched user list", userList})
    }
    catch(error){
        console.error(error)
        res.status(500).json({message: "internal server error"})
    }
    
})


app.use(authMiddlware)

app.get("/profile", async(req,res)=> {
     
    try{
        const userData = await UserData.findOne({email: req.email})
        return res.status(200).json({message:"successfully fetched user data", userData})
    }
    catch(error){
        res.status(500).json({message: "internal server error"})
    }
    
})

app.post("/profile/pfp", async(req, res)=> {
   
    const pfp = req.body.pfp
    
    try{
        await UserData.updateOne({
            email: req.email
        }, {
           $set: {
            pfp
           }
        })
        
        return res.status(200).json({message: "pfp image added to db"})
    }
    catch(error){
        console.error(error)
        res.send(500).json({message: "could not add pfp image to db"})
    }
    

})

app.post("/profile/username", async(req, res)=> {
 
    const username = req.body.username
    
   
    try{
        const user = await UserData.updateOne({
            email: req.email
        }, {
            $set: {
                username
            }
        })
        
        return res.status(200).json({message: "username updated"})
    }
    catch(error){
        console.error(error)
        res.send(500).json({message: "could not update username"})
    }
    

})

app.post("/profile/tasks", async(req, res)=> {
    
    const title = req.body.title
    const deadline = req.body.deadline
    const description = req.body.description
    const status = req.body.status
    const image = req.body.image
    const taskdata = {
        title,
        description,
        deadline,
        image,
        status
    }   
  
    try{
        await UserData.updateOne({
            email: req.email
        }, {
            $push: {
                tasks: taskdata
            }
        })
    
        return res.status(200).json({message: "new task added to db"})
    }
    catch(error){
        console.error(error)
        res.send(500).json({message: "could not add task to db"})
    }
    

})

app.delete("/profile/tasks", async(req,res)=> {
    const taskId = req.body.taskId
   
    if(!taskId) return res.status(500).json({message: "taskId not received"})
    
    try {
        const deletedTask =  await UserData.updateOne(
            {email: req.email},
            {$pull: {"tasks": {"_id": new mongoose.Types.ObjectId(taskId)}}}
        )
        if(deletedTask.modifiedCount === 0){
            return res.status(500).json({message: "task could not be found"})
        }
        return res.status(200).json({message: "succesfully deleted the task"})
    }
    catch(error){
        console.error(error)
        res.status(500).json({message: "internal server error"})
    }
 
})


app.post("/profile/tasks/status/update", async (req, res) => {
    const status = req.body.status;
    const taskId = req.body.taskId;
    
  
    try{
        await UserData.findOneAndUpdate({email: req.email},
        
            { $inc: {taskifyPoints: (status === "completed")? 5 : 0}                              ,
                $set: { "tasks.$[task].status": status }},
            {arrayFilters: [{"task._id": new mongoose.Types.ObjectId(taskId)}]}
    
        )
        
    }
    catch(error){
        console.error(error)
        return res.send(500).json({message: "could not change the status of the task"})
    }

    try{
        await UserList.updateOne(
            {email: req.email},
            {$inc: {
                taskifyPoints: (status === "completed")?5:0
            } }
           
        )
        return res.status(200).json({message: "updated userlist and changed the status of the task"})
    }
    catch(error){
        console.error(error)
        res.status(500).json({message: "changed the status of the task but could not update userlist"})
    }
  });

  

 app.post("/profile/tasks/update", async(req, res)=> {
    console.log(req.body)
    const title = req.body.title
    const deadline = req.body.deadline
    const description = req.body.description
    const status = req.body.status
    const image = req.body.image
    const taskId = req.body.taskId
    const taskdata = {
        title,
        description,
        deadline,
        image,
        status
    }   

    try{
       await UserData.updateOne(
        {email: req.email, "tasks._id":taskId},
        {$set: {
            "tasks.$": taskdata
        }}
       )
       return res.status(200).json({message: "updated the task body"})
    }
    catch(error){
        console.error(error)
        return res.status(500).json({message: "could not update the task body"})
    }
  
 })


app.listen(PORT, ()=> {
    console.log(`The server is running on port ${PORT}`)
})




