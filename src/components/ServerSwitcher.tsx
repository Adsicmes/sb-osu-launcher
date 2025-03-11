import {
    VStack,
    Text,
    Box,
    Image,
    Show,
    createListCollection,
    ListCollection,
    HStack,
    IconButton,
    Icon,
    Flex,
    Spacer,
} from "@chakra-ui/react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEffect, useRef, useState } from "react";
import { ServerList, useServerSwitcher, OsuAuthProfile } from "@/zustand/osu-auth";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "@/components/ui/select";
import { toaster } from "@/components/ui/toaster";
import { useOsuAuth } from "@/zustand/osu-auth";
import { Dialog } from "@chakra-ui/react";
import { Portal } from "@chakra-ui/react";
import { Button, Input } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { Plus, Trash } from "lucide-react";
import { logo_osu, logo_sb } from "@/consts";

export function ServerSwitcher() {
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
                        <Image src={logo_osu} w={"64px"} h={"64px"} />
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
                        <Dialog.Body >
                            <VStack w={"full"} h={"full"} gap={4}>
                                <SegmentedControl
                                    bg={"rgba(0, 0, 0, 0.1)"}
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
                                    }}
                                />
                                <Text>当前服务器: {serverSwitcher.currentServer.name}</Text>
                                <Text>{osuAuth.current_profile?.profile_username}</Text>
                                
                                <Flex gap={2}>
                                    <SelectRoot
                                        collection={accountSelectListCollection}
                                        variant={"subtle"}
                                        size="md"
                                        width="320px"
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
                                                                    // 添加延迟，确保状态更新后再调用 updateSelectorItems
                                                                    setTimeout(() => {
                                                                        updateSelectorItems();
                                                                    }, 0);
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

                                    <IconButton variant={"subtle"} size={"md"} onClick={() => setOpenAddAccountForm(!openAddAccountForm)}>
                                        <Icon as={Plus} rotate={openAddAccountForm ? "45deg" : "0deg"} transition={"all 0.2s ease-in-out"} />
                                    </IconButton>
                                </Flex>

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
                                                placeholder="Password"
                                                type="password"
                                                value={addPassword}
                                                onChange={(e) => setAddPassword(e.target.value)}
                                            />
                                        </VStack>

                                        <HStack w={"full"} justifyContent={"flex-end"}>
                                            <Button
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