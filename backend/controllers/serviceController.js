import Service from '../models/services.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

/* ===========================
   Helper Functions
=========================== */

const parseJsonArrayField = (field) => {
  if (!field) return [];

  if (Array.isArray(field)) return field;

  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed)
        ? parsed
        : typeof parsed === "string"
        ? [parsed]
        : [];
    } catch {
      return field.split(",").map(s => s.trim()).filter(Boolean);
    }
  }

  return [];
};

const normalizeSlotsToMap = (slotStrings = []) => {
  const map = {};

  slotStrings.forEach((raw) => {
    const match = raw.match(
      /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
    );

    if (!match) {
      map["unspecified"] = map["unspecified"] || [];
      map["unspecified"].push(raw);
      return;
    }

    const [, day, monShort, year, hour, minute, ampm] = match;

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const monthIndex = months.findIndex(
      m => m.toLowerCase() === monShort.toLowerCase()
    );

    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(Number(day)).padStart(2, "0");

    const dateKey = `${year}-${mm}-${dd}`;
    const timeStr = `${String(Number(hour)).padStart(2, "0")}:${minute} ${ampm.toUpperCase()}`;

    map[dateKey] = map[dateKey] || [];
    map[dateKey].push(timeStr);
  });

  return map;
};

const sanitizePrice = (value) => {
  return Number(String(value ?? "0").replace(/[^\d.-]/g, "")) || 0;
};

const parseAvailability = (value) => {
  const v = String(value ?? "available").toLowerCase();
  return v === "available" || v === "true";
};

/* ===========================
   CREATE SERVICE
=========================== */

export const createService = async (req, res) => {
  try {
    const body = req.body || {};

    const instructions = parseJsonArrayField(body.instructions);
    const slots = normalizeSlotsToMap(parseJsonArrayField(body.slots));
    const price = sanitizePrice(body.price);
    const available = parseAvailability(body.availability);

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      try {
        const upload = await uploadToCloudinary(req.file.path, "services");
        imageUrl = upload?.secure_url || null;
        imagePublicId = upload?.public_id || null;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const service = new Service({
      name: body.name,
      shortDescription: body.shortDescription || "",
      about: body.about || "",
      price,
      available,
      instructions,
      slots,
      imageUrl,
      imagePublicId,
    });

    const saved = await service.save();

    return res.status(201).json({
      success: true,
      data: saved,
      message: "Service created successfully",
    });

  } catch (error) {
    console.error("Create service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

/* ===========================
   GET ALL SERVICES
=========================== */

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: services,
      message: "Services retrieved successfully",
    });

  } catch (error) {
    console.error("Get all services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
    });
  }
};

/* ===========================
   GET SERVICE BY ID
=========================== */

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id).lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: service,
      message: "Service retrieved successfully",
    });

  } catch (error) {
    console.error("Get service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve service",
    });
  }
};

/* ===========================
   UPDATE SERVICE
=========================== */

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await Service.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.about !== undefined) updateData.about = body.about;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (body.price !== undefined) updateData.price = sanitizePrice(body.price);
    if (body.availability !== undefined) updateData.available = parseAvailability(body.availability);
    if (body.instructions !== undefined) updateData.instructions = parseJsonArrayField(body.instructions);
    if (body.slots !== undefined) {
      updateData.slots = normalizeSlotsToMap(parseJsonArrayField(body.slots));
    }

    if (req.file) {
      try {
        const upload = await uploadToCloudinary(req.file.path, "services");

        if (upload?.secure_url) {
          updateData.imageUrl = upload.secure_url;
          updateData.imagePublicId = upload.public_id || null;

          if (existing.imagePublicId) {
            try {
              await deleteFromCloudinary(existing.imagePublicId);
            } catch (err) {
              console.warn("Cloudinary delete failed:", err?.message || err);
            }
          }
        }
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const updated = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Service updated successfully",
    });

  } catch (error) {
    console.error("Update service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update service",
    });
  }
};

/* ===========================
   DELETE SERVICE (FIXED )
=========================== */

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Service.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Delete image from Cloudinary
    if (existing.imagePublicId) {
      try {
        await deleteFromCloudinary(existing.imagePublicId);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err?.message || err);
      }
    }

    // Delete service from DB
    await existing.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });

  } catch (error) {
    console.error("Delete service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
    });
  }
};
