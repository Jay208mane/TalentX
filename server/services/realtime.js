let io;

const normalizeRoomId = (value) => {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      const asString = value.toString();
      if (asString && asString !== "[object Object]") return asString;
    }
    if (value._id) return normalizeRoomId(value._id);
    if (value.id) return normalizeRoomId(value.id);
  }
  return String(value);
};

exports.setRealtimeServer = (server) => {
  io = server;
};

exports.notifyUser = (userId, event, payload) => {
  const roomId = normalizeRoomId(userId);
  if (io && roomId) io.to(`user:${roomId}`).emit(event, payload);
};

exports.notifyProject = (project, event, payload) => {
  if (!io || !project) return;

  const roomIds = new Set();
  const projectId = normalizeRoomId(project._id ?? project.id ?? project.projectId);
  if (projectId) roomIds.add(`project:${projectId}`);

  const clientId = normalizeRoomId(project.client);
  if (clientId) roomIds.add(`user:${clientId}`);

  const freelancerId = normalizeRoomId(project.freelancer);
  if (freelancerId) roomIds.add(`user:${freelancerId}`);

  for (const room of roomIds) {
    io.to(room).emit(event, payload);
  }
};
