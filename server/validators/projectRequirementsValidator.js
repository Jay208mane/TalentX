const categories = [
  "Web & Mobile Development",
  "AI & Machine Learning",
  "Cybersecurity & Cloud",
  "Data Science & Analytics",
  "Software & Application Development",
  "UI/UX & Graphic Design",
  "Digital Marketing & SEO",
  "Content Writing & Documentation",
  "Business & Virtual Assistance",
  "Academic & Research Support",
  "Testing & Quality Assurance",
  "Other / Custom Project",
];

const choices = {
  projectType: ["Small Task", "Mini Project", "Full Project", "Ongoing Assistance"],
  experiencePreference: ["Beginner-Friendly", "Student/Fresher", "Intermediate", "Experienced"],
  complexity: ["Basic", "Intermediate", "Advanced"],
  paymentPreference: ["Fixed Project Price", "Milestone-Based", "Hourly", "Negotiable"],
};

const categorySpecificFieldKeys = {
  "Web & Mobile Development": ["pagesRolesFeatures", "integrationsDatabase", "responsiveDeployment"],
  "AI & Machine Learning": ["inputData", "expectedOutputs", "evaluationCriteria", "dataRequirements"],
  "Cybersecurity & Cloud": ["authorizedAssets", "scopeExclusions", "testWindow", "cloudEnvironment"],
  "Data Science & Analytics": ["dataSources", "fileFormats", "cleaningRules", "analysisQuestions", "visualizations"],
  "Software & Application Development": ["runtimeEnvironment", "inputsOutputs", "existingSystems"],
  "UI/UX & Graphic Design": ["targetUsers", "screensStates", "brandAccessibility", "sourceExports"],
  "Digital Marketing & SEO": ["audienceChannels", "campaignGoals", "analyticsAccess"],
  "Content Writing & Documentation": ["audiencePurpose", "sourcesCitations", "lengthToneFormat"],
  "Business & Virtual Assistance": ["currentProcess", "confidentiality", "outputSuccess"],
  "Academic & Research Support": ["researchMaterials", "citationFormat", "integrityReview"],
  "Testing & Quality Assurance": ["testEnvironment", "testDataAccess", "coverageThresholds"],
  "Other / Custom Project": ["customDomain", "customConstraints"],
};

function cleanText(value, maxLength = 2000) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength)
    : "";
}

function cleanList(value, maxItems = 30, maxLength = 300) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
  return items.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function validateProjectRequirementsInput(body = {}) {
  const errors = [];
  const category = cleanText(body.category, 80);
  const title = cleanText(body.title, 120);
  const concept = cleanText(body.concept, 3000);

  if (title.length < 3) errors.push("Project title must contain at least 3 characters.");
  if (!categories.includes(category)) errors.push("Select a supported project category.");
  if (concept.length < 10) errors.push("Project concept must contain at least 10 characters.");

  const normalized = {
    title,
    category,
    subcategory: cleanText(body.subcategory, 100),
    concept,
    expectedOutcome: cleanText(body.expectedOutcome, 3000),
    scope: cleanText(body.scope, 5000),
    skills: cleanList(body.skills, 30, 60),
    tools: cleanList(body.tools, 30, 80),
    projectType: choices.projectType.includes(body.projectType) ? body.projectType : "Mini Project",
    experiencePreference: choices.experiencePreference.includes(body.experiencePreference)
      ? body.experiencePreference
      : "Beginner-Friendly",
    complexity: choices.complexity.includes(body.complexity) ? body.complexity : "Basic",
    budgetMin: body.budgetMin === "" || body.budgetMin == null ? null : Number(body.budgetMin),
    budgetMax: body.budgetMax === "" || body.budgetMax == null ? null : Number(body.budgetMax),
    currency: ["USD", "INR", "EUR", "GBP", "CAD", "AUD"].includes(body.currency) ? body.currency : "USD",
    paymentPreference: choices.paymentPreference.includes(body.paymentPreference)
      ? body.paymentPreference
      : "Negotiable",
    duration: cleanText(body.duration, 120),
    deadline: cleanText(body.deadline, 10),
    deliverables: cleanList(body.deliverables, 30, 500),
    acceptanceCriteria: cleanText(body.acceptanceCriteria, 3000),
    referenceLinks: cleanList(body.referenceLinks, 20, 2048),
    instructions: cleanText(body.instructions, 3000),
    categoryDetails: Object.fromEntries(
      (categorySpecificFieldKeys[category] || []).map((key) => [
        key,
        cleanText(body.categoryDetails?.[key], 1200),
      ])
    ),
  };

  for (const field of ["budgetMin", "budgetMax"]) {
    if (normalized[field] !== null && (!Number.isFinite(normalized[field]) || normalized[field] < 0 || normalized[field] > 100000000)) {
      errors.push("Budget values must be zero or greater and within the supported range.");
    }
  }
  if (normalized.budgetMin !== null && normalized.budgetMax !== null && normalized.budgetMin > normalized.budgetMax) {
    errors.push("Budget minimum cannot exceed the budget maximum.");
  }
  if (normalized.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(normalized.deadline)) {
    errors.push("Deadline must use the YYYY-MM-DD date format.");
  }

  return { isValid: errors.length === 0, errors, sanitized: normalized };
}

module.exports = {
  validateProjectRequirementsInput,
  cleanText,
  cleanList,
  categories,
  categorySpecificFieldKeys,
};
