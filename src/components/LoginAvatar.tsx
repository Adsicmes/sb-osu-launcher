import {
    Avatar,
    Text,
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

export function LoginAvatar() {
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