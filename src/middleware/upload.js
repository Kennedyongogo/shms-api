const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

const { convertToRelativePath: toRelativeUploadPath } = require("../utils/filePath");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload directory based on fieldname (aligned to current models)
    let uploadPath;

    if (file.fieldname === "service_image" || file.fieldname === "service_images") {
      uploadPath = path.join(uploadsRoot, "services");
    } else if (file.fieldname === "event_banner") {
      uploadPath = path.join(uploadsRoot, "events", "banners");
    } else if (file.fieldname === "event_image" || file.fieldname === "event_images") {
      uploadPath = path.join(uploadsRoot, "events", "images");
    } else if (file.fieldname === "news_featured_image") {
      uploadPath = path.join(uploadsRoot, "news", "featured");
    } else if (file.fieldname === "news_image" || file.fieldname === "news_images") {
      uploadPath = path.join(uploadsRoot, "news", "images");
    } else if (file.fieldname === "hospital_logo" || file.fieldname === "logo") {
      uploadPath = path.join(uploadsRoot, "hospitals");
    } else if (file.fieldname === "medical_attachment" || file.fieldname === "medical_attachments") {
      uploadPath = path.join(uploadsRoot, "medical-attachments");
    } else if (file.fieldname === "profile_image") {
      uploadPath = path.join(uploadsRoot, "users", "profile-images");
    } else if (file.fieldname === "demo_video") {
      uploadPath = path.join(uploadsRoot, "demo-videos");
    } else if (file.fieldname === "carlvyne_profile_image") {
      uploadPath = path.join(uploadsRoot, "carlvyne", "profile-images");
    } else if (file.fieldname === "admin_profile_image") {
      uploadPath = path.join(uploadsRoot, "admins", "profile-images");
    } else {
      uploadPath = path.join(uploadsRoot, "misc");
    }


    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    // Sanitize filename
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${sanitizedBasename}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

// File filter to allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    // Images
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    // Videos
    "video/mp4": ".mp4",
    "video/avi": ".avi",
    "video/mov": ".mov",
    "video/wmv": ".wmv",
    "video/webm": ".webm",
    "video/mkv": ".mkv",
    // Documents
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
    "text/plain": ".txt",
    "text/csv": ".csv",
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: ${Object.values(
          allowedTypes
        ).join(", ")}`
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (increased for videos)
  },
});

// Middleware for service images (Service.image_path / ServiceImage.image_path)
const uploadServiceImage = upload.single("service_image");
const uploadServiceImages = upload.array("service_images", 10);

// Event uploads (Event.banner_image_path, EventImage.image_path)
const uploadEventBanner = upload.single("event_banner");
const uploadEventImage = upload.single("event_image");
const uploadEventImages = upload.array("event_images", 20);

// News uploads (News.featured_image_path, NewsImage.image_path)
const uploadNewsFeaturedImage = upload.single("news_featured_image");
const uploadNewsImage = upload.single("news_image");
const uploadNewsImages = upload.array("news_images", 20);

// Middleware for hospital logo
const uploadHospitalLogo = upload.single("hospital_logo");

// Middleware for medical attachments (MedicalAttachment.file_path)
const uploadMedicalAttachment = upload.single("medical_attachment");
const uploadMedicalAttachments = upload.array("medical_attachments", 10);

// User profile image (User.profile_image_path)
const uploadUserProfileImage = upload.single("profile_image");

// Live demo video (LiveDemoVideo.video_path)
const uploadDemoVideo = upload.single("demo_video");

// Carlvyne account profile image (CarlvyneAccount.profile_picture_path)
const uploadCarlvyneProfileImage = upload.single("carlvyne_profile_image");

// Admin profile image (Admin.profile_image_path)
const uploadAdminProfileImage = upload.single("admin_profile_image");

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 100MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 10 files.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field.",
      });
    }
  }

  if (error && error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// Helper function to delete file
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Helper function to get file type from mimetype
const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype === "application/pdf") return "pdf";
  if (
    mimetype === "application/msword" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "word";
  }
  if (
    mimetype === "application/vnd.ms-excel" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "excel";
  }
  if (
    mimetype === "application/vnd.ms-powerpoint" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "powerpoint";
  }
  if (mimetype === "text/plain" || mimetype === "text/csv") return "text";
  return "other";
};

module.exports = {
  uploadServiceImage,
  uploadServiceImages,
  uploadEventBanner,
  uploadEventImage,
  uploadEventImages,
  uploadNewsFeaturedImage,
  uploadNewsImage,
  uploadNewsImages,
  uploadHospitalLogo,
  uploadMedicalAttachment,
  uploadMedicalAttachments,
  uploadUserProfileImage,
  uploadDemoVideo,
  uploadCarlvyneProfileImage,
  uploadAdminProfileImage,
  handleUploadError,
  deleteFile,
  getFileType,
  toRelativeUploadPath,
};
