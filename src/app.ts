import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import { Request, Response, NextFunction } from "express";  


const app = express();


app.use(cors({
    credentials:true,
    origin:process.env.CORS_ORIGIN
}))

app.use(express.json({ limit: "50mb" }))

app.use(cookieParser())

app.use(express.urlencoded({ extended: true, limit: "50mb" }))

app.use(express.static("public"))

app.use(errorHandler)

// Routes
import authRoutes  from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";


app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/attendance", attendanceRoutes);




export { app }