const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { validateProjectRequirementsInput, categories } = require("./validators/projectRequirementsValidator");
const { generateProjectRequirements } = require("./services/ai/projectRequirementsService");
const Job = require("./models/job");
const ProjectRequirementDraft = require("./models/ProjectRequirementDraft");

const sampleInput = (category) => ({
  title: "Analyze monthly sales data",
  category,
  subcategory: "Custom project",
  concept: "Clean a supplied spreadsheet and summarize monthly sales trends.",
  projectType: "Small Task",
  experiencePreference: "Beginner-Friendly",
  complexity: "Basic",
  paymentPreference: "Negotiable",
  currency: "USD",
  skills: [],
  tools: [],
  deliverables: [],
  referenceLinks: [],
});

test("supports all requested categories with optional budget and skills", () => {
  assert.equal(categories.length, 12);
  const result = validateProjectRequirementsInput({
    ...sampleInput("Data Science & Analytics"),
    categoryDetails: {
      dataSources: "Client-provided monthly sales CSV",
      analysisQuestions: "Which products drive repeat purchases?",
      unapprovedField: "This must be discarded",
    },
  });
  assert.equal(result.isValid, true);
  assert.equal(result.sanitized.budgetMin, null);
  assert.equal(result.sanitized.budgetMax, null);
  assert.deepEqual(result.sanitized.skills, []);
  assert.equal(result.sanitized.paymentPreference, "Negotiable");
  assert.deepEqual(result.sanitized.categoryDetails, {
    dataSources: "Client-provided monthly sales CSV",
    fileFormats: "",
    cleaningRules: "",
    analysisQuestions: "Which products drive repeat purchases?",
    visualizations: "",
  });
});

test("rejects invalid categories, titles, and reversed budget ranges", () => {
  const result = validateProjectRequirementsInput({
    ...sampleInput("Unknown"),
    title: "x",
    budgetMin: "500",
    budgetMax: "100",
  });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("category")));
  assert.ok(result.errors.some((error) => error.includes("title")));
  assert.ok(result.errors.some((error) => error.includes("minimum")));
});

test("category-specific AI prompts generate editable guarded requirements", async () => {
  const originalFetch = global.fetch;
  const originalEnvironment = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    AI_BASE_URL: process.env.AI_BASE_URL,
  };
  const seenPrompts = [];
  process.env.AI_PROVIDER = "openai";
  process.env.AI_API_KEY = "unit-test-key";
  process.env.AI_MODEL = "unit-test-model";
  process.env.AI_BASE_URL = "https://ai.example.test/v1";
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    seenPrompts.push(request.messages.map((message) => message.content).join("\n"));
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              overview: "Analyze the client-supplied material and provide a reviewable result.",
              problemStatement: "The client needs a small, practical analysis task completed.",
              objectives: ["Return a clear and reproducible result."],
              scopeOfWork: "Use only the client-provided scope and data.",
              tasksAndMilestones: ["Review inputs", "Complete and validate the result"],
              requiredSkills: [],
              optionalSkills: ["Clear communication"],
              recommendedTools: [],
              deliverables: ["Editable project output"],
              functionalRequirements: [],
              nonFunctionalRequirements: [],
              testingAcceptanceCriteria: ["Client can review the output against the supplied requirements."],
              estimatedTimeline: "Discuss and agree with the client.",
              assumptions: [],
              dependencies: [],
              openQuestions: ["What format should the final output use?"],
            }),
          },
        }],
      }),
    };
  };

  try {
    const categoriesToExercise = [
      ["Web & Mobile Development", "user roles", { pagesRolesFeatures: "Customer and admin pages" }],
      ["AI & Machine Learning", "expected outputs", { expectedOutputs: "JSON summaries" }],
      ["Cybersecurity & Cloud", "written authorization", { authorizedAssets: "Client-owned staging app" }],
      ["Data Science & Analytics", "file formats", { dataSources: "Client CSV files" }],
    ];
    for (const [category, expectedQuestion, categoryDetails] of categoriesToExercise) {
      const validation = validateProjectRequirementsInput({ ...sampleInput(category), categoryDetails });
      assert.equal(validation.isValid, true);
      const output = await generateProjectRequirements(validation.sanitized);
      assert.equal(output.category, category);
      assert.equal(output.projectTitle, validation.sanitized.title);
      assert.ok(Array.isArray(output.tasksAndMilestones));
      assert.ok(output.openQuestions.some((question) => question.includes(expectedQuestion)));
      assert.ok(output.assumptions.every((assumption) => assumption.startsWith("Assumption:")));
    }
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  assert.ok(seenPrompts[0].includes("pages, user roles, features"));
  assert.ok(seenPrompts[1].includes("inputs, expected outputs"));
  assert.ok(seenPrompts[2].includes("written authorization"));
  assert.ok(seenPrompts[3].includes("data sources and formats"));
  assert.ok(seenPrompts[0].includes("Customer and admin pages"));
  assert.ok(seenPrompts[1].includes("JSON summaries"));
  assert.ok(seenPrompts[2].includes("Client-owned staging app"));
  assert.ok(seenPrompts[3].includes("Client CSV files"));
});

test("published project schema accepts negotiable terms and optional budget/skills", async () => {
  const job = new Job({
    title: "Clean a sales spreadsheet",
    description: "Clean a supplied spreadsheet and summarize its monthly sales trends.",
    category: "Data Science & Analytics",
    skills: [],
    budgetType: "negotiable",
    budget: null,
    client: new mongoose.Types.ObjectId(),
    requirements: {
      paymentPreference: "Negotiable",
      generated: { objectives: ["Clean and summarize supplied data."] },
    },
  });
  await job.validate();

  const draft = new ProjectRequirementDraft({
    client: new mongoose.Types.ObjectId(),
    form: sampleInput("Data Science & Analytics"),
  });
  await draft.validate();
});
