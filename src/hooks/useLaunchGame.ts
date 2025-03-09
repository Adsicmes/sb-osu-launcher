import { invoke } from "@tauri-apps/api/core";
import { useOsuAuth } from "@/zustand/osu-auth";
import { useServerSwitcher } from "@/zustand/osu-auth";
import { useConf } from "@/zustand/conf";
import { toaster } from "@/components/ui/toaster";

export function useLaunchGame() {
    const osuAuth = useOsuAuth();
    const serverSwitcher = useServerSwitcher();
    const conf = useConf();

    const launchGame = async () => {
        try {
            if (osuAuth.current_profile) {
                // 如果有当前选中的账户，先登录再启动游戏
                await osuAuth.login_current_profile();
                await invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: osuAuth.current_profile?.profile_server.devserver_url,
                    osuExeName: conf.osuExeName,
                });
            } else {
                // 如果没有当前选中的账户，直接启动游戏
                await invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: serverSwitcher.currentServer.devserver_url,
                    osuExeName: conf.osuExeName,
                });
            }
            toaster.create({ description: "启动游戏成功" + serverSwitcher.currentServer.devserver_url, type: "success" });
        } catch (error) {
            toaster.create({ description: "操作失败: " + error, type: "error" });
        }
    };

    return { launchGame };
} 