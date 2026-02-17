const { MarketplaceUser, MarketplaceUserProfile } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

// Register (minimal: email, phone, password, fullName, terms, privacy)
const register = async (req, res) => {
  try {
    const { email, phone, password, fullName, termsAccepted, privacyAccepted } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Email, password and full name are required",
      });
    }

    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms of use and privacy policy",
      });
    }

    const existing = await MarketplaceUser.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const user = await MarketplaceUser.create({
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      password: hashedPassword,
      fullName: fullName.trim(),
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      profileCompleted: false,
      status: "pending_profile",
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, type: "marketplace" },
      config.jwtSecret,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful. Please complete your profile.",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          profileCompleted: user.profileCompleted,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error("Marketplace register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// Login (email or phone + password)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await MarketplaceUser.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "pending_profile" && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    await user.update({ lastLogin: new Date() });

    const token = jwt.sign(
      { id: user.id, email: user.email, type: "marketplace" },
      config.jwtSecret,
      { expiresIn: "30d" }
    );

    const userJson = user.toJSON();
    delete userJson.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          profileCompleted: user.profileCompleted,
          role: user.role,
          status: user.status,
          profile: user.profile || null,
        },
      },
    });
  } catch (error) {
    console.error("Marketplace login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = { register, login };
