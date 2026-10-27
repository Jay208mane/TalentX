/**
 * Validation and sanitization for AI Generation requests.
 */

function sanitizeString(input, maxLength = 2000) {
  if (typeof input !== "string") return "";
  // Strip control characters and excessive whitespace, limit length
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function validateJobDescriptionInput(body) {
  const errors = [];

  const jobTitle = sanitizeString(body.jobTitle, 120);
  if (!jobTitle || jobTitle.length < 3) {
    errors.push("Job title must be between 3 and 120 characters.");
  }

  const category = sanitizeString(body.category, 80) || "Development";

  const projectIdea = sanitizeString(body.projectIdea || body.description, 3000);
  if (!projectIdea || projectIdea.length < 10) {
    errors.push("Project idea / description must contain at least 10 characters.");
  }

  // Handle skills array or comma-separated string
  let skills = [];
  if (Array.isArray(body.skills)) {
    skills = body.skills;
  } else if (typeof body.skills === "string") {
    skills = body.skills.split(",");
  }
  const cleanSkills = skills
    .map((s) => (typeof s === "string" ? sanitizeString(s, 50) : ""))
    .filter(Boolean)
    .slice(0, 20);

  if (cleanSkills.length === 0) {
    errors.push("Provide at least 1 required technical skill.");
  }

  const experienceLevel = sanitizeString(body.experienceLevel, 50) || "intermediate";
  const validLevels = ["entry", "intermediate", "expert", "any"];
  const normalizedLevel = validLevels.includes(experienceLevel.toLowerCase())
    ? experienceLevel.toLowerCase()
    : "intermediate";

  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    errors.push("Estimated budget must be a positive number.");
  }

  const budgetType = body.budgetType === "hourly" ? "hourly" : "fixed";

  const duration = sanitizeString(body.duration, 80) || "1 to 3 months";

  const additionalRequirements = sanitizeString(
    body.additionalRequirements || "",
    1500
  );

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      jobTitle,
      category,
      projectIdea,
      skills: cleanSkills,
      experienceLevel: normalizedLevel,
      budget,
      budgetType,
      duration,
      additionalRequirements,
    },
  };
}

module.exports = {
  sanitizeString,
  validateJobDescriptionInput,
};
