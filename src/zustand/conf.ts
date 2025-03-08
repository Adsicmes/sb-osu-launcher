import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toaster } from "@/components/ui/toaster";

interface ConfState {
    osuRootDir: string;
    setOsuRootDir: (dir: string) => void;
    osuSongsDir: string;
    setOsuSongsDir: (dir: string) => void;
    osuExeName: string;
    setOsuExeName: (name: string) => void;

    autoDetectOsuPath: () => Promise<void>;
    autoDetectOsuSongsPath: () => Promise<void>;
}

export const useConf = create<ConfState>()(
    persist(
        (set, get) => ({
            osuRootDir: "",
            osuSongsDir: "",
            osuExeName: "osu!.exe",
            setOsuRootDir: (dir: string) => set({ osuRootDir: dir }),
            setOsuSongsDir: (dir: string) => set({ osuSongsDir: dir }),
            setOsuExeName: (name: string) => set({ osuExeName: name }),

            autoDetectOsuPath: async () => {
                var dir = "";

                try {
                    dir = await invoke<string>("get_osu_path_from_registry");
                    set({ osuRootDir: dir });
                    return;
                } catch (error) {
                    console.error(error);
                }

                if (dir == "") {
                    try {
                        dir = await invoke<string>("get_osu_path_from_desktop");
                        set({ osuRootDir: dir });
                        return;
                    } catch (error) {
                        console.error(error);
                    }
                }

                toaster.create({
                    title: `获取 osu! 路径失败`,
                    type: "error",
                });
            },
            autoDetectOsuSongsPath: async () => {
                if (get().osuRootDir == "") {
                    toaster.create({
                        title: "osu! 根目录未设置",
                        type: "error",
                    });
                    return;
                }

                var configPath = `${get().osuRootDir}\\osu!.${await invoke<string>("get_system_username")}.cfg`;
                try {
                    const config = await invoke<Record<string, any>>("read_osu_config", {
                        configPath: configPath,
                    });

                    const songsDir = await invoke<string>("get_valid_songs_path", {
                        songsDir: config.BeatmapDirectory,
                        osuBaseDir: get().osuRootDir,
                    });

                    set({ osuSongsDir: songsDir });
                } catch (error) {
                    toaster.create({
                        title: `读取 osu! 配置文件失败: ${error} ${configPath}`,
                        type: "error",
                    });
                }
            },
        }),
        {
            name: "conf-storage",
            partialize: (state) => ({
                osuRootDir: state.osuRootDir,
                osuSongsDir: state.osuSongsDir,
                osuExeName: state.osuExeName,
            }),
        }
    )
);
