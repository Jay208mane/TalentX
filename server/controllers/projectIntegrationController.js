const mongoose = require("mongoose");
const Project = require("../models/Project");
const ProjectRepositoryConnection = require("../models/ProjectRepositoryConnection");
const { isProjectMember, idString } = require("./projectController");
const {
  GitHubIntegrationError,
  encryptToken,
  decryptToken,
  githubRequest,
} = require("../services/githubIntegration");
const { notifyProject } = require("../services/realtime");
const { workspaceTypeForCategory } = require("../services/projectWorkspace");

const invalidProjectId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.projectId)) {
    res.status(400).json({ message: "Invalid project ID." });
    return true;
  }
  return false;
};

const getProjectForMember = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    res.status(404).json({ message: "Project not found." });
    return null;
  }
  if (!isProjectMember(project, req.user._id)) {
    res.status(403).json({ message: "You are not a member of this project." });
    return null;
  }
  if ((project.workspaceType || workspaceTypeForCategory(project.category)) !== "web_development") {
    res.status(409).json({ message: "GitHub linking is available for web and software development projects." });
    return null;
  }
  return project;
};

function sendIntegrationError(res, error, fallback) {
  if (error instanceof GitHubIntegrationError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error(fallback, error.message);
  return res.status(500).json({ message: "Unable to complete this repository operation." });
}

exports.linkRepository = async (req, res) => {
  if (invalidProjectId(req, res)) return;
  const owner = typeof req.body.owner === "string" ? req.body.owner.trim() : "";
  const repository = typeof req.body.repository === "string" ? req.body.repository.trim() : "";
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) ||
      !/^[A-Za-z0-9_.-]{1,100}$/.test(repository) ||
      !/^(github_pat_|ghp_|gho_)[A-Za-z0-9_]{20,255}$/.test(token)) {
    return res.status(400).json({
      message: "Enter a valid GitHub owner, repository, and fine-grained personal access token.",
    });
  }
  try {
    const project = await getProjectForMember(req, res);
    if (!project) return;
    if (idString(project.freelancer) !== idString(req.user._id)) {
      return res.status(403).json({ message: "Only the assigned freelancer can connect a repository." });
    }
    const repo = await githubRequest(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, token);
    const encrypted = encryptToken(token);
    const connection = await ProjectRepositoryConnection.findOneAndUpdate(
      { project: project._id },
      {
        $set: {
          project: project._id,
          connectedBy: req.user._id,
          owner: repo.owner.login,
          repository: repo.name,
          private: Boolean(repo.private),
          defaultBranch: repo.default_branch || "main",
          ...encrypted,
          linkedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).select("owner repository private defaultBranch linkedAt");
    project.activity.push({
      actor: req.user._id,
      type: "repository_linked",
      message: `Connected GitHub repository ${repo.full_name}.`,
    });
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, repositoryLinked: true });
    return res.status(200).json({
      message: "GitHub repository connected. Only repository data returned by GitHub will appear here.",
      repository: {
        owner: connection.owner,
        name: connection.repository,
        private: connection.private,
        defaultBranch: connection.defaultBranch,
        url: repo.html_url,
        linkedAt: connection.linkedAt,
      },
    });
  } catch (error) {
    return sendIntegrationError(res, error, "Connect GitHub repository failed:");
  }
};

exports.getRepositoryActivity = async (req, res) => {
  if (invalidProjectId(req, res)) return;
  try {
    const project = await getProjectForMember(req, res);
    if (!project) return;
    const connection = await ProjectRepositoryConnection.findOne({ project: project._id })
      .select("+encryptedToken +iv +authTag");
    if (!connection) return res.status(200).json({ connected: false, repository: null });
    let token;
    try {
      token = decryptToken(connection);
    } catch (error) {
      if (error instanceof GitHubIntegrationError) return sendIntegrationError(res, error, "Decrypt GitHub token failed:");
      return res.status(503).json({ message: "Stored GitHub authorization could not be decrypted. Reconnect the repository." });
    }
    const repositoryPath = `https://api.github.com/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repository)}`;
    const [repo, commits, pullRequests, releases] = await Promise.all([
      githubRequest(repositoryPath, token),
      githubRequest(`${repositoryPath}/commits?per_page=10`, token),
      githubRequest(`${repositoryPath}/pulls?state=all&per_page=10`, token),
      githubRequest(`${repositoryPath}/releases?per_page=5`, token),
    ]);
    return res.status(200).json({
      connected: true,
      repository: {
        owner: connection.owner,
        name: connection.repository,
        fullName: repo.full_name,
        private: Boolean(repo.private),
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        linkedAt: connection.linkedAt,
        latestCommit: commits[0] ? {
          sha: commits[0].sha,
          message: commits[0].commit?.message?.split("\n")[0] || "",
          author: commits[0].commit?.author?.name || commits[0].author?.login || "Unknown",
          date: commits[0].commit?.author?.date || null,
          url: commits[0].html_url,
        } : null,
        commits: commits.map((commit) => ({
          sha: commit.sha,
          message: commit.commit?.message?.split("\n")[0] || "",
          author: commit.commit?.author?.name || commit.author?.login || "Unknown",
          date: commit.commit?.author?.date || null,
          url: commit.html_url,
        })),
        pullRequests: pullRequests.map((pullRequest) => ({
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          updatedAt: pullRequest.updated_at,
          url: pullRequest.html_url,
        })),
        releases: releases.map((release) => ({
          name: release.name || release.tag_name,
          tag: release.tag_name,
          publishedAt: release.published_at,
          url: release.html_url,
        })),
      },
    });
  } catch (error) {
    return sendIntegrationError(res, error, "Load GitHub activity failed:");
  }
};

