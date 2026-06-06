import { useMemo } from "react";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { useRolesDictionary } from "./useRbacQueries";

const normalizeRoleName = (value?: string | null) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getRoleId = (value: any) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

export const useRoleAccess = () => {
  const { user } = useAuthStore();
  const { data: roles = [], isLoading } = useRolesDictionary();

  const rolesById = useMemo(() => {
    const map: Record<string, string> = {};

    roles.forEach((role: any) => {
      const roleId = getRoleId(role);

      if (roleId) {
        map[roleId] = normalizeRoleName(role.name);
      }
    });

    return map;
  }, [roles]);

  const currentRoleName = useMemo(() => {
    if (!user) return "GUEST";

    const rawRoleName =
      user.system_role ||
      user.systemRole ||
      user.role_name ||
      user.roleName ||
      user.role;

    if (rawRoleName) {
      return normalizeRoleName(rawRoleName);
    }

    if (typeof user.role_id === "object" && user.role_id?.name) {
      return normalizeRoleName(user.role_id.name);
    }

    const roleId = getRoleId(user.role_id);

    if (roleId && rolesById[roleId]) {
      return rolesById[roleId];
    }

    return "MEMBER";
  }, [user, rolesById]);

  const hasRoleNameReady = Boolean(
    user?.system_role ||
    user?.systemRole ||
    user?.role_name ||
    user?.roleName ||
    user?.role ||
    (typeof user?.role_id === "object" && user.role_id?.name) ||
    rolesById[getRoleId(user?.role_id)],
  );

  const isLoadingRoles = isLoading && !hasRoleNameReady;

  const hasAccess = (allowedRoles: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (isLoadingRoles) {
      return false;
    }

    const normalizedAllowedRoles = allowedRoles.map(normalizeRoleName);

    return normalizedAllowedRoles.includes(currentRoleName);
  };

  const isSystemAdmin = currentRoleName === "SYSTEM_ADMIN";

  return {
    currentRoleName,
    hasAccess,
    isLoadingRoles,
    isSystemAdmin,
  };
};
