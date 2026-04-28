import express from 'express';
import multer from 'multer';
import {
  createDoctor,
  getDoctors,
  doctorLogin,
  getDoctorById,
  updateDoctor,
  toggleDoctorAvailability,
  deleteDoctor
} from '../controllers/doctorController.js';
import doctorAuth from '../middlewares/doctorAuth.js';

const upload = multer({ dest: '/temp' });
const doctorRouter = express.Router();

doctorRouter.get('/', getDoctors);
doctorRouter.post('/login', doctorLogin);
doctorRouter.get('/:id', getDoctorById);
doctorRouter.post('/', upload.single('profilePicture'), createDoctor);

doctorRouter.put('/:id', doctorAuth, upload.single('profilePicture'), updateDoctor);
doctorRouter.post('/:id/toggle-availability', doctorAuth, toggleDoctorAvailability);
doctorRouter.delete('/:id', doctorAuth, deleteDoctor);

export default doctorRouter;