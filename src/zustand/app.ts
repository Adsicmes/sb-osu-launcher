import { SeasonalBackgrounds } from "@/types/ppy-sh";
import { create } from "zustand";
import { persist } from 'zustand/middleware'
import { fetch } from '@tauri-apps/plugin-http';


// 存储上一次获取的网络背景图urls
interface BgCachesState {
    current_bg: number | null;
    bgs: SeasonalBackgrounds | null;
    defaultBg: string;

    is_Loading: boolean;
    error: string | null;
    last_fetch_time: number | null;
    min_fetch_interval: number;

    autoRotation: boolean;
    rotationInterval: number;

    fetchBgs: () => Promise<void>;
    nextBg: () => void;
    resetBgs: () => void;

    getCurrentBgUrl: () => string | null;

    shouldFetchBgs: () => boolean;
    setMinFetchInterval: (interval: number) => void;

    toggleAutoRotate: () => void;
    setRotationInterval: (interval: number) => void;
}

export const useBgCaches = create<BgCachesState>()(
    persist(
        (set, get) => ({
            current_bg: null,
            bgs: null,
            defaultBg: "/bg-default.png",

            is_Loading: false,
            error: null,
            last_fetch_time: null,
            min_fetch_interval: 1000 * 60 * 60 * 24,

            autoRotation: true,
            rotationInterval: 12 * 60 * 1000,

            toggleAutoRotate: () => set({ autoRotation: !get().autoRotation }),

            setRotationInterval: (interval: number) => set({ rotationInterval: interval }),

            getCurrentBgUrl: () => {
                const { current_bg, bgs } = get();
                if (current_bg !== null && bgs !== null && bgs.backgrounds.length > 0) {
                    return bgs.backgrounds[current_bg].url;
                }
                return null;
            },

            fetchBgs: async () => {
                set({ is_Loading: true, error: null });
                try {
                    set({ last_fetch_time: Date.now() });
                    const response = await fetch("https://osu.ppy.sh/api/v2/seasonal-backgrounds");
                    if (!response.ok) {
                        throw new Error("Failed to fetch seasonal backgrounds");
                    }
                    const data: SeasonalBackgrounds = await response.json();

                    set({
                        bgs: data,
                        current_bg: data.backgrounds.length > 0 ? 0 : null,
                    })
                } catch (error) {
                    set({ error: error as string });
                }
            },
            
            shouldFetchBgs: () => {
                const { last_fetch_time, min_fetch_interval } = get();
                if (last_fetch_time === null) {
                    return true;
                }
                return Date.now() - last_fetch_time > min_fetch_interval;
            },

            setMinFetchInterval: (interval: number) => set({ min_fetch_interval: interval }),

            nextBg: () => {
                const { current_bg, bgs } = get();
                if (current_bg !== null && bgs !== null && bgs.backgrounds.length > 0) {
                    const next_bg = (current_bg + 1) % bgs.backgrounds.length;
                    set({ current_bg: next_bg });
                }
            },

            resetBgs: () => {
                set({
                    current_bg: null,
                    bgs: null,
                    is_Loading: false,
                    error: null,
                    last_fetch_time: null,
                })
            },
        }),
        {
            name: "backgrounds-storage",
            partialize: (state) => ({
                current_bg: state.current_bg,
                bgs: state.bgs,
                defaultBg: state.defaultBg,
                last_fetch_time: state.last_fetch_time,
                autoRotation: state.autoRotation,
                rotationInterval: state.rotationInterval,
            }),
        }
    )
)

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
}

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
)

