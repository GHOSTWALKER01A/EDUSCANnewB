import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { errorHandler } from "./middlewares/errorHandler.js";
 


const app = express();


const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
    credentials:true,
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins
}))

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  max: 200,
  windowMs: 15 * 60 * 1000, 
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);

app.use(express.json({ limit: "50mb" }))

app.use(cookieParser())

app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key as keyof typeof req]) {
      mongoSanitize.sanitize(req[key as keyof typeof req]);
    }
  });
  next();
});

app.use(express.static("public"))


// Routes
import authRoutes  from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import resourceRoutes from "./routes/resource.router.js";
import eventRoutes from "./routes/events.routes.js";
import doubtRoutes from "./routes/doubt.route.js";
import classRoutes from "./routes/class.route.js";
import studentrecordRoutes from "./routes/record.routes.js"
import teacherRoutes from "./routes/teacher.routes.js"
import scheduleRoutes from "./routes/schedule.routes.js";
import adminRecordRoutes from "./routes/adminRecord.routes.js";
import gradeRoutes from "./routes/grades.routes.js";
import adminScheduleRoutes from "./routes/adminSchedule.routes.js";
import adminAttendanceRoutes from "./routes/adminAttendance.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import adminLeaveRoutes from "./routes/adminLeave.routes.js";

//Declaration
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/doubts", doubtRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/student-record",studentrecordRoutes)
app.use("/api/teacher", teacherRoutes)
app.use("/api/schedule", scheduleRoutes);
app.use("/api/admin/records", adminRecordRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/admin/timetables", adminScheduleRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/leaves", adminLeaveRoutes);



app.use(errorHandler)




export { app }