"use client";

import {
    Avatar,
    VStack,
    HStack,
    Button,
    Spacer,
    Text,
    Presence,
    Box,
    Image,
    Show,
    createListCollection,
    ListCollection,
} from "@chakra-ui/react";
import {
    DrawerBackdrop,
    DrawerBody,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerRoot,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEffect, useRef, useState } from "react";
import { ServerList, Server, useServerSwitcher } from "@/zustand/app";
import { Fieldset } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { Input } from "@chakra-ui/react";
import { Separator } from "@chakra-ui/react";
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
} from "@/components/ui/select";
import {
    DialogBackdrop,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { BaseDirectory, readDir } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { OsuClientProfile, useOsuClientProfile } from "@/zustand/user";
import { toaster } from "@/components/ui/toaster";
import { useConf } from "@/zustand/conf";

export function HomePage() {
    const osuClientProfile = useOsuClientProfile();
    const conf = useConf();

    useEffect(() => {
        invoke("set_osu_root_path_profile_watcher", {
            path: "D:\\UserFiles\\Games\\OSU\\stable",
        });
    }, []);

    const handleLaunch = async () => {
        try {
            if (osuClientProfile.current_profile) {
                // 如果选择了账户，则还原配置
                // 步骤1: 还原选中账户的配置到osu目录
                const result = await invoke("restore_profile_to_osu_dir", {
                    profileId: osuClientProfile.current_profile.profile_id,
                });
                toaster.create({ description: result as string, type: "success" });
                
                // 获取服务器URL
                const devserverUrl = osuClientProfile.current_profile.profile_server.devserver_url;
                
                // 启动osu
                const launchResult = await invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: devserverUrl,
                    osuExeName: conf.osuExeName,
                });
                
                toaster.create({ description: launchResult as string, type: "success" });
            } else {
                // 如果没有选择账户，直接启动游戏连接服务器，但不复制配置文件
                // 获取当前服务器URL
                const { currentServer } = useServerSwitcher.getState();
                const devserverUrl = currentServer.devserver_url;
                
                // 启动osu
                const launchResult = await invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: devserverUrl,
                    osuExeName: conf.osuExeName,
                });
                
                toaster.create({ description: launchResult as string, type: "success" });
            }
        } catch (error) {
            toaster.create({ description: "操作失败: " + error, type: "error" });
        }
    };

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
                        transition={"all 0.2s ease-in-out"}
                        shadow={"md"}
                        color="white"
                        _hover={{ bgColor: "rgba(0, 0, 0, 0.5)", borderColor: "rgba(255, 255, 255, 0.2)" }}
                        onClick={handleLaunch}
                    >
                        <Text textStyle={"lg"}>Launch</Text>
                    </Button>
                </HStack>
            </VStack>
        </Presence>
    );
}

function LoginAvatar() {
    return (
        <DrawerRoot>
            <DrawerBackdrop />
            <DrawerTrigger asChild>
                <Avatar.Root
                    shadow={"md"}
                    cursor={"pointer"}
                    _hover={{ boxSize: "50px" }}
                    transition={"all 0.2s ease-in-out"}
                >
                    <Avatar.Fallback name="None" />
                    <Avatar.Image src="/avatar-default.png" />
                </Avatar.Root>
            </DrawerTrigger>
            <DrawerContent offset="4" rounded="md" bg={"transparent"} backdropFilter="blur(4px) grayscale(40%)">
                <DrawerHeader>
                    <DrawerTitle>Not Login</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>
                    <Text>这里还没做</Text>
                </DrawerBody>
                <DrawerFooter>
                    <Text>"Carpe diem."</Text>
                </DrawerFooter>
            </DrawerContent>
        </DrawerRoot>
    );
}

