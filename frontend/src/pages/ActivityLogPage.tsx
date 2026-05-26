import React, {
  useEffect,
  startTransition,
  useMemo,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Clock,
  RefreshCw,
  Loader2,
  Users,
  ShieldCheck,
  Search,
  ShieldAlert,
  MonitorSmartphone,
  KeyRound,
  UserCog,
  Circle,
} from 'lucide-react';

import { useActivityFilters } from '../features/activity/hooks/useActivityFilters';
import { useInfiniteAdminLogs } from '../features/activity/api/useInfiniteAdminLogs';
import { activityApi } from '../features/activity/api/activityApi';
import { useUserStore } from '../features/user/store/useUserStore';
import { useRolesDictionary } from '../features/rbac/hooks/useRbacQueries';
import ActivityFilterBar from '../features/activity/components/ActivityFilterBar';

type AdminActivityTab = 'activity' | 'accounts' | 'security';

const ACTIVITY_TABS: Array<{
  key: AdminActivityTab;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    key: 'activity',
    label: 'Nhật ký hoạt động',
    description: 'Theo dõi toàn bộ thao tác nghiệp vụ trong hệ thống.',
    icon: Activity,
  },
  {
    key: 'accounts',
    label: 'Quản lý tài khoản',
    description: 'Xem trạng thái hoạt động và thông tin role của tất cả tài khoản.',
    icon: Users,
  },
  {
    key: 'security',
    label: 'Bảo mật hệ thống',
    description: 'Theo dõi các sự kiện bảo mật như tạo tài khoản và đổi mật khẩu.',
    icon: ShieldCheck,
  },
];

const SOURCE_TYPE_STYLES: Record<string, string> = {
  PROJECT:
    'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/80',
  BOARD:
    'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200/80',
  TASK:
    'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200/80',
  USER:
    'bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200/80',
  SYSTEM:
    'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200/80',
  SECURITY:
    'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border-violet-200/80',
};

const ROLE_STYLES: Record<string, string> = {
  SYSTEM_ADMIN:
    'bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200',
  ADMIN:
    'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border-violet-200',
  MANAGER:
    'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-200',
  MEMBER:
    'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-200',
  USER:
    'bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200',
  UNKNOWN_ROLE:
    'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 border-slate-200',
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'text-emerald-600 font-semibold',
  UPDATE: 'text-amber-600 font-semibold',
  DELETE: 'text-rose-600 font-semibold',
  MOVE: 'text-indigo-600 font-semibold',
  ADD_MEMBER: 'text-sky-600 font-semibold',
  UPDATE_MEMBER: 'text-violet-600 font-semibold',
  REMOVE_MEMBER: 'text-rose-600 font-semibold',
  CHANGE_PASSWORD: 'text-orange-600 font-semibold',
  CREATE_USER: 'text-emerald-600 font-semibold',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'TẠO MỚI',
  UPDATE: 'CẬP NHẬT',
  DELETE: 'XÓA',
  MOVE: 'DI CHUYỂN',
  ADD_MEMBER: 'THÊM THÀNH VIÊN',
  UPDATE_MEMBER: 'CẬP NHẬT THÀNH VIÊN',
  REMOVE_MEMBER: 'XÓA THÀNH VIÊN',
  CHANGE_PASSWORD: 'ĐỔI MẬT KHẨU',
  CREATE_USER: 'TẠO TÀI KHOẢN',
};

const normalizeRoleName = (value?: string | null) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};

const getId = (value: any) => {
  if (!value) return '';

  if (typeof value === 'object') {
    return String(value._id || value.id || value.user_id || '');
  }

  return String(value);
};

const getInitial = (name?: string | null) => {
  return String(name || 'S')
    .trim()
    .charAt(0)
    .toUpperCase();
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return 'Không rõ thời gian';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ thời gian';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'Không rõ thời gian';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ thời gian';
  }

  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const extractList = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  return [];
};

const ActivityLogSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-slate-200 rounded-xl" />
    <div className="h-12 bg-slate-200 rounded-xl" />

    {[...Array(4)].map((_, index) => (
      <div
        key={index}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />

          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
              <div className="h-4 w-16 bg-slate-200 rounded-md" />
            </div>

            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-3 w-1/4 bg-slate-200 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
    <div className="p-5 bg-indigo-50 rounded-full mb-5">
      <Icon size={56} className="text-indigo-400" />
    </div>

    <h3 className="text-xl font-bold text-slate-800 mb-2">
      {title}
    </h3>

    <p className="text-slate-500 text-sm max-w-md">
      {description}
    </p>
  </div>
);

const ActivityLogPage = () => {
  const [activeTab, setActiveTab] = useState<AdminActivityTab>('activity');
  const [accountSearch, setAccountSearch] = useState('');

  const [filters] = useActivityFilters();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteAdminLogs(filters);

  const {
    userDictionary,
    fetchAllSystemUsers,
    isLoading: isUsersLoading,
  } = useUserStore() as any;

  const { data: roles = [] } = useRolesDictionary();

  const {
    data: securityLogPayload,
    isLoading: isSecurityLoading,
    isFetching: isSecurityFetching,
    isError: isSecurityError,
    refetch: refetchSecurityLogs,
  } = useQuery({
    queryKey: ['activity', 'security-logs', 'system'],
    queryFn: () => activityApi.getSystemSecurityLogs(0, 100),
    enabled: activeTab === 'security',
  });

  const rolesById = useMemo(() => {
    const map: Record<string, string> = {};

    roles.forEach((role: any) => {
      const roleId = getId(role);

      if (roleId) {
        map[roleId] = normalizeRoleName(role.name);
      }
    });

    return map;
  }, [roles]);

  const getRoleName = (value: any) => {
    if (!value) return 'UNKNOWN_ROLE';

    const directRole =
      value.role_name ||
      value.system_role ||
      value.role ||
      value.roleCode ||
      value.role_code ||
      value.roleName;

    if (typeof directRole === 'string' && directRole.trim()) {
      return normalizeRoleName(directRole);
    }

    if (typeof value.role_id === 'object' && value.role_id?.name) {
      return normalizeRoleName(value.role_id.name);
    }

    const roleId = getId(value.role_id);

    if (roleId && rolesById[roleId]) {
      return rolesById[roleId];
    }

    if (Array.isArray(value.system_role_ids) && value.system_role_ids.length > 0) {
      const firstRoleId = getId(value.system_role_ids[0]);

      if (firstRoleId && rolesById[firstRoleId]) {
        return rolesById[firstRoleId];
      }
    }

    return 'UNKNOWN_ROLE';
  };

  const getActorRoleName = (log: any) => {
    const actor = log?.actor || {};
    const actorId = getId(actor.user_id || actor.id || actor._id);
    const cachedUser = actorId ? userDictionary?.[actorId] : null;

    return getRoleName({
      ...cachedUser,
      ...actor,
    });
  };

  const formatMessage = (message?: string) => {
    if (!message) return '';

    const objectIdRegex = /[0-9a-fA-F]{24}/g;

    return message.replace(objectIdRegex, (match) => {
      return userDictionary?.[match]?.full_name || match;
    });
  };

  const accountUsers = useMemo<any[]>(() => {
    return Object.values(userDictionary || {});
  }, [userDictionary]);

  const filteredAccountUsers = useMemo(() => {
    const keyword = accountSearch.trim().toLowerCase();

    if (!keyword) return accountUsers;

    return accountUsers.filter((user: any) => {
      const roleName = getRoleName(user).toLowerCase();

      return (
        String(user.full_name || user.fullName || user.name || '')
          .toLowerCase()
          .includes(keyword) ||
        String(user.email || '').toLowerCase().includes(keyword) ||
        roleName.includes(keyword)
      );
    });
  }, [accountSearch, accountUsers, rolesById]);

  const securityLogs = useMemo(() => {
    return extractList(securityLogPayload);
  }, [securityLogPayload]);

  const activityPagesEmpty =
    !data ||
    !data.pages ||
    data.pages.every((page) => extractList(page).length === 0);

  useEffect(() => {
    startTransition(() => {
      fetchAllSystemUsers();
    });
  }, [fetchAllSystemUsers]);

  const renderRoleBadge = (roleName: string) => {
    const normalized = normalizeRoleName(roleName) || 'UNKNOWN_ROLE';
    const style = ROLE_STYLES[normalized] || ROLE_STYLES.UNKNOWN_ROLE;

    return (
      <span
        className={`text-[11px] font-black px-2.5 py-1 rounded-lg border tracking-wide uppercase shadow-sm ${style}`}
      >
        {normalized}
      </span>
    );
  };

  const renderAvatar = ({
    avatarUrl,
    name,
    sizeClass = 'w-10 h-10',
  }: {
    avatarUrl?: string | null;
    name?: string | null;
    sizeClass?: string;
  }) => {
    return (
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            loading="lazy"
            src={avatarUrl}
            alt={name || 'User'}
            className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow-sm`}
            onError={(event: any) => {
              event.currentTarget.style.display = 'none';

              const fallback = event.currentTarget.nextSibling;

              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div
          className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm`}
          style={{
            display: avatarUrl ? 'none' : 'flex',
          }}
        >
          {getInitial(name)}
        </div>
      </div>
    );
  };

  const renderActivityTab = () => {
    if (isLoading) {
      return <ActivityLogSkeleton />;
    }

    if (activityPagesEmpty) {
      return (
        <EmptyState
          icon={Activity}
          title="Không có bản ghi nào"
          description="Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại."
        />
      );
    }

    return (
      <div className="space-y-4">
        {data?.pages?.map((page, pageIndex) => {
          const logs = extractList(page);

          return (
            <React.Fragment key={`page-${pageIndex}`}>
              {logs.map((log: any, logIndex: number) => {
                const sourceType = String(log?.source_type || log?.source || 'UNKNOWN').toUpperCase();
                const sourceStyle =
                  SOURCE_TYPE_STYLES[sourceType] ||
                  'bg-slate-100 text-slate-700 border-slate-200/80';

                const action = String(log?.action || 'LOG').toUpperCase();
                const actionStyle =
                  ACTION_STYLES[action] ||
                  'text-slate-600 font-medium';

                const logId =
                  log?.id ||
                  log?._id ||
                  `fallback-${pageIndex}-${logIndex}`;

                const actorName =
                  log?.actor?.full_name ||
                  log?.actor?.fullName ||
                  log?.actor?.name ||
                  'Hệ thống';

                const actorRoleName = getActorRoleName(log);

                return (
                  <div
                    key={logId}
                    className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:shadow-indigo-100/20 hover:border-indigo-300 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {renderAvatar({
                          avatarUrl: log?.actor?.avatar_url,
                          name: actorName,
                        })}

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-slate-800 text-sm">
                              {actorName}
                            </span>

                            {renderRoleBadge(actorRoleName)}

                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase shadow-sm ${sourceStyle}`}
                            >
                              {sourceType}
                            </span>

                            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                              <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                              {getRelativeTime(log?.created_at)}
                            </span>
                          </div>

                          <p className="text-slate-700 text-sm leading-relaxed break-words bg-slate-50/80 p-2 rounded-lg">
                            <span
                              className={`text-xs uppercase mr-1 tracking-wider ${actionStyle}`}
                            >
                              [{ACTION_LABELS[action] || action}]
                            </span>{' '}
                            {formatMessage(log?.message)}
                          </p>

                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(log?.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {hasNextPage && (
          <div className="flex justify-center mt-8 pt-2">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:from-slate-400 disabled:to-slate-500 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:shadow-none"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải thêm...</span>
                </>
              ) : (
                <>
                  <span>Xem thêm hoạt động cũ</span>
                  <RefreshCw className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAccountTab = () => {
    return (
      <div className="space-y-5">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <UserCog size={20} className="text-indigo-600" />
                Quản lý tài khoản
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Theo dõi role và trạng thái online/offline của toàn bộ tài khoản trong hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full lg:w-72">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                  placeholder="Tìm theo tên, email, role..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchAllSystemUsers()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition active:scale-95"
              >
                <RefreshCw size={15} />
                Tải lại
              </button>
            </div>
          </div>
        </div>

        {isUsersLoading ? (
          <ActivityLogSkeleton />
        ) : filteredAccountUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Không có tài khoản nào"
            description="Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAccountUsers.map((user: any) => {
              const userId = getId(user);
              const fullName =
                user.full_name ||
                user.fullName ||
                user.name ||
                'Người dùng';

              const roleName = getRoleName(user);

              const isOnline =
                user.is_online === true ||
                user.isOnline === true ||
                user.online === true ||
                String(user.session_status || '').toUpperCase() === 'ONLINE';

              const lastActivity =
                user.last_activity ||
                user.lastActivity ||
                user.last_seen_at ||
                user.updated_at ||
                user.created_at;

              return (
                <div
                  key={userId || user.email}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5"
                >
                  <div className="flex items-start gap-4">
                    {renderAvatar({
                      avatarUrl: user.avatar_url || user.avatarUrl,
                      name: fullName,
                      sizeClass: 'w-12 h-12',
                    })}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-800 truncate">
                          {fullName}
                        </h3>

                        {renderRoleBadge(roleName)}
                      </div>

                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {user.email || 'Chưa có email'}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          <Circle
                            size={9}
                            className={isOnline ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-400 text-slate-400'}
                          />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 text-xs font-bold">
                          <MonitorSmartphone size={13} />
                          Hoạt động gần nhất: {formatDateTime(lastActivity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSecurityTab = () => {
    return (
      <div className="space-y-5">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShieldAlert size={20} className="text-rose-600" />
                Bảo mật hệ thống
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Ghi nhận các sự kiện bảo mật như SYSTEM_ADMIN tạo tài khoản và người dùng đổi mật khẩu.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetchSecurityLogs()}
              disabled={isSecurityFetching}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition active:scale-95 disabled:opacity-60"
            >
              {isSecurityFetching ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Tải lại
            </button>
          </div>
        </div>

        {isSecurityLoading ? (
          <ActivityLogSkeleton />
        ) : isSecurityError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
            Không thể tải nhật ký bảo mật hệ thống. Backend cần có endpoint{' '}
            <span className="font-black">GET /api/v1/activities/security</span>.
          </div>
        ) : securityLogs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Chưa có nhật ký bảo mật"
            description="Hệ thống chưa ghi nhận sự kiện tạo tài khoản hoặc đổi mật khẩu nào."
          />
        ) : (
          <div className="space-y-4">
            {securityLogs.map((log: any, index: number) => {
              const logId = log.id || log._id || `security-${index}`;
              const actor = log.actor || log.user || {};
              const actorName =
                actor.full_name ||
                actor.fullName ||
                actor.name ||
                log.actor_name ||
                'Hệ thống';

              const roleName = getRoleName({
                ...userDictionary?.[getId(actor.user_id || actor.id || actor._id)],
                ...actor,
                role_name: log.role_name || actor.role_name,
                role_id: log.role_id || actor.role_id,
              });

              const action = String(log.action || log.type || 'SECURITY').toUpperCase();
              const message =
                log.message ||
                log.details?.message ||
                log.description ||
                'Có một sự kiện bảo mật mới.';

              return (
                <div
                  key={logId}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-200 transition-all p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      {action.includes('PASSWORD') ? (
                        <KeyRound size={20} />
                      ) : (
                        <ShieldCheck size={20} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-800 text-sm">
                          {actorName}
                        </span>

                        {renderRoleBadge(roleName)}

                        <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={13} />
                          {getRelativeTime(log.created_at)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-700 bg-slate-50/80 rounded-xl p-3 leading-relaxed">
                        <span className="font-black text-rose-600 uppercase text-xs mr-1">
                          [{ACTION_LABELS[action] || action}]
                        </span>
                        {formatMessage(message)}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Activity className="text-indigo-600" size={22} />
              </div>
              Hoạt động hệ thống
            </h1>

            <p className="text-sm font-medium text-slate-500 pl-12">
              Khu vực quản trị dành riêng cho SYSTEM_ADMIN để theo dõi hoạt động, tài khoản và bảo mật hệ thống.
            </p>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-1 mb-8 w-fit max-w-full overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {ACTIVITY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title={tab.description}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'activity' && (
          <>
            <ActivityFilterBar />
            {renderActivityTab()}
          </>
        )}

        {activeTab === 'accounts' && renderAccountTab()}

        {activeTab === 'security' && renderSecurityTab()}
      </div>
    </div>
  );
};

export default ActivityLogPage;