import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware';
import { globalErrorHandler } from './middlewares/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import departmentRoutes from './modules/department/department.routes';
import programRoutes from './modules/program/program.routes';
import courseRoutes from './modules/course/course.routes';
import semesterRoutes from './modules/semester/semester.routes';
import sectionRoutes from './modules/section/section.routes';
import registrationRoutes from './modules/registration/registration.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import gradeRoutes from './modules/grade/grade.routes';
import paymentRoutes from './modules/payment/payment.routes';
import adminRoutes from './modules/admin/admin.routes';

const app: Application = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiRateLimiter);

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'University Management System API is running smoothly 🎓',
    version: '1.0.0',
    documentation: 'See postman_collection.json for full endpoint specifications',
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/programs', programRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/semesters', semesterRoutes);
app.use('/api/v1/sections', sectionRoutes);
app.use('/api/v1/registrations', registrationRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);

// Handle 404 routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Cannot find route ${req.originalUrl} on this server!`,
    errors: [{ message: 'Route not found' }],
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
