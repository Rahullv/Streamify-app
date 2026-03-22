import express from "express";
import "dotenv/config";
import authRoutes from "./routes/auth-route.js";
import userRoutes from "./routes/user-routes.js";
import chatRoutes from "./routes/chat-route.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();

app.use(cors({
     origin: "http://localhost:5173",
     credentials: true // allow frontend to send cookies
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

if(process.env.NODE_ENV === "production") {
     app.use(express.static(path.join(__dirname, "../frontend/dist")));

     app.get(/^\/(?!api).*/,(req,resp) => {
          resp.sendFile(path.join(__dirname, "..frontend/dist/index.html"));
     })
}


app.listen(PORT, () => {
     console.log(`Server is running on ${PORT}`);
     connectDB();
});

