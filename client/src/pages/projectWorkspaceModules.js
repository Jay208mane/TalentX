export const workspaceModules = {
  web_development: {
    type: "web_development",
    title: "Web and mobile development",
    description: "Track implementation, testing, repository work, and a client-facing website preview.",
    showGitHub: true,
    showWebsitePreview: true,
    sections: ["Pages, roles, and features", "Integrations and database", "Responsive behavior and deployment"],
    fields: ["pagesRolesFeatures", "integrationsDatabase", "responsiveDeployment"],
  },
  data_analytics: {
    type: "data_analytics",
    title: "Data analysis workspace",
    description: "Keep client datasets private, review spreadsheet inputs, and deliver reproducible analysis outputs.",
    sections: ["Data sources and formats", "Cleaning and validation", "Analysis questions and KPIs", "Visualizations and report outputs"],
    fields: ["dataSources", "fileFormats", "cleaningRules", "analysisQuestions", "visualizations"],
    stages: ["Requirements clarification", "Dataset received", "Data validation", "Analysis in progress", "Visualization and reporting", "Submitted for review"],
  },
  ai_development: {
    type: "ai_development",
    title: "AI and machine learning workspace",
    description: "Track input data, expected outputs, evaluation criteria, experiments, and reviewable deliverables.",
    sections: ["Inputs and permitted data sources", "Expected outputs", "Evaluation criteria", "Data, privacy, and human review"],
    fields: ["inputData", "expectedOutputs", "evaluationCriteria", "dataRequirements"],
  },
  cybersecurity: {
    type: "cybersecurity",
    title: "Cybersecurity and cloud workspace",
    description: "Keep written authorization, asset scope, exclusions, test windows, findings, and remediation visible to participants.",
    sections: ["Authorized assets and written permission", "Scope boundaries and exclusions", "Approved testing window and methods", "Cloud environment and ownership"],
    fields: ["authorizedAssets", "scopeExclusions", "testWindow", "cloudEnvironment"],
    warning: "Security work must stay within client-owned or explicitly authorized assets and the written scope. Never test out-of-scope systems.",
  },
  design: {
    type: "design",
    title: "Design workspace",
    description: "Organize the brief, users, screens, brand constraints, source files, exports, and client approvals.",
    sections: ["Target users and journeys", "Screens and states", "Brand and accessibility", "Source files and export formats"],
    fields: ["targetUsers", "screensStates", "brandAccessibility", "sourceExports"],
  },
  content_writing: {
    type: "content_writing",
    title: "Content and documentation workspace",
    description: "Track audience, source materials, citations, tone, outline, drafts, and revision feedback.",
    sections: ["Audience and purpose", "Source materials and citations", "Length, tone, and format"],
    fields: ["audiencePurpose", "sourcesCitations", "lengthToneFormat"],
  },
  marketing: {
    type: "marketing",
    title: "Marketing and SEO workspace",
    description: "Organize objectives, audience, channels, KPIs, analytics files, and reporting deliverables.",
    sections: ["Target audience and channels", "Campaign goals and KPIs", "Analytics access and reporting"],
    fields: ["audienceChannels", "campaignGoals", "analyticsAccess"],
  },
  research: {
    type: "research",
    title: "Research workspace",
    description: "Keep client-provided materials, methods, citations, visualizations, and integrity requirements together.",
    sections: ["Research materials and methods", "Citation and formatting style", "Reproducibility and integrity"],
    fields: ["researchMaterials", "citationFormat", "integrityReview"],
    warning: "Academic work must follow integrity rules. Do not request plagiarism, fabricated findings, or impersonation.",
  },
  general_task: {
    type: "general_task",
    title: "General project workspace",
    description: "Use the shared task board, milestones, private reference files, deliverables, feedback, timeline, and chat.",
    sections: ["Domain-specific details", "Constraints and dependencies"],
    fields: ["customDomain", "customConstraints"],
  },
};

export function workspaceTypeForProject(project) {
  if (workspaceModules[project?.workspaceType]) return project.workspaceType;
  const category = project?.category || "";
  if (category.includes("Data Science")) return "data_analytics";
  if (category.includes("AI & Machine")) return "ai_development";
  if (category.includes("Cybersecurity")) return "cybersecurity";
  if (category.includes("Design")) return "design";
  if (category.includes("Content Writing")) return "content_writing";
  if (category.includes("Marketing")) return "marketing";
  if (category.includes("Research")) return "research";
  if (category.includes("Development") || category.includes("Software")) return "web_development";
  return "general_task";
}

export function workspaceForProject(project) {
  return workspaceModules[workspaceTypeForProject(project)];
}
