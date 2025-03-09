"use client";

import {
    VStack,
    Spacer,
    HStack,
    Button,
    Presence,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConf } from "@/zustand/conf";
import { LoginAvatar } from "@/components/LoginAvatar";
import { ServerSwitcher } from "@/components/ServerSwitcher";
import { useLaunchGame } from "@/hooks/useLaunchGame";

export function HomePage() {
    const conf = useConf();
    const { launchGame } = useLaunchGame();

    useEffect(() => {
        invoke("set_osu_root_path_profile_watcher", {
            path: "D:\\UserFiles\\Games\\OSU\\stable",
        });
    }, []);

    return (
        <Presence
            present={true}
            animationStyle={{ _open: "scale-fade-in", _closed: "scale-fade-out" }}
            animationDuration="moderate"
            w={"full"}
            h={"full"}
        >
            <VStack w={"full"} h={"full"} py={4} px={4} transition="all 1s ease-in-out">
                <HStack w={"full"}>
                    <Spacer />
                    <LoginAvatar />
                </HStack>

                <Spacer />

                <HStack w={"full"} gap={4}>
                    <Spacer />

                    <ServerSwitcher />

                    <Button
                        w={"168px"}
                        h={"86px"}
                        variant={"plain"}
                        rounded={"l3"}
                        bgColor={"rgba(0, 0, 0, 0.3)"}
                        backdropFilter="blur(5px) grayscale(40%)"
                        border={"1px solid rgba(255, 255, 255, 0.2)"}
                        shadow={"md"}
                        onClick={launchGame}
                    >
                        启动游戏
                    </Button>
                </HStack>
            </VStack>
        </Presence>
    );
}
