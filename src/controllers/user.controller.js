import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { validate } from "uuid";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        //access token is given to user , but refresh token is stored in the database
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false}) //save method from mongodb makes the model ensure that all fields such as password are there in it as well. to prevent that use validateBeforeSave-->justs save
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res)=> {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username,email check
    // check for images, check for avatar
    // upload them to cloudinary , check for avatar
    // create user object - create entry in db
    // remove password and refresh token field from repsonse (we dont want to give encrypted password and refresh token to user)
    // check for user creation
    // return res 

    const {fullName, email , username , password} = req.body
    //console.log("email: ",email)


    if (
        [fullName , email , username , password].some((field)=>
        field?.trim() === "")
    ) {
        throw new ApiError(400 , "fAll fields are required!")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if (existedUser) {
        throw new ApiError(409,"User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path; //taking avatar from multer
    //const coverImageLocalPath = req.files?.coverImage[0]?.path //taking cover Image
    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "" , //check for cover image (not necessarily required)
        email,
        password,
        username : username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
} )

const loginUser = asyncHandler (async (req,res)=>{
    // req body --> data (request body se data le aao)
    // check if the username or email is there or not
    // find the user
    // password check
    // generate access and refresh token
    // send tokens in form of cookies + send response

    const {email,username,password} = req.body
    console.log(email)
    if (!username && !email) {
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{email},{username}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly : true,
        secure : true  //now only server can modify the cookies
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user : loggedInUser,accessToken,refreshToken
        },"User logged in Successfully")
    )

})

const logoutUser = asyncHandler (async (req,res)=>{
    // 1st step--> clearance of access and refresh token (req.cookie has them)
    // problem - no form submission --> no email,password etc --> no User.findOne(__) 
    // solution : use middleware
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)  //name given in both functions should be same (above function)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    // to refresh AT , match the incoming refreshToken and the refreshToken in the database
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }
    // go to jwt website
    // database has a decodedToken in it (encrypted one is passed in the cookies which eventually goes to the user)
    // decodedToken has info like id etc(refresh token has only id)
    try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
            if (!user) {
                throw new ApiError(401,"Unauthorized request")
            }    
            // matching:-
            if (incomingRefreshToken != user?.refreshToken) {
                throw new ApiError(401,"Refresh token is expired or used")
            }
            // generate new refresh token
            const options = {
                httpOnly : true,
                secure : true
            }
        
            const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
            
            return res
            .status(200)
            .cookie("accessToken",accessToken)
            .cookie("refreshToken",newRefreshToken)
            .json(new ApiResponse(200,{accessToken,refreshToken : newRefreshToken},"Access token refreshed"))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}