function ServerSwitcher() {
    const [openServerSwitcher, setOpenServerSwitcher] = useState(false);
    const { currentServer, setCurrentServer } = useServerSwitcher();
    const osuClientProfile = useOsuClientProfile();
    const [accountSelectProfileListCollection, setAccountSelectProfileListCollection] = useState<ListCollection>(
        createListCollection({
            items: [],
        })
    );
    const [accountSelectValue, setAccountSelectValue] = useState<string[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (osuClientProfile.profiles.length > 0) {
            const profiles = createListCollection({
                items: osuClientProfile.profiles.map((item) => ({
                    label: item.profile_name,
                    value: item.profile_id,
                })),
                itemToString: (item) => item.label,
                itemToValue: (item) => item.value,
            });
            setAccountSelectProfileListCollection(profiles);

            // 只查找当前服务器的配置文件
            const serverProfiles = osuClientProfile.profiles.filter(
                (profile) => profile.profile_server.name === currentServer.name
            );

            // 如果当前服务器有配置文件，选择第一个；否则设置为空
            if (serverProfiles.length > 0) {
                setAccountSelectValue([serverProfiles[0].profile_id]);
                osuClientProfile.setCurrentProfile(serverProfiles[0]);
            } else {
                setAccountSelectValue([]);
                // 清除当前配置文件
                osuClientProfile.clearCurrentProfile();
            }
        }
    }, [osuClientProfile.profiles, currentServer]);

    useEffect(() => {
        osuClientProfile.updateProfilesFromDir();
    }, []);

    return (
        <DrawerRoot open={openServerSwitcher} onOpenChange={(e) => setOpenServerSwitcher(e.open)} placement={"bottom"}>
            <DrawerBackdrop />
            <DrawerTrigger asChild>
                <Box cursor={"pointer"} userSelect={"none"}>
                    <Button onClick={() => setCurrentServer(ServerList.bancho)}> {currentServer.name} </Button>
                    <Show when={currentServer.name === ServerList.bancho.name}>
                        <Image src="/Osu!_Logo_2016.svg" w={"64px"} h={"64px"} />
                    </Show>
                    <Show when={currentServer.name === ServerList.sb.name}>
                        <Image src="/sb-256x256.png" w={"64px"} h={"64px"} />
                    </Show>
                </Box>
            </DrawerTrigger>
            <DrawerContent
                offset="8"
                rounded="md"
                bg={"transparent"}
                backdropFilter="blur(4px) grayscale(40%)"
                h={"60%"}
                ref={contentRef}
            >
                <DrawerHeader>
                    <DrawerTitle>切换服务器</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>
                    <HStack w={"full"} h={"full"}>
                        <VStack w={"full"} h={"full"}>
                            <HStack w={"full"} gap={4}>
                                <Text minWidth={"70px"}>当前服务器</Text>
                                <SegmentedControl
                                    bg={"rgba(0, 0, 0, 0.1)"}
                                    value={currentServer.name}
                                    items={[
                                        {
                                            label: <Image src="/Osu!_Logo_2016.svg" w={"24px"} h={"24px"} />,
                                            value: ServerList.bancho.name,
                                        },
                                        {
                                            label: <Image src="/sb-256x256.png" w={"24px"} h={"24px"} />,
                                            value: ServerList.sb.name,
                                        },
                                    ]}
                                    onValueChange={(e) => {
                                        const newServer = ServerList[e.value as keyof typeof ServerList];
                                        setCurrentServer(newServer);

                                        // 只查找与当前选中服务器名称匹配的配置文件
                                        const matchedProfile = osuClientProfile.profiles.find(
                                            (item) => item.profile_server.name === newServer.name
                                        );

                                        // 如果找到匹配的配置文件，则设置该配置文件；否则设置为空
                                        if (matchedProfile) {
                                            setAccountSelectValue([matchedProfile.profile_id]);
                                            osuClientProfile.setCurrentProfile(matchedProfile);
                                        } else {
                                            setAccountSelectValue([]);
                                            // 清除当前配置文件
                                            osuClientProfile.clearCurrentProfile();
                                        }
                                    }}
                                />
                            </HStack>

                            <HStack w={"full"} gap={4}>
                                <Text minWidth={"70px"}>当前账号: </Text>
                                <SelectRoot
                                    collection={accountSelectProfileListCollection}
                                    size="md"
                                    variant={"subtle"}
                                    value={accountSelectValue}
                                    onValueChange={(details) => {
                                        setAccountSelectValue(details.value);

                                        if (details.value && details.value.length > 0) {
                                            const selectedProfileId = details.value[0];
                                            const selectedProfile = osuClientProfile.profiles.find(
                                                (profile) => profile.profile_id === selectedProfileId
                                            );

                                            if (selectedProfile) {
                                                osuClientProfile.setCurrentProfile(selectedProfile);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValueText placeholder="Select Account" />
                                    </SelectTrigger>
                                    <SelectContent portalRef={contentRef} portalled={false}>
                                        {accountSelectProfileListCollection.items
                                            .filter((item) => {
                                                const profile = osuClientProfile.profiles.find(
                                                    (p) => p.profile_id === item.value
                                                );
                                                return (
                                                    profile &&
                                                    profile.profile_name !== "" &&
                                                    profile.profile_server.name === currentServer.name
                                                );
                                            })
                                            .map((item) => {
                                                const profile = osuClientProfile.profiles.find(
                                                    (p) => p.profile_id === item.value
                                                );
                                                if (!profile) return null;

                                                return (
                                                    <SelectItem item={item} key={item.label}>
                                                        <HStack>
                                                            <Show
                                                                when={
                                                                    profile.profile_server.name ===
                                                                    ServerList.bancho.name
                                                                }
                                                            >
                                                                <Image
                                                                    src="/Osu!_Logo_2016.svg"
                                                                    w={"24px"}
                                                                    h={"24px"}
                                                                />
                                                            </Show>
                                                            <Show
                                                                when={
                                                                    profile.profile_server.name === ServerList.sb.name
                                                                }
                                                            >
                                                                <Image src="/sb-256x256.png" w={"24px"} h={"24px"} />
                                                            </Show>
                                                            <Text>{item.label}</Text>
                                                        </HStack>
                                                    </SelectItem>
                                                );
                                            })}
                                    </SelectContent>
                                </SelectRoot>
                            </HStack>

                            <Show when={currentServer.name === ServerList.bancho.name}>
                                <Text>当前账号: </Text>
                                <Text>
                                    {osuClientProfile.profiles.map((item) => {
                                        return (
                                            <Text key={item.profile_name}>
                                                {item.profile_name} -- {item.profile_server.name}
                                            </Text>
                                        );
                                    })}
                                </Text>
                            </Show>
                            <Show when={currentServer.name === ServerList.sb.name}>
                                <Text>SB</Text>
                            </Show>
                        </VStack>
                        {/* <Separator orientation="vertical" h={"95%"} /> */}
                        <VStack w={"full"} h={"full"}>
                            <Box h={"100%"}>af</Box>
                        </VStack>
                    </HStack>
                </DrawerBody>
            </DrawerContent>
        </DrawerRoot>
    );
}
