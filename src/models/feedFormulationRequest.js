const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FeedFormulationRequest = sequelize.define(
    "FeedFormulationRequest",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      marketplaceUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "marketplace_user_id",
        references: {
          model: "marketplace_users",
          key: "id",
        },
        comment: "Optional: logged-in user who submitted the request",
      },
      animalType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "animal_type",
        comment: "e.g. poultry, cattle, pig, aqua",
      },
      productionStage: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "production_stage",
        comment: "e.g. starter, grower, finisher, breeder",
      },
      budget: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: "Estimated budget (USD) as entered by user",
      },
      preferredIngredients: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "preferred_ingredients",
        comment: "e.g. Soya meal, Maize bran, Fish meal...",
      },
      status: {
        type: DataTypes.ENUM("new", "in_review", "responded", "closed"),
        allowNull: false,
        defaultValue: "new",
        comment: "Internal status for nutritionist/admin",
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "admin_notes",
        comment: "Internal notes from nutritionist/admin",
      },
    },
    {
      tableName: "feed_formulation_requests",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["marketplace_user_id"] },
        { fields: ["status"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return FeedFormulationRequest;
};
