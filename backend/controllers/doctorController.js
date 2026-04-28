import Doctor from "../models/Doctors.js";
import {uploadToCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
//helper function
const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + (mm || 0);
};

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule).forEach(([date, slots]) => {
    if (!Array.isArray(slots)) return;
    const uniq = Array.from(new Set(slots));
    uniq.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    out[date] = uniq;
  });
  return out;
}

function parseScheduleInput(s) {
  if (!s) return {};
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return {};
    }
  }
  return dedupeAndSortSchedule(s || {});
}

function normalizeDocForClient(raw = {}) {
  const doc = { ...raw };

  // convert Mongoose Map to plain object
  if (doc.schedule && typeof doc.schedule.forEach === "function") {
    const obj = {};
    doc.schedule.forEach((val, key) => {
      obj[key] = Array.isArray(val) ? val : [];
    });
    doc.schedule = obj;
  } else if (!doc.schedule || typeof doc.schedule !== "object") {
    doc.schedule = {};
  }

  doc.availability = doc.availability === undefined ? "Available" : doc.availability;
  doc.patients = doc.patients ?? "";
  doc.rating = doc.rating ?? 0;
  doc.fee = doc.fee ?? doc.fees ?? 0;

  return doc;
}

//create doctor
export const createDoctor = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.email || !body.password) {
        return res.status(400).json({ 
            message: "Name, email, and password are required", success: false })




        }

        const emailLC = (body.email|| "").toLowerCase();
        if (await Doctor.findOne({ email: emailLC })) {
            return res.status(409).json({ 
                message: "A doctor with this email already exists", success: false });
        }


        let imageUrl = body.imageUrl || null;
        let imagePublicId = body.imagePublicId || null;
        if (req.file?.path)
{
    const uploaded = await uploadToCloudinary(req.file.path, 'doctors')
    imageUrl = uploaded?.secure_url || uploaded?.url||imageUrl;
    imagePublicId = uploaded?.public_id||uploaded?.publicId|| imagePublicId;
}  
const schedule = parseScheduleInput(body.schedule);
const doc = new Doctor({
      email: emailLC,
      password: body.password,
      name: body.name,
      specialization: body.specialization || "",
      imageUrl,
      imagePublicId,
      availability: body.availability || "Available",
      experience: body.experience || "",
      qualifications: body.qualifications || "",
      location: body.location || "",
      about: body.about || "",
      fee: body.fee !== undefined ? Number(body.fee) : 0,
      schedule,
      success: body.success || "",
      patients: body.patients || "",
      rating: body.rating !== undefined ? Number(body.rating) : 0,
    });
    
await doc.save();
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.warn('JWT_SECRET is not defined in environment variables');
  return res.status(500).json({ message: "Server configuration error", success: false });

}


const token = jwt.sign({
   id: doc._id.toString(),email: doc.email,
   role:'doctor'
 }, secret, { expiresIn: '7d' });

 const out = normalizeDocForClient(doc.toObject());
 delete out.password;

 return res.status(201).json({ 
  message: "Doctor created successfully",
   success: true, doctor: out, token });
 }


