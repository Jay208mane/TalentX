const crypto = require("crypto");

class GitHubIntegrationError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "GitHubIntegrationError";
    this.statusCode = statusCode;
  }
}

function getEncryptionKey() {
  const configured = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  const key = configured ? Buffer.from(configured, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    throw new GitHubIntegrationError("GitHub token encryption is not configured. Set a base64-encoded 32-byte GITHUB_TOKEN_ENCRYPTION_KEY.", 503);
  }
  return key;
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encryptedToken = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    encryptedToken: encryptedToken.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptToken(connection) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(connection.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(connection.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(connection.encryptedToken, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function githubRequest(url, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "TalentX-Project-Workspace",
      },
      signal: controller.signal,
    });
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
      throw new GitHubIntegrationError("GitHub API rate limit reached. Try again after the reset time.", 429);
    }
    if (response.status === 404) {
      throw new GitHubIntegrationError("Repository not found or the GitHub token does not have access.", 404);
    }
    if (response.status === 401 || response.status === 403) {
      throw new GitHubIntegrationError("GitHub rejected this token or its repository permissions.", 403);
    }
    if (!response.ok) {
      throw new GitHubIntegrationError("GitHub is temporarily unable to provide repository data.", 502);
    }
    return response.json();
  } catch (error) {
    if (error instanceof GitHubIntegrationError) throw error;
    if (error.name === "AbortError") {
      throw new GitHubIntegrationError("GitHub did not respond before the request timed out.", 504);
    }
    throw new GitHubIntegrationError("Unable to reach GitHub right now.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { GitHubIntegrationError, encryptToken, decryptToken, githubRequest };
