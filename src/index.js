//require('dotenv').config({path : './env'}) (loss of consistency)
import dotenv from "dotenv"
import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import express from "express"
import connectDB from "./db/index.js";

dotenv.config({
    path : '.env'
})


// function connectDB () {}
// connectDB()  not that better approach

//2nd approach :- alag file se function import krna
//no use of express in 2nd approach (1st m bhi aisa zroori nhi tha hta skte the)
connectDB()






















//method 1:-
// ;(async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR: ",error);
//             throw error;
//         }) //app on lagake kahin events ko listen kr skti (error ka event)
        
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
    
//     } catch (error) {
//         console.log("ERROR: ",error)
//         throw err
//     }
// })() //iffi