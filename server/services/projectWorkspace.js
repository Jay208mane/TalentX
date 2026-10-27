const workspaceTypesByCategory = {
  "Web & Mobile Development": "web_development",
  "Software & Application Development": "web_development",
  "AI & Machine Learning": "ai_development",
  "Cybersecurity & Cloud": "cybersecurity",
  "Data Science & Analytics": "data_analytics",
  "UI/UX & Graphic Design": "design",
  "Digital Marketing & SEO": "marketing",
  "Content Writing & Documentation": "content_writing",
  "Academic & Research Support": "research",
};

function workspaceTypeForCategory(category) {
  return workspaceTypesByCategory[category] || "general_task";
}

module.exports = { workspaceTypesByCategory, workspaceTypeForCategory };
