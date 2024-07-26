import express from "express";
import cookieParser from "cookie-parser"; //apne server se user ke browser ki cookies access aur accept kr skte hain 
import cors from "cors";

const app = express();

// app.use(cors()) //itna bhi boht hai
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

//bracket ke andr sbme options hain:-
app.use(express.json({limit : "16kb"})) //JSON's limit (form se data aa rha hai)
app.use(express.urlencoded({extended : true , limit : 
    "16kb"})) //extended allows nested objects (extended objects)
app.use(express.static("public"))    //public assets
app.use(cookieParser())

export {app}
