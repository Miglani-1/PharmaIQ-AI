
import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User.js";
import Organization from "../models/Organization.js";

const LEGACY_ROLES = ["admin", "user"];

const TENANT_ROLES = [
  "organization_admin",
  "pharmacist",
  "auditor",
];

// ==========================================
// MIGRATE RBAC
// ==========================================

const migrateRBAC = async () => {
  try {
    console.log("\n==================================");
    console.log("PharmaIQ AI - RBAC Migration");
    console.log("==================================\n");

    // ==========================================
    // VALIDATE ENVIRONMENT
    // ==========================================

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in .env"
      );
    }

    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    if (
      !superAdminEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        superAdminEmail
      )
    ) {
      throw new Error(
        "Set a valid SUPER_ADMIN_EMAIL in .env"
      );
    }

    // Dry run is enabled by default
    const applyChanges =
      process.argv.includes("--apply");

    console.log(
      applyChanges
        ? "Mode: APPLY CHANGES"
        : "Mode: DRY RUN (no database changes)"
    );

    // ==========================================
    // CONNECT DATABASE
    // ==========================================

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("MongoDB connected.\n");

    // ==========================================
    // FIND EXPLICIT SUPER ADMIN
    // ==========================================

    const superAdmin = await User.findOne({
      email: superAdminEmail,
    }).select("-password");

    if (!superAdmin) {
      throw new Error(
        "Super Admin account not found. Use the email of an existing trusted account."
      );
    }

    // Prevent accidental creation of multiple
    // Super Admin accounts
    const otherSuperAdmin = await User.exists({
      role: "super_admin",
      _id: {
        $ne: superAdmin._id,
      },
    });

    if (otherSuperAdmin) {
      throw new Error(
        "Another Super Admin already exists. Migration stopped."
      );
    }

    console.log(
      "Selected Super Admin:",
      superAdmin.email
    );

    // ==========================================
    // FETCH LEGACY USERS
    // ==========================================

    const legacyUsers = await User.find({
      role: {
        $in: LEGACY_ROLES,
      },

      _id: {
        $ne: superAdmin._id,
      },
    }).select("-password");

    console.log(
      "Legacy users found:",
      legacyUsers.length
    );

    const migrationPlan = [];

    // ==========================================
    // PREPARE MIGRATION PLAN
    // ==========================================

    for (const user of legacyUsers) {
      let organizationId =
        user.organization || null;

      let reason =
        "Manual organization assignment required";

      // Preserve existing valid organization
      // assignments without guessing membership
      if (organizationId) {
        const organization =
          await Organization.findById(
            organizationId
          ).select("_id name isActive");

        if (organization) {
          reason =
            "Existing organization assignment preserved";
        } else {
          organizationId = null;

          reason =
            "Invalid organization assignment cleared";
        }
      } else {
        // Ownership information is used only
        // for reporting, not automatic assignment
        const ownedOrganizations =
          await Organization.find({
            createdBy: user._id,
          })
            .select("_id name")
            .lean();

        if (ownedOrganizations.length === 1) {
          reason =
            `Review existing organization: ${ownedOrganizations[0].name}`;
        }

        if (ownedOrganizations.length > 1) {
          reason =
            "Multiple organizations found. Manual assignment required.";
        }
      }

      migrationPlan.push({
        userId: user._id,

        email: user.email,

        oldRole: user.role,

        oldOrganization:
          user.organization || null,

        newRole: "pharmacist",

        organization: organizationId,

        isActive: false,

        updatedAt: user.updatedAt,

        reason,
      });
    }

    // ==========================================
    // DISPLAY MIGRATION PLAN
    // ==========================================

    console.log("\nMigration plan:\n");

    console.table([
      {
        email: superAdmin.email,
        oldRole: superAdmin.role,
        newRole: "super_admin",
        isActive: true,
      },

      ...migrationPlan.map((item) => ({
        email: item.email,
        oldRole: item.oldRole,
        newRole: item.newRole,
        isActive: item.isActive,
        reason: item.reason,
      })),
    ]);

    // ==========================================
    // DRY RUN
    // ==========================================

    if (!applyChanges) {
      console.log(
        "\nDry run completed successfully."
      );

      console.log(
        "No database records were modified."
      );

      console.log(
        "Review the migration plan before applying changes."
      );

      console.log(
        "To apply: node scripts/migrateRBAC.js --apply"
      );

      return;
    }

    // ==========================================
    // APPLY MIGRATION
    // ==========================================

    // Transactions require MongoDB Atlas
    // or a MongoDB replica set.

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(
        async () => {
          // Check again inside transaction
          const existingAdmin =
            await User.exists({
              role: "super_admin",

              _id: {
                $ne: superAdmin._id,
              },
            }).session(session);

          if (existingAdmin) {
            throw new Error(
              "Another Super Admin exists."
            );
          }

          // Promote explicitly selected account
          const adminResult =
            await User.updateOne(
              {
                _id: superAdmin._id,

                email: superAdminEmail,

                role: superAdmin.role,

                updatedAt:
                  superAdmin.updatedAt,
              },
              {
                $set: {
                  role: "super_admin",

                  organization: null,

                  isActive: true,
                },
              },
              {
                session,
                runValidators: true,
              }
            );

          if (adminResult.matchedCount !== 1) {
            throw new Error(
              "Selected admin account changed. Run migration again."
            );
          }

          // Migrate legacy accounts
          for (const item of migrationPlan) {
            const result =
              await User.updateOne(
                {
                  _id: item.userId,

                  role: item.oldRole,

                  organization:
                    item.oldOrganization,

                  updatedAt:
                    item.updatedAt,
                },
                {
                  $set: {
                    role: item.newRole,

                    organization:
                      item.organization,

                    isActive: false,
                  },
                },
                {
                  session,
                  runValidators: true,
                }
              );

            if (result.matchedCount !== 1) {
              throw new Error(
                `Account changed during migration: ${item.email}`
              );
            }
          }
        }
      );
    } finally {
      await session.endSession();
    }

    // ==========================================
    // VERIFY MIGRATION
    // ==========================================

    const [
      superAdminCount,
      organizationAdminCount,
      pharmacistCount,
      auditorCount,
      pendingUsersCount,
      legacyUsersCount,
    ] = await Promise.all([
      User.countDocuments({
        role: "super_admin",
      }),

      User.countDocuments({
        role: "organization_admin",
      }),

      User.countDocuments({
        role: "pharmacist",
      }),

      User.countDocuments({
        role: "auditor",
      }),

      User.countDocuments({
        role: {
          $in: TENANT_ROLES,
        },
        isActive: false,
      }),

      User.countDocuments({
        role: {
          $in: LEGACY_ROLES,
        },
      }),
    ]);

    console.log("\nMigration results:\n");

    console.table({
      superAdmins: superAdminCount,

      organizationAdmins:
        organizationAdminCount,

      pharmacists: pharmacistCount,

      auditors: auditorCount,

      inactiveTenantUsers:
        pendingUsersCount,

      remainingLegacyUsers:
        legacyUsersCount,
    });

    console.log(
      "\nRBAC migration committed successfully."
    );

    console.log(
      "Existing passwords and compliance records were preserved."
    );

    console.log(
      "Inactive accounts require administrator review and activation."
    );
  } catch (error) {
    console.error(
      "\nMigration error:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      "\nMongoDB disconnected."
    );
  }
};

migrateRBAC();
