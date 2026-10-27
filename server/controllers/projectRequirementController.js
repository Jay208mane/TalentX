const mongoose = require("mongoose");
const Job = require("../models/job");
const ProjectRequirementDraft = require("../models/ProjectRequirementDraft");
const {
  categories,
  cleanText,
  cleanList,
  categorySpecificFieldKeys,
} = require("../validators/projectRequirementsValidator");
const { workspaceTypeForCategory } = require("../services/projectWorkspace");

const sectionKeys = [
  "overview", "problemStatement", "objectives", "scopeOfWork", "tasksAndMilestones",
  "requiredSkills", "optionalSkills", "recommendedTools", "deliverables",
  "functionalRequirements", "nonFunctionalRequirements", "testingAcceptanceCriteria",
  "estimatedTimeline", "assumptions", "dependencies", "openQuestions",
];
const arraySectionKeys = new Set([
  "objectives", "tasksAndMilestones", "requiredSkills", "optionalSkills",
  "recommendedTools", "deliverables", "functionalRequirements",
  "nonFunctionalRequirements", "testingAcceptanceCriteria", "assumptions",
  "dependencies", "openQuestions",
]);

function sanitizeForm(input = {}) {
  const category = cleanText(input.category, 80);
  const errors = [];
  if (!categories.includes(category)) errors.push("Select a supported project category.");
  const enumValue = (key, values, fallback) => values.includes(input[key]) ? input[key] : fallback;
  const form = {
    title: cleanText(input.title, 120),
    category: categories.includes(category) ? category : categories[0],
    subcategory: cleanText(input.subcategory, 100),
    concept: cleanText(input.concept, 3000),
    expectedOutcome: cleanText(input.expectedOutcome, 3000),
    scope: cleanText(input.scope, 5000),
    skills: cleanList(input.skills, 30, 60),
    tools: cleanList(input.tools, 30, 80),
    projectType: enumValue("projectType", ["Small Task", "Mini Project", "Full Project", "Ongoing Assistance"], "Mini Project"),
    experiencePreference: enumValue("experiencePreference", ["Beginner-Friendly", "Student/Fresher", "Intermediate", "Experienced"], "Beginner-Friendly"),
    complexity: enumValue("complexity", ["Basic", "Intermediate", "Advanced"], "Basic"),
    budgetMin: input.budgetMin === "" || input.budgetMin == null ? "" : String(input.budgetMin).slice(0, 14),
    budgetMax: input.budgetMax === "" || input.budgetMax == null ? "" : String(input.budgetMax).slice(0, 14),
    currency: ["USD", "INR", "EUR", "GBP", "CAD", "AUD"].includes(input.currency) ? input.currency : "USD",
    paymentPreference: enumValue("paymentPreference", ["Fixed Project Price", "Milestone-Based", "Hourly", "Negotiable"], "Negotiable"),
    duration: cleanText(input.duration, 120),
    deadline: cleanText(input.deadline, 10),
    deliverables: cleanList(input.deliverables, 30, 500),
    acceptanceCriteria: cleanText(input.acceptanceCriteria, 3000),
    referenceLinks: cleanList(input.referenceLinks, 20, 2048),
    categoryDetails: Object.fromEntries(
      (categorySpecificFieldKeys[category] || []).map((key) => [key, cleanText(input.categoryDetails?.[key], 1200)])
    ),
    instructions: cleanText(input.instructions, 3000),
    referenceFiles: [],
  };
  form.referenceLinks = form.referenceLinks.filter((link) => {
    try {
      const parsed = new URL(link);
      return parsed.protocol === "https:" && !parsed.username && !parsed.password;
    } catch {
      errors.push("Reference links must be valid HTTPS URLs.");
      return false;
    }
  });

  const files = Array.isArray(input.referenceFiles) ? input.referenceFiles : [];
  if (files.length > 5) errors.push("You can attach up to five reference files.");
  for (const file of files.slice(0, 5)) {
    if (
      !file || typeof file.name !== "string" || typeof file.mimeType !== "string" ||
      typeof file.data !== "string" || file.data.length > 1500000 ||
      !/^data:[\w.+-]+\/[\w.+-]+;base64,/.test(file.data)
    ) {
      errors.push("Each reference file must be a valid file no larger than 1 MB.");
      continue;
    }
    form.referenceFiles.push({
      name: cleanText(file.name, 180),
      mimeType: cleanText(file.mimeType, 100),
      data: file.data,
    });
  }

  if (form.budgetMin && (!Number.isFinite(Number(form.budgetMin)) || Number(form.budgetMin) < 0 || Number(form.budgetMin) > 100000000)) errors.push("Budget minimum must be between zero and 100,000,000.");
  if (form.budgetMax && (!Number.isFinite(Number(form.budgetMax)) || Number(form.budgetMax) < 0 || Number(form.budgetMax) > 100000000)) errors.push("Budget maximum must be between zero and 100,000,000.");
  if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax)) errors.push("Budget minimum cannot exceed the budget maximum.");
  if (form.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) errors.push("Deadline must use the YYYY-MM-DD date format.");

  return { form, errors };
}

