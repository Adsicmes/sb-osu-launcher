"use client";

import {
    Avatar,
    VStack,
    Spacer,
    Text,
    Presence,
    Box,
    Image,
    Show,
    createListCollection,
    ListCollection,
    HStack,
    IconButton,
    Icon,
    Flex,
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
import { ServerList, useServerSwitcher } from "@/zustand/osu-auth";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "@/components/ui/select";
import { invoke } from "@tauri-apps/api/core";
import { useOsuClientProfile } from "@/zustand/user";
import { toaster } from "@/components/ui/toaster";
import { useConf } from "@/zustand/conf";
import { useOsuAuth } from "@/zustand/osu-auth";
import { Dialog } from "@chakra-ui/react";
import { Portal } from "@chakra-ui/react";
import { Button, Field, Fieldset, For, Input, NativeSelect, Stack } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { Info, Plus, Trash } from "lucide-react";
import { LuInfo } from "react-icons/lu";
import { ToggleTip } from "@/components/ui/toggle-tip";
import { Tooltip } from "@/components/ui/tooltip";
import { OsuAuthProfile } from "@/zustand/osu-auth";

export function HomePage() {
    const osuClientProfile = useOsuClientProfile();
    const conf = useConf();
    const serverSwitcher = useServerSwitcher();
    const osuAuth = useOsuAuth();

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

    const handleLaunchV2 = async () => {
        try {
            if (osuAuth.current_profile) {
                osuAuth.login_current_profile();
                invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: osuAuth.current_profile?.profile_server.devserver_url,
                    osuExeName: conf.osuExeName,
                });
            } else {
                invoke("launch_osu", {
                    osuRoot: conf.osuRootDir,
                    devserverUrl: serverSwitcher.currentServer.devserver_url,
                    osuExeName: conf.osuExeName,
                });
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

                    {/* <ServerSwitcher /> */}
                    <ServerSwitcherV2 />

                    <Button
                        w={"168px"}
                        h={"86px"}
                        variant={"plain"}
                        rounded={"l3"}
                        bgColor={"rgba(0, 0, 0, 0.3)"}
                        backdropFilter="blur(5px) grayscale(40%)"
                        border={"1px solid rgba(255, 255, 255, 0.2)"}
                        transition={"all 0.3s ease-in-out"}
                        shadow={"md"}
                        color="white"
                        _hover={{ bgColor: "rgba(0, 0, 0, 0.5)", borderColor: "rgba(255, 255, 255, 0.2)" }}
                        onClick={handleLaunchV2}
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
                    transition={"all 0.3s ease-in-out"}
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

function ServerSwitcherV2() {
    const serverSwitcher = useServerSwitcher();
    const osuAuth = useOsuAuth();
    const [openServerSwitcher, setOpenServerSwitcher] = useState(false);
    const [accountSelectListCollection, setAccountSelectListCollection] = useState<ListCollection>(
        createListCollection({
            items: [],
        })
    );
    const [openAddAccountForm, setOpenAddAccountForm] = useState(false);
    const [accountSelectValue, setAccountSelectValue] = useState<string[]>([]);
    const dialogContentRef = useRef<HTMLDivElement>(null);
    const selectTriggerRef = useRef<HTMLButtonElement>(null);
    const [addUsername, setAddUsername] = useState("");
    const [addPassword, setAddPassword] = useState("");

    const handleAddAccount = () => {
        if (addUsername === "" || addPassword === "") {
            toaster.create({ description: "请输入用户名和密码", type: "error" });
            return;
        }

        const newProfile = {
            profile_id: uuidv4(),
            profile_username: addUsername,
            profile_password: addPassword,
            profile_server: serverSwitcher.currentServer,
        };
        osuAuth.updateProfile(newProfile);

        setAddUsername("");
        setAddPassword("");

        toaster.create({ description: "添加账户成功", type: "success" });

        osuAuth.setCurrentProfile(newProfile);
    };

    const updateSelectorItems = () => {
        // 创建当前服务器下的账户列表集合
        const filteredProfiles = Object.values(osuAuth.profiles).filter(
            (item: OsuAuthProfile) => item.profile_server.name === serverSwitcher.currentServer.name
        );

        const coll = createListCollection({
            items: filteredProfiles.map((item: OsuAuthProfile) => ({
                label: item.profile_username,
                value: item.profile_id,
            })),
            itemToString: (item: { label: string; value: string }) => item.label,
            itemToValue: (item: { label: string; value: string }) => item.value,
        });

        setAccountSelectListCollection(coll);

        // 处理当前选中的账户
        if (osuAuth.current_profile) {
            // 检查当前选中的账户是否在过滤后的列表中
            const currentProfileInList = filteredProfiles.some(
                (item: OsuAuthProfile) => item.profile_id === osuAuth.current_profile?.profile_id
            );

            if (currentProfileInList) {
                // 如果在列表中，设置为选中状态
                setAccountSelectValue([osuAuth.current_profile.profile_id]);
            } else {
                // 如果不在列表中，清除当前选择
                if (osuAuth.latest_profile_for_servers[serverSwitcher.currentServer.name]) {
                    osuAuth.setCurrentProfile(osuAuth.latest_profile_for_servers[serverSwitcher.currentServer.name]);
                }
            }
        } else {
            // 没有当前选中账户，清除选择
            if (osuAuth.latest_profile_for_servers[serverSwitcher.currentServer.name]) {
                osuAuth.setCurrentProfile(osuAuth.latest_profile_for_servers[serverSwitcher.currentServer.name]);
            } else {
                setAccountSelectValue([]);
            }
        }
    };

    // 当配置文件列表或当前服务器变化时更新选择器
    useEffect(() => {
        updateSelectorItems();
    }, [osuAuth.profiles, serverSwitcher.currentServer, osuAuth.current_profile]);

    return (
        <Dialog.Root placement={"center"} open={openServerSwitcher} onOpenChange={(e) => setOpenServerSwitcher(e.open)}>
            <Dialog.Trigger asChild>
                <Box cursor={"pointer"} userSelect={"none"}>
                    <Show when={serverSwitcher.currentServer.name === ServerList.bancho.name}>
                        <Image src="/Osu!_Logo_2016.svg" w={"64px"} h={"64px"} />
                    </Show>
                    <Show when={serverSwitcher.currentServer.name === ServerList.sb.name}>
                        <Image src="/sb-256x256.png" w={"64px"} h={"64px"} />
                    </Show>
                </Box>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content
                        py={4}
                        rounded={"md"}
                        bg={"transparent"}
                        backdropFilter="blur(4px) grayscale(40%)"
                        transition="height 0.3s ease, width 0.3s ease"
                        ref={dialogContentRef}
                    >
                        <Dialog.Body>
                            <VStack w={"full"} h={"full"} gap={4}>
                                <SegmentedControl
                                    bg={"rgba(0, 0, 0, 0.1)"}
                                    value={serverSwitcher.currentServer.name}
                                    items={[
                                        {
                                            label: <Image src="/Osu!_Logo_2016.svg" w={"26px"} h={"26px"} />,
                                            value: ServerList.bancho.name,
                                        },
                                        {
                                            label: <Image src="/sb-256x256.png" w={"26px"} h={"26px"} />,
                                            value: ServerList.sb.name,
                                        },
                                    ]}
                                    onValueChange={(e) => {
                                        const newServer = ServerList[e.value as keyof typeof ServerList];
                                        serverSwitcher.setCurrentServer(newServer);
                                    }}
                                />
                                <Text>当前服务器: {serverSwitcher.currentServer.name}</Text>

                                <HStack width="370px" gap={2}>
                                    <SelectRoot
                                        collection={accountSelectListCollection}
                                        variant={"subtle"}
                                        size="md"
                                        value={accountSelectValue}
                                        onValueChange={(details) => {
                                            setAccountSelectValue(details.value);
                                            if (details.value[0]) {
                                                const selectedProfile = osuAuth.profiles[details.value[0]];
                                                if (selectedProfile) {
                                                    osuAuth.setCurrentProfile(selectedProfile);
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger clearable ref={selectTriggerRef}>
                                            <SelectValueText placeholder="Select account" />
                                        </SelectTrigger>

                                        <SelectContent portalRef={dialogContentRef} portalled={false}>
                                            {accountSelectListCollection.items.map(
                                                (account: { label: string; value: string }) => (
                                                    <SelectItem item={account} key={account.value}>
                                                        <HStack>
                                                            <Text>{account.label}</Text>
                                                            <Spacer />
                                                            <IconButton
                                                                variant={"ghost"}
                                                                size={"sm"}
                                                                onClick={(e) => {
                                                                    // 阻止事件冒泡，防止触发 SelectItem 的点击事件
                                                                    e.stopPropagation();
                                                                    // 删除配置文件
                                                                    osuAuth.deleteProfile(account.value);
                                                                    updateSelectorItems();
                                                                }}
                                                            >
                                                                <Icon as={Trash} />
                                                            </IconButton>
                                                        </HStack>
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </SelectRoot>

                                    <IconButton
                                        variant={"subtle"}
                                        size={"md"}
                                        onClick={() => setOpenAddAccountForm(!openAddAccountForm)}
                                    >
                                        <Icon
                                            as={Plus}
                                            rotate={openAddAccountForm ? "45deg" : "0deg"}
                                            transition={"all 0.3s ease-in-out"}
                                        />
                                    </IconButton>

                                    <Tooltip
                                        content="清除所有账户!"
                                        openDelay={100}
                                        closeDelay={200}
                                        positioning={{ placement: "top-end" }}
                                    >
                                        <IconButton
                                            variant={"subtle"}
                                            size={"md"}
                                        onClick={() => osuAuth.clearAllProfiles()}
                                        >
                                            <Icon as={Trash} color={"red"} />
                                        </IconButton>
                                    </Tooltip>
                                </HStack>

                                <Box
                                    overflow="hidden"
                                    maxHeight={openAddAccountForm ? "500px" : "0px"}
                                    opacity={openAddAccountForm ? 1 : 0}
                                    transform={openAddAccountForm ? "translateY(0)" : "translateY(-10px)"}
                                    transition="all 0.3s ease-in-out"
                                    style={{ transformOrigin: "top" }}
                                >
                                    <VStack
                                        width="370px"
                                        p={4}
                                        border={"2px solid rgba(255, 255, 255, 0.2)"}
                                        borderRadius={"md"}
                                        shadow={"md"}
                                        backdropFilter="blur(4px)"
                                        gap={4}
                                    >
                                        <VStack gap={2} w={"full"}>
                                            <Input
                                                variant={"subtle"}
                                                name="username"
                                                placeholder="Username"
                                                value={addUsername}
                                                onChange={(e) => setAddUsername(e.target.value)}
                                            />
                                            <Input
                                                variant={"subtle"}
                                                name="password"
                                                type="password"
                                                placeholder="Password"
                                                value={addPassword}
                                                onChange={(e) => setAddPassword(e.target.value)}
                                            />
                                        </VStack>

                                        <HStack w={"full"} gap={2}>
                                            <Box cursor={"pointer"} userSelect={"none"} pl={2}>
                                                <Tooltip
                                                    content="这里不会验证你的用户名与密码是否正确"
                                                    openDelay={100}
                                                    closeDelay={200}
                                                    positioning={{ placement: "top-start" }}
                                                >
                                                    <Info size={24} />
                                                </Tooltip>
                                            </Box>
                                            <Spacer />
                                            <Button
                                                type="submit"
                                                variant={"subtle"}
                                                onClick={() => {
                                                    handleAddAccount();
                                                    setOpenAddAccountForm(false);
                                                }}
                                            >
                                                添加账户
                                            </Button>
                                        </HStack>
                                    </VStack>
                                </Box>
                            </VStack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
