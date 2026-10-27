const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const Project = require("./models/Project");
const Proposal = require("./models/proposal");
const Job = require("./models/job");
const { workspaceTypeForCategory } = require("./services/projectWorkspace");
const { deriveMembershipRepair } = require("./services/projectMembershipRepair");

async function migrateProjectWorkspaces() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be configured.");
  await mongoose.connect(process.env.MONGO_URI);
  let repairedMemberships = 0;
  let assignedWorkspaceTypes = 0;
  let skippedMemberships = 0;

  try {
    const projects = await Project.find({
      $or: [
        { workspaceType: { $exists: false } },
        {
          status: { $ne: "Open" },
          $or: [
            { client: null },
            { freelancer: null },
            { client: { $exists: false } },
            { freelancer: { $exists: false } },
          ],
        },
      ],
    });
    for (const project of projects) {
      const updates = {};
      const workspaceType = workspaceTypeForCategory(project.category);
      if (!project.workspaceType || project.workspaceType === "general_task") {
        updates.workspaceType = workspaceType;
      }

      if (!project.client || !project.freelancer) {
        const proposalFilter = {
          status: "accepted",
          project: project._id,
          ...(project.proposal ? { _id: project.proposal } : {}),
        };
        const proposal = await Proposal.findOne(proposalFilter).lean();
        const job = proposal ? await Job.findById(proposal.job).select("client").lean() : null;
        const membership = deriveMembershipRepair(project, proposal, job);
        if (membership) {
          Object.assign(updates, membership);
          repairedMemberships += 1;
        } else {
          skippedMemberships += 1;
        }
      }

      if (updates.workspaceType) assignedWorkspaceTypes += 1;
      if (Object.keys(updates).length) await Project.updateOne({ _id: project._id }, { $set: updates });
    }
  } finally {
    await mongoose.disconnect();
  }

  return { repairedMemberships, assignedWorkspaceTypes, skippedMemberships };
}

if (require.main === module) {
  migrateProjectWorkspaces()
    .then((summary) => console.log("Project workspace migration complete:", summary))
    .catch((error) => {
      console.error("Project workspace migration failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = { migrateProjectWorkspaces };