function sanitizeRequirements(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const result = {};
  for (const key of sectionKeys) {
    result[key] = arraySectionKeys.has(key)
      ? cleanList(input[key], 20, 1000)
      : cleanText(input[key], 5000);
  }
  result.category = cleanText(input.category, 80);
  result.projectTitle = cleanText(input.projectTitle, 120);
  return result;
}

exports.listDrafts = async (req, res) => {
  try {
    const drafts = await ProjectRequirementDraft.find({ client: req.user._id, status: "draft" })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    return res.status(200).json({ drafts });
  } catch (error) {
    console.error("Load project requirement drafts failed:", error.message);
    return res.status(500).json({ message: "Unable to load your project drafts." });
  }
};

exports.saveDraft = async (req, res) => {
  const { form, errors } = sanitizeForm(req.body.form);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const generatedRequirements = sanitizeRequirements(req.body.generatedRequirements);
  if (req.body.generatedRequirements && !generatedRequirements) {
    return res.status(400).json({ message: "Generated project requirements must be a valid object." });
  }

  try {
    let draft;
    if (req.body.draftId) {
      if (!mongoose.isValidObjectId(req.body.draftId)) {
        return res.status(400).json({ message: "Invalid project draft ID." });
      }
      draft = await ProjectRequirementDraft.findOne({
        _id: req.body.draftId,
        client: req.user._id,
        status: "draft",
      });
      if (!draft) return res.status(404).json({ message: "Draft not found or already published." });
      draft.form = form;
      draft.generatedRequirements = generatedRequirements;
      await draft.save();
    } else {
      draft = await ProjectRequirementDraft.create({
        client: req.user._id,
        form,
        generatedRequirements,
      });
    }
    return res.status(200).json({ message: "Project draft saved.", draft });
  } catch (error) {
    console.error("Save project requirement draft failed:", error.message);
    return res.status(500).json({ message: "Unable to save your project draft." });
  }
};

