import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OsuUtil } from "@/utils/osu-auth";
import { useConf } from "./conf";
import { join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { toaster } from "@/components/ui/toaster";

export interface OsuAuthProfile {
    profile_id: string;
    profile_server: Server;
    profile_username: string;
    profile_password: string;
}

interface OsuAuthState {
    profiles: Record<string, OsuAuthProfile>;
    current_profile: OsuAuthProfile | null;
    latest_profile_for_servers: Record<Server["name"], OsuAuthProfile>;

    setCurrentProfile: (profile: OsuAuthProfile) => void;
    clearCurrentProfile: () => void;

    updateProfile: (profile: OsuAuthProfile) => void;
    deleteProfile: (profile_id: string) => void;
    clearAllProfiles: () => void;

    login_current_profile: () => Promise<void>;
}

export const useOsuAuth = create<OsuAuthState>()(
    persist(
        (set, get) => ({
            profiles: {},
            current_profile: null,
            latest_profile_for_servers: {},

            setCurrentProfile: (profile: OsuAuthProfile) => {
                // 检查是否存在该profile
                const profileExists = get().profiles[profile.profile_id] !== undefined;
                
                if (!profileExists) {
                    toaster.create({ description: "账户不存在", type: "error" });
                    return
                }
                set({ current_profile: profile });
                set({ latest_profile_for_servers: { ...get().latest_profile_for_servers, [profile.profile_server.name]: profile } });
            },
            clearCurrentProfile: () => set({ current_profile: null }),
            updateProfile: (profile: OsuAuthProfile) => {
                // 创建一个新的profile对象，避免直接修改原始对象
                let updatedProfile = { ...profile };

                set((state) => {
                    // 检查是否存在该profile_id的配置文件
                    const profileExists = state.profiles[updatedProfile.profile_id] !== undefined;

                    if (profileExists) {
                        // 如果存在，则更新配置文件
                        return {
                            profiles: { ...state.profiles, [updatedProfile.profile_id]: updatedProfile },
                        };
                    } else {
                        // 如果不存在，则添加新配置文件
                        return {
                            profiles: { ...state.profiles, [updatedProfile.profile_id]: updatedProfile },
                        };
                    }
                });
            },
            deleteProfile: (profile_id: string) => {
                set((state) => {
                    const { [profile_id]: removed, ...restProfiles } = state.profiles;
                    return { profiles: restProfiles };
                });
                if (get().current_profile?.profile_id === profile_id) {
                    get().clearCurrentProfile();
                }
            },
            clearAllProfiles: () => set({ profiles: {} }),

            login_current_profile: async () => {
                const currentProfile = get().current_profile;
                if (currentProfile) {
                    const conf = useConf.getState();
                    
                    const config_path = await join(conf.osuRootDir, `osu!.${await invoke("get_system_username")}.cfg`)
                    console.log(config_path)

                    OsuUtil.setServerCredentials(
                        config_path,
                        {
                            username: currentProfile.profile_username,
                            plain_password: currentProfile.profile_password,
                        },
                        currentProfile.profile_server
                    );
                }
            },

        }),
        {
            name: "osu-auth-profile",
            partialize: (state) => ({
                profiles: state.profiles,
                current_profile: state.current_profile,
                latest_profile_for_servers: state.latest_profile_for_servers,
            }),
        }
    )
);

export interface Server {
    name: string;
    website_url: string;
    credential_url: string;
    devserver_url: string;
}

export const ServerList: Record<string, Server> = {
    bancho: {
        name: "bancho",
        website_url: "https://osu.ppy.sh",
        credential_url: "ppy.sh",
        devserver_url: "",
    },
    sb: {
        name: "sb",
        website_url: "https://osu.ppy.sb",
        credential_url: "ppy.sb",
        devserver_url: "ppy.sb",
    },
};

interface ServerSwitcherState {
    currentServer: Server;
    setCurrentServer: (server: Server) => void;
}

export const useServerSwitcher = create<ServerSwitcherState>()(
    persist(
        (set) => ({
            currentServer: ServerList.bancho,
            setCurrentServer: (server: Server) => set({ currentServer: server }),
        }),
        {
            name: "server-switcher-storage",
            partialize: (state) => ({
                currentServer: state.currentServer,
            }),
        }
    )
);
