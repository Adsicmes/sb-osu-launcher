import { Box, VStack, IconButton, Image, Separator, Flex, Button } from "@chakra-ui/react";
import { Home, Settings } from "lucide-react";
import { Tooltip } from "./ui/tooltip";
import { Link } from "react-router";
import { open } from "@tauri-apps/plugin-shell";
import {
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
    DialogActionTrigger,
  } from "@/components/ui/dialog"
import { useState } from "react";

export function Sidebar() {
    const [isSbDialogOpen, setIsSbDialogOpen] = useState(false);
    
    return (
        <Box height="100%" width="100%" backdropFilter="blur(2px) grayscale(40%)" shadow={"sm"}>
            <VStack w={"56px"} gap={0} h={"full"}>

                <DialogRoot lazyMount open={isSbDialogOpen} onOpenChange={(e) => setIsSbDialogOpen(e.open)}>
                    <DialogTrigger asChild>
                        <Image
                            src="/favicon.ico"
                            w={"32px"}
                            h={"32px"}
                            marginY={4}
                            userSelect={"none"}
                            cursor={"pointer"}
                        ></Image>
                    </DialogTrigger>
                    <DialogContent rounded="md" bg={"transparent"} backdropFilter="blur(4px) grayscale(40%)">
                        <DialogHeader>
                            <DialogTitle>即将打开 osu! sb 官网</DialogTitle>
                        </DialogHeader>
                        
                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">取消</Button>
                            </DialogActionTrigger>
                            <Button 
                            onClick={() => {
                                open("https://osu.ppy.sb/");
                                setIsSbDialogOpen(false);
                            }}>确定</Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </DialogContent>
                </DialogRoot>

                <Separator w={"80%"} variant="solid" />

                <Flex w={"full"} h={"full"} marginY={2} gap={2} direction={"column"} justify={"space-between"}>
                    <VStack>
                        <Tooltip content="主页" positioning={{ placement: "right" }} openDelay={100} closeDelay={100}>
                            <Link to="/" viewTransition>
                                <IconButton variant={"ghost"}>
                                    <Home size={24} />
                                </IconButton>
                            </Link>
                        </Tooltip>
                    </VStack>

                    <VStack>
                        <Tooltip content="配置" positioning={{ placement: "right" }} openDelay={100} closeDelay={100}>
                            <Link to="/settings" viewTransition>
                                <IconButton variant={"ghost"}>
                                    <Settings size={24} />
                                </IconButton>
                            </Link>
                        </Tooltip>
                    </VStack>
                </Flex>
            </VStack>
        </Box>
    );
}
