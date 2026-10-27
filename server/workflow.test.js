const { test } = require("node:test");
const assert = require("node:assert/strict");
const Proposal = require("./models/proposal");
const Job = require("./models/job");
const Project = require("./models/Project");
const Payment = require("./models/Payment");
const PaymentPreference = require("./models/PaymentPreference");
const projectController = require("./controllers/projectController");
const proposalController = require("./controllers/proposalController");
const paymentData = require("./services/paymentData");
const { setRealtimeServer, notifyProject } = require("./services/realtime");

const ids = {
  client: "64b000000000000000000001",
  freelancer: "64b000000000000000000002",
  stranger: "64b000000000000000000003",
  job: "64b000000000000000000004",
  proposal: "64b000000000000000000005",
  project: "64b000000000000000000006",
};

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function mockMethod(t, model, method, replacement) {
  const original = model[method];
  model[method] = replacement;
  t.after(() => {
    model[method] = original;
  });
}

test("accepting an owned pending proposal creates one project and rejects other pending proposals", async (t) => {
  const proposal = {
    _id: ids.proposal,
    job: ids.job,
    client: ids.client,
    freelancer: ids.freelancer,
    bidAmount: 725,
    status: "pending",
    project: null,
  };
  const createdProject = { _id: ids.project };
  let projectInput;
  let rejectedOtherPending = false;

  mockMethod(t, Proposal, "findById", async () => proposal);
  mockMethod(t, Job, "findOneAndUpdate", async (filter) => {
    assert.equal(filter.client, ids.client);
    assert.equal(filter.status, "open");
    return {
      _id: ids.job,
      title: "Build a marketplace",
      description: "Build and deliver the requested marketplace work.",
      deadline: null,
    };
  });
  mockMethod(t, Project, "create", async (input) => {
    projectInput = input;
    return createdProject;
  });
  mockMethod(t, Proposal, "findOneAndUpdate", async () => ({
    ...proposal,
    status: "accepted",
    project: ids.project,
  }));
  mockMethod(t, Proposal, "updateMany", async () => {
    rejectedOtherPending = true;
  });

  const res = response();
  await proposalController.reviewProposal(
    {
      params: { proposalId: ids.proposal },
      body: { decision: "accept" },
      user: { _id: ids.client, name: "Client" },
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(projectInput.job, ids.job);
  assert.equal(projectInput.client, ids.client);
  assert.equal(projectInput.freelancer, ids.freelancer);
  assert.equal(projectInput.agreedAmount, 725);
  assert.equal(rejectedOtherPending, true);
  assert.equal(res.body.project, createdProject);
});

test("a non-owner cannot read a project", async (t) => {
  const project = {
    _id: ids.project,
    client: ids.client,
    freelancer: ids.freelancer,
  };
  const query = {
    populate() { return this; },
    lean: async () => project,
  };
  mockMethod(t, Project, "findById", () => query);
  let paymentRead = false;
  mockMethod(t, Payment, "findOne", () => {
    paymentRead = true;
    throw new Error("Payment data should not be accessed for a non-member.");
  });

  const res = response();
  await projectController.getProject(
    {
      params: { projectId: ids.project },
      user: { _id: ids.stranger },
    },
    res
  );

  assert.equal(res.statusCode, 403);
  assert.equal(paymentRead, false);
});

test("both populated project participants can open the same workspace", async (t) => {
  const project = {
    _id: ids.project,
    client: { _id: ids.client, name: "Client" },
    freelancer: { _id: ids.freelancer, name: "Freelancer" },
    status: "In Progress",
    approvalStatus: "not_submitted",
  };
  const query = {
    populate() { return this; },
    lean: async () => project,
  };
  mockMethod(t, Project, "findById", () => query);
  mockMethod(t, Payment, "findOne", async () => null);

  for (const userId of [ids.client, ids.freelancer]) {
    const res = response();
    await projectController.getProject(
      { params: { projectId: ids.project }, user: { _id: userId, role: userId === ids.client ? "client" : "freelancer" } },
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.project._id, ids.project);
  }
});

test("administrators can inspect a project but open listings are not readable by unrelated users", async (t) => {
  const project = {
    _id: ids.project,
    client: { _id: ids.client, name: "Client" },
    freelancer: null,
    status: "Open",
    approvalStatus: "not_submitted",
  };
  const query = {
    populate() { return this; },
    lean: async () => project,
  };
  mockMethod(t, Project, "findById", () => query);
  mockMethod(t, Payment, "findOne", async () => null);

  const adminResponse = response();
  await projectController.getProject(
    { params: { projectId: ids.project }, user: { _id: ids.stranger, role: "admin" } },
    adminResponse
  );
  assert.equal(adminResponse.statusCode, 200);

  const strangerResponse = response();
  await projectController.getProject(
    { params: { projectId: ids.project }, user: { _id: ids.stranger, role: "freelancer" } },
    strangerResponse
  );
  assert.equal(strangerResponse.statusCode, 403);
});

test("an uncommitted approval cannot expose a payment record", async (t) => {
  const project = {
    _id: ids.project,
    client: ids.client,
    freelancer: ids.freelancer,
    approvalStatus: "pending",
  };
  const query = {
    populate() { return this; },
    lean: async () => project,
  };
  mockMethod(t, Project, "findById", () => query);
  let paymentRead = false;
  mockMethod(t, Payment, "findOne", () => {
    paymentRead = true;
    throw new Error("Payment data must not be exposed before approval.");
  });

  const res = response();
  await projectController.getProject(
    {
      params: { projectId: ids.project },
      user: { _id: ids.client },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.payment, null);
  assert.equal(paymentRead, false);
});

test("only the assigned freelancer can update progress", async (t) => {
  mockMethod(t, Project, "findById", async () => ({
    _id: ids.project,
    freelancer: ids.freelancer,
    client: ids.client,
  }));
  const res = response();
  await projectController.postProgressUpdate(
    {
      params: { projectId: ids.project },
      user: { _id: ids.stranger },
      body: {
        completed: "Completed the first draft",
        completionPercentage: 25,
        deliverableLinks: [],
      },
    },
    res
  );

  assert.equal(res.statusCode, 403);
});

test("only the project client can access payment instructions", async (t) => {
  mockMethod(t, Project, "findById", async () => ({
    _id: ids.project,
    client: ids.client,
    freelancer: ids.freelancer,
  }));
  let paymentRead = false;
  mockMethod(t, Payment, "findOne", () => {
    paymentRead = true;
    throw new Error("Payment data should not be accessed for a non-client.");
  });
  const res = response();
  await projectController.getPaymentInstructions(
    {
      params: { projectId: ids.project },
      user: { _id: ids.stranger },
    },
    res
  );

  assert.equal(res.statusCode, 403);
  assert.equal(paymentRead, false);
});

test("approval creates the payment before persisting approval so failed payment writes can be retried", async (t) => {
  let projectSaved = false;
  mockMethod(t, Project, "findById", async () => ({
    _id: ids.project,
    client: ids.client,
    freelancer: ids.freelancer,
    status: "In Review",
    approvalStatus: "pending",
    finalSubmission: {},
    activity: [],
    save: async () => { projectSaved = true; },
  }));
  mockMethod(t, PaymentPreference, "findOne", () => ({
    select: async () => ({ method: "upi" }),
  }));
  mockMethod(t, Payment, "findOneAndUpdate", () => ({
    select: () => Promise.reject(new Error("Simulated database write failure.")),
  }));

  const res = response();
  await projectController.reviewFinalWork(
    {
      params: { projectId: ids.project },
      body: { action: "approve", comment: "" },
      user: { _id: ids.client },
    },
    res
  );

  assert.equal(res.statusCode, 500);
  assert.equal(projectSaved, false);
});

test("chat history is restricted to project participants", async (t) => {
  const query = {
    select: async () => ({
      _id: ids.project,
      client: ids.client,
      freelancer: ids.freelancer,
    }),
  };
  mockMethod(t, Project, "findById", () => query);
  const res = response();
  await projectController.getChatHistory(
    {
      params: { projectId: ids.project },
      user: { _id: ids.stranger },
    },
    res
  );

  assert.equal(res.statusCode, 403);
});

test("payment instructions encrypt and decrypt with the configured 32-byte key", () => {
  const previousKey = process.env.PAYMENT_DATA_ENCRYPTION_KEY;
  process.env.PAYMENT_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const details = { accountName: "Test Beneficiary", accountNumber: "1234567890", ifsc: "ABCD0123456" };
    const encrypted = paymentData.encryptPaymentDetails(details);
    assert.equal(encrypted.encryptedDetails.includes(details.accountNumber), false);
    assert.deepEqual(
      paymentData.decryptPaymentDetails(encrypted),
      details
    );
  } finally {
    if (previousKey === undefined) delete process.env.PAYMENT_DATA_ENCRYPTION_KEY;
    else process.env.PAYMENT_DATA_ENCRYPTION_KEY = previousKey;
  }
});

test("a job and a project/payment each have uniqueness constraints", () => {
  const projectIndexes = Project.schema.indexes();
  const paymentIndexes = Payment.schema.indexes();
  assert.ok(projectIndexes.some(([keys, options]) => keys.job === 1 && options.unique));
  assert.ok(paymentIndexes.some(([keys, options]) => keys.project === 1 && options.unique));
});

test("project notifications normalize ids and emit to project room", () => {
  const seen = [];
  const fakeIo = {
    to(room) {
      return {
        emit(event, payload) {
          seen.push({ room, event, payload });
        },
      };
    },
  };

  setRealtimeServer(fakeIo);

  const project = {
    _id: "64b000000000000000000006",
    client: { _id: "64b000000000000000000001" },
    freelancer: "64b000000000000000000002",
  };

  notifyProject(project, "project:updated", { projectId: project._id, status: "In Progress" });

  assert.ok(seen.some(({ room }) => room === "project:64b000000000000000000006"));
  assert.ok(seen.some(({ room }) => room === "user:64b000000000000000000001"));
  assert.ok(seen.some(({ room }) => room === "user:64b000000000000000000002"));
  assert.ok(seen.every(({ room }) => !room.includes("[object Object]")));
});
