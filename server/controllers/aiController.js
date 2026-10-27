const { validateJobDescriptionInput } = require("../validators/aiValidator");
const {
  generateJobDescription,
  AiConfigurationError,
  AiProviderError,
} = require("../services/ai/jobDescriptionService");
const { enhanceProfile } = require("../services/ai/profileEnhancerService");
const { validateProjectRequirementsInput } = require("../validators/projectRequirementsValidator");
const { generateProjectRequirements } = require("../services/ai/projectRequirementsService");

exports.generateProjectRequirementsController = async (req, res) => {
  try {
    const validation = validateProjectRequirementsInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Review the project details and try again.",
        errors: validation.errors,
      });
    }
    const result = await generateProjectRequirements(validation.sanitized);
    return res.status(200).json({
      success: true,
      message: "Project requirements generated successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AiConfigurationError || error instanceof AiProviderError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    console.error("Project requirements generation failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to generate project requirements right now.",
    });
  }
};

/**
 * POST /api/ai/generate-job-description
 * Protected: Client role only
 */
exports.generateJobDescriptionController = async (req, res) => {
  try {
    // 1. Double check client role authorization
    if (req.user?.role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only client accounts are authorized to use the AI Job Description Generator.",
      });
    }

    // 2. Validate & sanitize incoming request body
    const validation = validateJobDescriptionInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors,
      });
    }

    // 3. Invoke dedicated GenAI service
    const result = await generateJobDescription(validation.sanitized);

    return res.status(200).json({
      success: true,
      message: "Job description generated successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        tip: "Please configure AI_API_KEY in server/.env to enable live AI generation.",
      });
    }

    if (error instanceof AiProviderError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    console.error("AI Generation unexpected error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate job description right now. Please try again later.",
    });
  }
};

/**
 * POST /api/ai/enhance-profile
 * Protected: Authenticated users (freelancers, clients)
 */
exports.enhanceProfileController = async (req, res) => {
  try {
    const {
      name,
      currentTitle,
      currentBio,
      skills,
      experienceLevel,
      hourlyRate,
      targetFocus,
      tone,
    } = req.body;

    const profileData = {
      name: name || req.user?.name || "Freelancer",
      currentTitle: currentTitle || req.user?.title || "",
      currentBio: currentBio || req.user?.bio || "",
      skills: Array.isArray(skills) ? skills : (req.user?.skills || []),
      experienceLevel: experienceLevel || req.user?.experienceLevel || "intermediate",
      hourlyRate: hourlyRate || req.user?.hourlyRate || 35,
      targetFocus: targetFocus || "",
      tone: tone || "professional",
    };

    const enhancement = await enhanceProfile(profileData);

    return res.status(200).json({
      success: true,
      message: "Profile enhancement generated successfully.",
      data: enhancement,
    });
  } catch (error) {
    console.error("AI Profile Enhancement error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to enhance profile right now. Please try again.",
    });
  }
};