exports.unlinkRepository = async (req, res) => {
  if (invalidProjectId(req, res)) return;
  try {
    const project = await getProjectForMember(req, res);
    if (!project) return;
    if (idString(project.freelancer) !== idString(req.user._id)) {
      return res.status(403).json({ message: "Only the assigned freelancer can disconnect a repository." });
    }
    const result = await ProjectRepositoryConnection.deleteOne({ project: project._id });
    if (!result.deletedCount) return res.status(404).json({ message: "No repository is connected to this project." });
    project.activity.push({ actor: req.user._id, type: "repository_disconnected", message: "Disconnected the GitHub repository." });
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, repositoryLinked: false });
    return res.status(200).json({ message: "GitHub repository disconnected." });
  } catch (error) {
    return sendIntegrationError(res, error, "Disconnect GitHub repository failed:");
  }
};

exports.linkTaskReference = async (req, res) => {
  if (invalidProjectId(req, res)) return;
  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }
  const kind = req.body.kind;
  const reference = typeof req.body.reference === "string" ? req.body.reference.trim() : "";
  if (!["commit", "pull_request"].includes(kind) ||
      (kind === "commit" && !/^[a-f0-9]{7,40}$/i.test(reference)) ||
      (kind === "pull_request" && !/^\d{1,10}$/.test(reference))) {
    return res.status(400).json({ message: "Provide a valid commit SHA or pull request number." });
  }
  try {
    const project = await getProjectForMember(req, res);
    if (!project) return;
    if (idString(project.freelancer) !== idString(req.user._id)) {
      return res.status(403).json({ message: "Only the assigned freelancer can link repository activity to tasks." });
    }
    const connection = await ProjectRepositoryConnection.findOne({ project: project._id })
      .select("+encryptedToken +iv +authTag");
    if (!connection) return res.status(409).json({ message: "Connect a GitHub repository before linking code activity." });
    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    const token = decryptToken(connection);
    const base = `https://api.github.com/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repository)}`;
    const endpoint = kind === "commit"
      ? `${base}/commits/${encodeURIComponent(reference)}`
      : `${base}/pulls/${encodeURIComponent(reference)}`;
    const item = await githubRequest(endpoint, token);
    const linked = {
      kind,
      reference: kind === "commit" ? item.sha : String(item.number),
      title: kind === "commit" ? item.commit?.message?.split("\n")[0] || "" : item.title || "",
      url: item.html_url,
      linkedBy: req.user._id,
    };
    task.codeReferences.push(linked);
    project.activity.push({
      actor: req.user._id,
      type: "code_reference_linked",
      message: `Linked a GitHub ${kind === "commit" ? "commit" : "pull request"} to task: ${task.title}.`,
    });
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, taskId: task._id });
    return res.status(201).json({ message: "Verified repository activity linked to the task.", codeReference: linked });
  } catch (error) {
    return sendIntegrationError(res, error, "Link GitHub task reference failed:");
  }
};

exports.updatePreviewUrl = async (req, res) => {
  if (invalidProjectId(req, res)) return;
  const previewUrl = typeof req.body.previewUrl === "string" ? req.body.previewUrl.trim() : "";
  let parsed;
  try {
    parsed = new URL(previewUrl);
  } catch {
    return res.status(400).json({ message: "Provide a valid HTTPS preview URL." });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || previewUrl.length > 2048) {
    return res.status(400).json({ message: "Preview links must use HTTPS and must not contain credentials." });
  }
  try {
    const project = await getProjectForMember(req, res);
    if (!project) return;
    if (idString(project.freelancer) !== idString(req.user._id)) {
      return res.status(403).json({ message: "Only the assigned freelancer can share a project preview." });
    }
    project.previewUrl = previewUrl;
    project.previewStatus = "submitted";
    project.previewSubmittedAt = new Date();
    project.activity.push({
      actor: req.user._id,
      type: "preview_shared",
      message: "Shared a preview URL. Deployment has not been independently verified by TalentX.",
    });
    await project.save();
    notifyProject(project, "project:updated", { projectId: project._id, previewUpdated: true });
    return res.status(200).json({
      message: "Preview URL saved. This link was shared by the freelancer and is not provider-verified.",
      preview: { url: project.previewUrl, status: project.previewStatus, submittedAt: project.previewSubmittedAt, verified: false },
    });
  } catch (error) {
    return sendIntegrationError(res, error, "Save project preview failed:");
  }
};