catch (error) {
  console.error("Error creating doctor:", error);
}
}
// to get doctor
export const getDoctors = async (req, res) => {
  try {
    const { q = "", limit: limitRaw = 200, page: pageRaw = 1 } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 200));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const match = {};
    if (q && typeof q === "string" && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      match.$or = [{ name: re }, { specialization: re }, { speciality: re }, { email: re }];
    }

    const docs = await Doctor.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments",
        },
      },
      {
        $addFields: {
          appointmentsTotal: { $size: "$appointments" },
          appointmentsCompleted: {
            $size: {
              $filter: { input: "$appointments", as: "a", cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] } }
            }
          },
          appointmentsCanceled: {
            $size: {
              $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Canceled"] } }
            }
          },
          earnings: {
            $sum: {
              $map: {
                input: {
                  $filter: { input: "$appointments", as: "a", cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] } }
                },
                as: "p",
                in: { $ifNull: ["$$p.fees", 0] }
              }
            }
          }
        }
      },
      { $project: { appointments: 0 } },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const normalized = docs.map((d) => ({
      _id: d._id,
      id: d._id,
      name: d.name || "",
      specialization: d.specialization || d.speciality || "",
      fee: d.fee ?? d.fees ?? d.consultationFee ?? 0,
      imageUrl: d.imageUrl || d.image || d.avatar || null,
      appointmentsTotal: d.appointmentsTotal || 0,
      appointmentsCompleted: d.appointmentsCompleted || 0,
      appointmentsCanceled: d.appointmentsCanceled || 0,
      earnings: d.earnings || 0,
      availability: d.availability ?? "Available",
      schedule: (d.schedule && typeof d.schedule === "object") ? d.schedule : {},
      patients: d.patients ?? "",
      rating: d.rating ?? 0,
      about: d.about ?? "",
      experience: d.experience ?? "",
      qualifications: d.qualifications ?? "",
      location: d.location ?? "",
      success: d.success ?? "",
      raw: d,
    }));

    const total = await Doctor.countDocuments(match);
    return res.json({ success: true, data: normalized, doctors: normalized, meta: { page, limit, total } });
  } catch (err) {
    console.error("getDoctors:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// to get doctor by id
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).select("-password").lean();

    if (!doctor) return res.status(400).json({ success: false, message: "Doctor not found" });

    return res.json({ success: true, doctor: normalizeDocForClient(doctor) });
  }
  catch (err) {
    console.error("getDoctorById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

//to update doctor
export async function updateDoctor(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!req.doctor || String(req.doctor._id || req.doctor.id) !== String(id)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this doctor" });
    }

    const existing = await Doctor.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Doctor not found" });

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      if (uploaded) {
        const previousPublicId = existing.imagePublicId;
        existing.imageUrl = uploaded.secure_url || uploaded.url || existing.imageUrl;
        existing.imagePublicId = uploaded.public_id || uploaded.publicId || existing.imagePublicId;
        if (previousPublicId && previousPublicId !== existing.imagePublicId) {
          deleteFromCloudinary(previousPublicId).catch((e) => console.warn("deleteFromCloudinary warning:", e?.message || e));
        }
      }
    } else if (body.imageUrl) {
      existing.imageUrl = body.imageUrl;
    }

    if (body.schedule) existing.schedule = parseScheduleInput(body.schedule);

    const updatable = ["name", "specialization", "experience", "qualifications", "location", "about", "fee", "availability", "success", "patients", "rating"];
    updatable.forEach((k) => { if (body[k] !== undefined) existing[k] = body[k]; });

    if (body.email && body.email !== existing.email) {
      const other = await Doctor.findOne({ email: body.email.toLowerCase() });
      if (other && other._id.toString() !== id) return res.status(409).json({ success: false, message: "Email already in use" });
      existing.email = body.email.toLowerCase();
    }

    if (body.password) existing.password = body.password;

    await existing.save();

    const out = normalizeDocForClient(existing.toObject());
    delete out.password;
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("updateDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// to delete doctor
export async function deleteDoctor(req, res) {
  try {
    const { id } = req.params;
    const existing = await Doctor.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Doctor not found" });

    if (existing.imagePublicId) {
      try {
        await deleteFromCloudinary(existing.imagePublicId);
      } catch (e) {
        console.warn("deleteFromCloudinary warning:", e?.message || e);
      }
    }
    await Doctor.findByIdAndDelete(id);
    return res.json({ success: true, message: "Doctor deleted successfully" });
  
  }
    catch (err) {
      console.error("deleteDoctor error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
  //to toogle doctor availability
export async function toggleDoctorAvailability(req, res) {
  try {
    const { id } = req.params;
    
    if (!req.doctor|| String(req.doctor._id || req.doctor.id) !== String(id)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this doctor Availability" });

    }
    const doctor = await Doctor.findById(id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    if (typeof doctor.availability === "boolean") doctor.availability = !doctor.availability;
    else doctor.availability = doctor.availability === "Available" ? "Unavailable" : "Available";
    await doctor.save();
    const out = normalizeDocForClient(doctor.toObject());
    delete out.password;
    return res.json({ success: true, data: out });
  }
  catch (err) {
    console.error("toggleDoctorAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

//to login the doctor
export async function doctorLogin(req,res){
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" }); 
    const doctor = await Doctor.findOne({ email: email.toLowerCase() }).select("+password");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (doctor.password !== password) return res.status(401).json({ success: false, message: "Invalid password" });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ success: false, message: "Server configuration error" });
    const token = jwt.sign({ id: doctor._id.toString(), email: doctor.email, role: 'doctor' }, secret, { expiresIn: '7d' });
    const out = normalizeDocForClient(doctor.toObject());
    delete out.password;
    return res.json({ success: true, doctor: out, token });
  }
  catch (err) {
    console.error("doctorLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}