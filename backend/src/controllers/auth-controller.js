import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export async function signup(req, resp) {
  const { email, password, fullName } = req.body;
  try {
    if (!fullName || !email || !password) {
      return resp.status(400).json({ message: "All field are required" });
    }

    if (password.length < 6) {
      return resp
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return resp.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return resp
        .status(400)
        .json({ message: "Email already exists , try from diffrent one" });
    }

    const idx = Math.floor(Math.random() * 100) + 1; // generate a num between 1-100
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const newUser = await User.create({
      fullName,
      email,
      password,
      profilePic: randomAvatar,
    });

    // todo: create user instream
    try {
      await upsertStreamUser({
        id: newUser._id,
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
      console.log(`Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("Error creating Stream User: ", error);
    }
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" },
    );

    resp.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks
      sameSite: "strict", // prevent CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    resp.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in Signup controller", error);
    resp.status(500).json({ message: "Internal Error" });
  }
}

export async function login(req, resp) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return resp.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return resp.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect)
      return resp.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    resp.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    resp.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in login controller", error);
    resp.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, resp) {
  resp.clearCookie("jwt");
  resp.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, resp) {
  const userId = req.user._id;
  const {fullName, bio, nativeLanguage, learningLanguage, location} = req.body;

  try {
    if(!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
    return resp.status(400).json({
      message: "All fields are required",
      missingFileds: [
        !fullName && "fullName",
        !bio && "bio",
        !nativeLanguage && "nativeLanguage",
        !learningLanguage && "learningLanguage",
        !location && "location",
      ].filter(Boolean),
    });
  }

  const updatedUser = await User.findByIdAndUpdate(userId, {
    ...req.body,
    isOnboarded: true,
  }, {new:true})

  if(!updatedUser) return resp.status(404).json({message: "User not found"});

  try {
    await upsertStreamUser({
      id: updatedUser._id.toString(),
      name: updatedUser.fullName,
      image: updatedUser.profilePic || "",
    });
    console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
  } catch (streamError) {
     
  }

  resp.status(200).json({success: true, user: updatedUser});

  } catch (error) {
    console.error("Onboarding error: ", error);
    resp.status(500).json({message: "Internal Server Error"});
  }
}
