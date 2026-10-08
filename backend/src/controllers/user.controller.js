import httpStatus from "http-status";
import {User} from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";
const login= async(req, res)=>{
    const {username, password}=req.body;
    if(!username || !password)
    {
        return res.status(400).json({message:"Useranme and password are required"});
    }
    try
    {
        const user=await User.findOne({username});
        if(!user)
        {
            return res.status(httpStatus.NOT_FOUND).json({message:"User not found"});
        }
        if(await bcrypt.compare(password,user.password))
        {
            let token=crypto.randomBytes(20).toString("hex");
            user.token=token;
            await user.save();
            return res.status(httpStatus.OK).json({message:"Login successful", token});
        }
        return res.status(httpStatus.UNAUTHORIZED).json({message:"Invalid username or password"});

    }catch(error){
        return res.status(500).json({message:`Something went wrong ${error}`});


    }

}

const register= async(req,res)=>{
    const {name, username, password} = req.body;
    try {
        const existingUser = await User.findOne({ username});
        if(existingUser){
            return res.status(httpStatus.FOUND).json({message:"User already exists"}); //early return statements
        }
        const hashedPassword= await bcrypt.hash(password,10);
        const newUser = new User({
            name:name,
            username:username,
            password:hashedPassword
        });
        await newUser.save();
        res.status(httpStatus.CREATED).json({message: "User registered successfully"});
    } catch (error) {
        res.json({message:"Something went wrong"});
    }
}

const addToActivity = async (req, res) => {
    const { token, meeting_code: meetingCode } = req.body;
    if (!token || !meetingCode?.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Token and meeting code are required" });
    }

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired session" });
        }

        const meeting = await Meeting.create({
            user_id: user._id.toString(),
            meetingCode: meetingCode.trim()
        });
        return res.status(httpStatus.CREATED).json(meeting);
    } catch (error) {
        console.error("[API] Could not save meeting activity", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Could not save meeting activity" });
    }
};

const getAllActivity = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "A valid session is required" });
    }

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired session" });
        }

        const meetings = await Meeting.find({ user_id: user._id.toString() }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (error) {
        console.error("[API] Could not load meeting activity", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Could not load meeting activity" });
    }
};

export { addToActivity, getAllActivity, login, register };