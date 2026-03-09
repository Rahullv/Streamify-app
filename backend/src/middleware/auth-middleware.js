import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, resp, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return resp
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decode) {
      return resp.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decode.userId).select("-password");

    if (!user) {
      return resp
        .status(401)
        .json({ message: "Unauthorized - User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute", error);
    resp.status(500).json({ message: "Internal server error" });
  }
};
