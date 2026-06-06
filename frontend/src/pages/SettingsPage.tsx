import React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { User, Shield, Bell, Settings } from "lucide-react";
import ChangePasswordForm from "../features/settings/components/ChangePassWordForm";
import { ProfileTab } from "../features/settings/components/ProfileTab";
import { NotificationTab } from "../features/settings/components/NotificationTab";

const TABS = [
  { key: "profile", label: "Hồ sơ", icon: User },
  { key: "security", label: "Bảo mật", icon: Shield },
  { key: "notifications", label: "Thông báo", icon: Bell },
];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault("profile"),
  );

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Settings className="text-indigo-600" size={24} />
              </div>
              Cài đặt
            </h1>

            <p className="text-sm font-medium text-slate-500 pl-12">
              Quản lý hồ sơ cá nhân, thông tin bảo mật và cấu hình thông báo của
              tài khoản.
            </p>
          </div>
        </div>

        {}
        <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 mb-8 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 md:p-8 transition-all duration-300">
          {activeTab === "profile" && <ProfileTab />}

          {activeTab === "security" && <ChangePasswordForm />}

          {activeTab === "notifications" && <NotificationTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
