const jwt = require("jsonwebtoken")
require("dotenv").config("../.env")
const Secret = process.env.SECRET
    
const authMiddlware = (req,res,next) => {
    const tokenbody = req.headers.authorization
   
    if(!tokenbody) return res.status(400).json({message:'invalid token'})

    const tokenarray = tokenbody.split(" ")
    const token = tokenarray[1]  
    let verify
    try{

        verify = jwt.verify(token,Secret)
        

    }
    catch{
        
        return res.status(403).json({message: "invalid Token, you are not authorized, Signup/login again"})
    }
    req.email = verify.email
    req.username = verify.username
    next()
}

module.exports = authMiddlware 