exports.Roles = Object.freeze({
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  PM: "PM",
  LEAD: "LEAD",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
});

exports.Scopes = Object.freeze({
  SYSTEM: "SYSTEM",
  PROJECT: "PROJECT",
  PERSONAL: "PERSONAL",
});

exports.Resources = Object.freeze({
  USER: "USER",
  PROJECT: "PROJECT",
  TASK: "TASK",
  ROLE: "ROLE",
  PERMISSION: "PERMISSION",
  RBAC: "RBAC",
  DEPARTMENT: "DEPARTMENT",
  TEAM: "TEAM",
  BOARD: "BOARD",
  COLUMN: "COLUMN",
  COMMENT: "COMMENT",
  ATTACHMENT: "ATTACHMENT",
  LABEL: "LABEL",
});

exports.Actions = Object.freeze({
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  MANAGE_MEMBERS: "MANAGE_MEMBERS",
});