exports.publishDraft = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.draftId)) {
    return res.status(400).json({ message: "Invalid project draft ID." });
  }
  try {
    const draft = await ProjectRequirementDraft.findOne({
      _id: req.params.draftId,
      client: req.user._id,
      status: { $in: ["draft", "published"] },
    });
    if (!draft) return res.status(404).json({ message: "Draft not found." });
    if (draft.status === "published" && draft.publishedJob) {
      const existingJob = await Job.findById(draft.publishedJob).select("_id title category status").lean();
      if (existingJob) return res.status(200).json({ message: "Project is already published.", job: existingJob });
    }
    const previouslyPublished = await Job.findOne({ sourceDraft: draft._id });
    if (previouslyPublished) {
      draft.status = "published";
      draft.publishedJob = previouslyPublished._id;
      await draft.save();
      return res.status(200).json({
        message: "Project is already published.",
        job: { _id: previouslyPublished._id, title: previouslyPublished.title, category: previouslyPublished.category, status: previouslyPublished.status },
      });
    }

    const { form, errors } = sanitizeForm(draft.form);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const requirements = sanitizeRequirements(draft.generatedRequirements);
    if (form.title.length < 3) return res.status(400).json({ message: "Project title must contain at least 3 characters." });
    if (form.concept.length < 10) return res.status(400).json({ message: "Describe the project in at least 10 characters before publishing." });
    if (!requirements) return res.status(400).json({ message: "Generate project requirements before publishing." });
    if (form.deadline && new Date(`${form.deadline}T23:59:59`) <= new Date()) {
      return res.status(400).json({ message: "The project deadline must be in the future." });
    }

    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;
    const skills = [...new Set([...form.skills, ...requirements.requiredSkills])]
      .map((skill) => skill.slice(0, 60))
      .slice(0, 20);
    const description = [
      requirements.overview,
      `Problem statement:\n${requirements.problemStatement}`,
      `Project concept:\n${form.concept}`,
      form.expectedOutcome && `Expected outcome:\n${form.expectedOutcome}`,
      form.scope && `Client scope:\n${form.scope}`,
      `Scope of work:\n${requirements.scopeOfWork}`,
      `Tasks and milestones:\n${requirements.tasksAndMilestones.join("\n")}`,
      `Deliverables:\n${(form.deliverables.length ? form.deliverables : requirements.deliverables).join("\n")}`,
      `Acceptance criteria:\n${form.acceptanceCriteria || requirements.testingAcceptanceCriteria.join("\n")}`,
      `Project type: ${form.projectType}`,
      `Experience preference: ${form.experiencePreference}`,
      `Complexity: ${form.complexity}`,
      form.duration && `Expected duration: ${form.duration}`,
      `Payment preference: ${form.paymentPreference}`,
      `Category-specific details:\n${Object.entries(form.categoryDetails).filter(([, value]) => value).map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${value}`).join("\n")}`,
      form.instructions && `Additional instructions:\n${form.instructions}`,
    ].filter(Boolean).join("\n\n").slice(0, 10000);
    const paymentType = {
      "Fixed Project Price": "fixed",
      "Milestone-Based": "milestone",
      Hourly: "hourly",
      Negotiable: "negotiable",
    }[form.paymentPreference];
    const job = await Job.create({
      title: form.title,
      description,
      category: form.category,
      skills,
      budgetType: paymentType,
      budget: budgetMin ?? budgetMax ?? null,
      budgetRange: { minimum: budgetMin, maximum: budgetMax, currency: form.currency },
      deadline: form.deadline ? new Date(`${form.deadline}T23:59:59`) : null,
      client: req.user._id,
      sourceDraft: draft._id,
      requirements: {
        projectTitle: form.title,
        workspaceType: workspaceTypeForCategory(form.category),
        subcategory: form.subcategory,
        concept: form.concept,
        expectedOutcome: form.expectedOutcome,
        scope: form.scope,
        skills: form.skills,
        tools: form.tools,
        projectType: form.projectType,
        experiencePreference: form.experiencePreference,
        complexity: form.complexity,
        categoryDetails: form.categoryDetails,
        paymentPreference: form.paymentPreference,
        duration: form.duration,
        deliverables: form.deliverables,
        acceptanceCriteria: form.acceptanceCriteria,
        referenceLinks: form.referenceLinks,
        referenceFiles: form.referenceFiles.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
        instructions: form.instructions,
        generated: requirements,
      },
    });

    draft.status = "published";
    draft.publishedJob = job._id;
    await draft.save();
    return res.status(201).json({
      message: "Project published to discovery.",
      job: { _id: job._id, title: job.title, category: job.category, status: job.status },
    });
  } catch (error) {
    if (error.code === 11000) {
      const existingJob = await Job.findOne({ sourceDraft: req.params.draftId }).select("_id title category status");
      if (existingJob) {
        await ProjectRequirementDraft.updateOne(
          { _id: req.params.draftId, client: req.user._id },
          { $set: { status: "published", publishedJob: existingJob._id } }
        );
        return res.status(200).json({ message: "Project is already published.", job: existingJob });
      }
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Please review the project requirements and try again." });
    }
    console.error("Publish project requirement failed:", error.message);
    return res.status(500).json({ message: "Unable to publish this project right now." });
  }
};
