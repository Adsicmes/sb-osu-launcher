import { create } from "zustand";
import { Server, ServerList } from "./app";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { readDir } from "@tauri-apps/plugin-fs";

export interface OsuClientProfile {
    profile_id: string;
    profile_name: string;
    profile_server: Server;
}

interface OsuClientProfileState {
    profiles: OsuClientProfile[];
    current_profile: OsuClientProfile | null;
    setCurrentProfile: (profile: OsuClientProfile) => void;
    clearCurrentProfile: () => void;
    setProfiles: (profiles: OsuClientProfile[]) => void;
    updateProfilesFromDir: () => Promise<void>;
}

export const useOsuClientProfile = create<OsuClientProfileState>()(
    persist(
        (set, get) => ({
            profiles: [],
            current_profile: null,
            setCurrentProfile: (profile: OsuClientProfile) => set({ current_profile: profile }),
            clearCurrentProfile: () => set({ current_profile: null }),
            setProfiles: (profiles: OsuClientProfile[]) => set({ profiles: profiles }),
            updateProfilesFromDir: async () => {
                const dir = await readDir("osu_client_profiles", { baseDir: BaseDirectory.AppData });
                const updatedProfiles = dir.map((item) => {
                    const info = item.name.split("____");
                    const profile_name = info[0];
                    const serverStr = info[1].replace("_", ".");
                    // 匹配ServerList中的credential_url
                    const matchedServer = Object.values(ServerList).find(server => 
                        server.credential_url === serverStr
                    );
                    const profile_server = matchedServer || ServerList.bancho;
                    
                    // 生成唯一标识符
                    const profile_id = `${profile_name}____${profile_server.credential_url}`;

                    return { profile_id, profile_name, profile_server };
                });

                // 获取当前的current_profile
                const current = get().current_profile;
                
                // 检查current_profile是否存在于更新后的profiles列表中
                let updatedCurrentProfile = current;
                
                if (current !== null) {
                    const isCurrentProfileValid = updatedProfiles.some(
                        profile => profile.profile_id === current.profile_id
                    );
                    
                    // 如果不存在，则更新current_profile
                    if (!isCurrentProfileValid) {
                        updatedCurrentProfile = updatedProfiles.length > 0 ? updatedProfiles[0] : null;
                    }
                } else if (updatedProfiles.length > 0) {
                    // 如果current_profile为null但profiles不为空，设置为第一个
                    updatedCurrentProfile = updatedProfiles[0];
                }
                
                set({
                    profiles: updatedProfiles,
                    current_profile: updatedCurrentProfile,
                });
            },
        }),
        {
            name: "osu-client-profile-storage",
            partialize: (state) => ({
                current_profile: state.current_profile,
            }),
        }
    )
);

interface FileChangeEventPayload {
    path: string;
    event_type: string;
    username: string;
    success: boolean;
    message: string;
}

listen<FileChangeEventPayload>("profile-copied", async (event) => {
    await useOsuClientProfile.getState().updateProfilesFromDir();
});
