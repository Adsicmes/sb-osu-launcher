"use client";

import { Avatar, VStack, HStack, Button, Spacer, Text, Presence, Box, Image } from "@chakra-ui/react";
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
import { useState } from "react";

export function HomePage() {
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

    return (
        <DrawerRoot open={openServerSwitcher} onOpenChange={(e) => setOpenServerSwitcher(e.open)} placement={"bottom"} >
            <DrawerBackdrop />
            <DrawerTrigger asChild>
                <Box cursor={"pointer"} userSelect={"none"}>
                    <Image src="/Osu!_Logo_2016.svg" w={"64px"} h={"64px"} />
                </Box>
            </DrawerTrigger>
            <DrawerContent offset="8" rounded="md" bg={"transparent"} backdropFilter="blur(4px) grayscale(40%)" h={"60%"}>
                <DrawerHeader>
                    <DrawerTitle>切换服务器</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
                        labore et dolore magna aliqua.
                    </p>
                </DrawerBody>
            </DrawerContent>
        </DrawerRoot>
    );
}
