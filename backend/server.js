import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './config/db.js';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRouter.js';
import appointmentsRouter from './routes/appointmentsRouter.js';


const app = express();
const port = process.env.PORT || 4000;

// 🔹 Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(clerkMiddleware());

// 🔹 DB Connection
connectDB();

// 🔹 Routes

app.use('/api/doctors', doctorRouter);
app.use('/api/services', serviceRouter);
app.use('/api/appointments', appointmentsRouter);


app.get('/', (req, res) => {
  res.send('🚀 MediCare Hospital Management API is running...');
});

// 🔹 Sample protected route (optional test)
app.get('/protected', (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({ message: "You are authenticated", userId: req.auth.userId });
});

// 🔹 Global Error Handler (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 🔹 Start Server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});