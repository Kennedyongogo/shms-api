const { Op } = require("sequelize");
const {
  Project,
  TrainingEvent,
  MarketplaceUserProfile,
  MarketplaceUser,
} = require("../models");

/**
 * GET /api/map/locations
 * Returns entities with latitude/longitude for the MK Map.
 * Query: search (string), column (all | name | category | location).
 * When search is provided, filters projects, events, and users by the term.
 * Admin only.
 */
const getMapLocations = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const column = (req.query.column || "all").toLowerCase();
    const hasSearch = search.length > 0;
    const like = hasSearch ? { [Op.iLike]: `%${search}%` } : null;

    const projectWhere = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    };
    if (hasSearch) {
      if (column === "all") {
        projectWhere[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } },
          { category: { [Op.iLike]: `%${search}%` } },
        ];
      } else if (column === "name") projectWhere.title = like;
      else if (column === "category") projectWhere.category = like;
      else if (column === "location") projectWhere.location = like;
    }

    const eventWhere = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    };
    if (hasSearch) {
      if (column === "all") {
        eventWhere[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } },
          { type: { [Op.iLike]: `%${search}%` } },
        ];
      } else if (column === "name") eventWhere.title = like;
      else if (column === "category") eventWhere.type = like;
      else if (column === "location") eventWhere.location = like;
    }

    const [projects, events, userProfiles] = await Promise.all([
      Project.findAll({
        where: projectWhere,
        attributes: ["id", "title", "latitude", "longitude", "category", "location"],
      }),
      TrainingEvent.findAll({
        where: eventWhere,
        attributes: ["id", "title", "latitude", "longitude", "type", "location"],
      }),
      MarketplaceUserProfile.findAll({
        where: {
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null },
        },
        include: [
          {
            model: MarketplaceUser,
            as: "user",
            attributes: ["id", "fullName", "role"],
            required: true,
            ...(hasSearch && column !== "location" && {
              where:
                column === "all"
                  ? {
                      [Op.or]: [
                        { fullName: { [Op.iLike]: `%${search}%` } },
                        { role: { [Op.iLike]: `%${search}%` } },
                      ],
                    }
                  : column === "name"
                    ? { fullName: like }
                    : column === "category"
                      ? { role: like }
                      : undefined,
            }),
          },
        ],
        attributes: ["id", "userId", "latitude", "longitude", "farmOrBusinessName"],
      }),
    ]);

    const locations = [];

    projects.forEach((p) => {
      const lat = p.latitude != null ? parseFloat(p.latitude) : null;
      const lon = p.longitude != null ? parseFloat(p.longitude) : null;
      if (lat != null && lon != null) {
        locations.push({
          source: "project",
          id: p.id,
          latitude: lat,
          longitude: lon,
          category: p.category || "Other",
          name: p.title || "Project",
          location: p.location || null,
        });
      }
    });

    events.forEach((e) => {
      const lat = e.latitude != null ? parseFloat(e.latitude) : null;
      const lon = e.longitude != null ? parseFloat(e.longitude) : null;
      if (lat != null && lon != null) {
        locations.push({
          source: "training_event",
          id: e.id,
          latitude: lat,
          longitude: lon,
          category: e.type || "Training",
          name: e.title || "Event",
          location: e.location || null,
        });
      }
    });

    userProfiles.forEach((profile) => {
      const user = profile.user;
      const lat = profile.latitude != null ? parseFloat(profile.latitude) : null;
      const lon = profile.longitude != null ? parseFloat(profile.longitude) : null;
      if (lat != null && lon != null && user) {
        const category = user.role
          ? String(user.role).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "User";
        locations.push({
          source: "marketplace_user",
          id: profile.userId,
          profileId: profile.id,
          latitude: lat,
          longitude: lon,
          category,
          name: user.fullName || profile.farmOrBusinessName || "User",
        });
      }
    });

    res.status(200).json({
      success: true,
      data: locations,
      total: locations.length,
    });
  } catch (error) {
    console.error("Map getMapLocations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch map locations",
      error: error.message,
    });
  }
};

module.exports = {
  getMapLocations,
};
