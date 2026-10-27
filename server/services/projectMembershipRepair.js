function objectIdString(value) {
  const id = value && typeof value === "object" ? value._id ?? value.id ?? value : value;
  return id == null ? "" : String(id);
}

function deriveMembershipRepair(project, acceptedProposal, job) {
  if (!project?._id || acceptedProposal?.status !== "accepted" || !job?._id) return null;
  if (objectIdString(acceptedProposal.project) !== objectIdString(project._id)) return null;
  if (project.proposal && objectIdString(project.proposal) !== objectIdString(acceptedProposal._id)) return null;
  if (project.job && objectIdString(project.job) !== objectIdString(acceptedProposal.job)) return null;
  if (objectIdString(job._id) !== objectIdString(acceptedProposal.job)) return null;
  if (objectIdString(job.client) !== objectIdString(acceptedProposal.client)) return null;
  if (project.client && objectIdString(project.client) !== objectIdString(acceptedProposal.client)) return null;

  const updates = {};
  if (!project.client) updates.client = acceptedProposal.client;
  if (!project.freelancer) updates.freelancer = acceptedProposal.freelancer;
  if (!project.job) updates.job = acceptedProposal.job;
  if (!project.proposal) updates.proposal = acceptedProposal._id;
  return Object.keys(updates).length ? updates : null;
}

module.exports = { objectIdString, deriveMembershipRepair };
