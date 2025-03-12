import { Box, HStack, IconButton, Spacer, Image, Text, Show } from "@chakra-ui/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "lucide-react";
import { SegmentedControl } from "./ui/segmented-control";
import { ServerList, useServerSwitcher } from "@/zustand/osu-auth";
import { logo_sb } from "@/consts";
import { logo_osu } from "@/consts";
import { useOsuAuth } from "@/zustand/osu-auth";
import { useDevTools } from "@/zustand/app";


export default function TitleBar() {
    const serverSwitcher = useServerSwitcher();
    const osuAuth = useOsuAuth();
    const devTools = useDevTools();

    return (
        <HStack data-tauri-drag-region gap={0} w={"full"}>
            <SegmentedControl
                bg={"rgba(0, 0, 0, 0.1)"}
                paddingLeft={2}
                paddingTop={2}
                value={serverSwitcher.currentServer.name}
                items={[
                    {
                        label: <Image src={logo_osu} w={"26px"} h={"26px"} />,
                        value: ServerList.bancho.name,
                    },
                    {
                        label: <Image src={logo_sb} w={"26px"} h={"26px"} />,
                        value: ServerList.sb.name,
                    },
                ]}
                onValueChange={(e) => {
                    const newServer = ServerList[e.value as keyof typeof ServerList];
                    serverSwitcher.setCurrentServer(newServer);
                    osuAuth.setCurrentProfile(osuAuth.latest_profile_for_servers[newServer.name]);
                }}
            />

            <Show when={devTools.debugMode}>
                <Text fontFamily={"torus"}>{osuAuth.current_profile?.profile_username}</Text>
            </Show>

            <Spacer data-tauri-drag-region></Spacer>
            <IconButton
                size={"sm"}
                variant={"ghost"}
                rounded={"none"}
                onClick={async () => {
                    await getCurrentWindow().minimize();
                }}
            >
                <Minus color="#ffffff" />
            </IconButton>
            <IconButton
                size={"sm"}
                variant={"ghost"}
                rounded={"none"}
                onClick={async () => {
                    await getCurrentWindow().close();
                }}
            >
                <X color="#ffffff" />
            </IconButton>
            <Box width={"4px"}></Box>
        </HStack>
    );
}
