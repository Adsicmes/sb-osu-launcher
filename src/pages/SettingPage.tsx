import {
    Presence,
    Text,
    Container,
    Heading,
    Tabs,
    HStack,
    VStack,
    Input,
    SimpleGrid,
    GridItem,
    IconButton,
} from "@chakra-ui/react";
import { AppWindow, User, Wrench, Folder, MonitorCog } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useConf } from "../zustand/conf";
import { open } from '@tauri-apps/plugin-dialog';

export function SettingPage() {
    const conf = useConf();

    return (
        <Presence
            present={true}
            animationName={{
                _open: "slide-from-bottom, fade-in",
                _closed: "slide-to-bottom, fade-out",
            }}
            animationDuration="moderate"
            w={"full"}
            h={"full"}
            paddingX={4}
        >
            <Container
                bg={"rgba(0, 0, 0, 0.4)"}
                backdropFilter="blur(4px) grayscale(40%)"
                shadow={"md"}
                roundedTop={"lg"}
                paddingTop={4}
                h={"full"}
            >
                <Tabs.Root defaultValue="system">
                    <Tabs.List>
                        <Tabs.Trigger value="system">
                            <MonitorCog size={16} />
                            系统
                        </Tabs.Trigger>
                        <Tabs.Trigger value="projects">
                            <User size={16} />
                            账户
                        </Tabs.Trigger>
                        <Tabs.Trigger value="tasks">
                            <AppWindow size={16} />
                            软件
                        </Tabs.Trigger>

                        <Tabs.Indicator rounded="l2" />
                    </Tabs.List>

                    <Tabs.Content
                        value="system"
                        _open={{
                            animationName: "fade-in",
                            animationDuration: "300ms",
                        }}
                        _closed={{
                            animationName: "fade-out",
                            animationDuration: "120ms",
                        }}
                    >
                        <SimpleGrid columns={2} w={"full"} gap={4}>
                            <GridItem colSpan={{ base: 1, md: 2 }}>
                                <Heading>Osu! 设置</Heading>
                            </GridItem>

                            <Text>osu 根目录</Text>
                            <HStack w={"full"}>
                                <Input
                                    placeholder="请输入 osu 根目录"
                                    variant={"subtle"}
                                    value={conf.osuRootDir}
                                    onChange={(e) => conf.setOsuRootDir(e.target.value)}
                                />
                                <Tooltip content="自动检测" openDelay={100} closeDelay={100}>
                                    <IconButton aria-label="自动检测" variant={"subtle"} onClick={() => conf.autoDetectOsuPath()}>
                                        <Wrench />
                                    </IconButton>
                                </Tooltip>
                                <IconButton aria-label="选择文件夹" variant={"subtle"}
                                    onClick={async () => {
                                        const dir = await open({
                                            multiple: false,
                                            directory: true,
                                        })
                                        if (dir) {
                                            conf.setOsuRootDir(dir);
                                        }
                                    }}
                                >
                                    <Folder />
                                </IconButton>
                            </HStack>

                            <Text>osu songs目录</Text>
                            <HStack w={"full"}>
                                <Input
                                    placeholder="请输入 osu songs 目录"
                                    variant={"subtle"}
                                    value={conf.osuSongsDir}
                                    onChange={(e) => conf.setOsuSongsDir(e.target.value)}
                                />
                                <Tooltip content="自动检测，需要先填写 osu 根目录" openDelay={100} closeDelay={100}>
                                    <IconButton aria-label="自动检测" variant={"subtle"} onClick={() => conf.autoDetectOsuSongsPath()}>
                                        <Wrench />
                                    </IconButton>
                                </Tooltip>
                                <IconButton aria-label="选择文件夹" variant={"subtle"}
                                    onClick={async () => {
                                        const dir = await open({
                                            multiple: false,
                                            directory: true,
                                        })
                                        if (dir) {
                                            conf.setOsuSongsDir(dir);
                                        }
                                    }}
                                >
                                    <Folder />
                                </IconButton>
                            </HStack>

                            <Text>osu 可执行文件名</Text>
                            <Input
                                placeholder="osu!.exe"
                                variant={"subtle"}
                                value={conf.osuExeName}
                                onChange={(e) => conf.setOsuExeName(e.target.value)}
                            />
                        </SimpleGrid>
                        <VStack w={"full"} gap={4} alignItems={"flex-start"}>
                            <HStack w={"full"} gap={4}></HStack>
                        </VStack>
                    </Tabs.Content>

                    <Tabs.Content
                        value="projects"
                        _open={{
                            animationName: "fade-in",
                            animationDuration: "300ms",
                        }}
                        _closed={{
                            animationName: "fade-out",
                            animationDuration: "120ms",
                        }}
                    >
                        Manage your projects
                    </Tabs.Content>

                    <Tabs.Content
                        value="tasks"
                        _open={{
                            animationName: "fade-in",
                            animationDuration: "300ms",
                        }}
                        _closed={{
                            animationName: "fade-out",
                            animationDuration: "120ms",
                        }}
                    >
                        Data path: C:\Users\abbey\AppData\Local\com.sb-osu-launcher.app\
                    </Tabs.Content>
                </Tabs.Root>
            </Container>
        </Presence>
    );
}
