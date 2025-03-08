import {Box, HStack, IconButton, Spacer} from "@chakra-ui/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {Minus, X} from "lucide-react";

export default function TitleBar() {
    return(
        <HStack data-tauri-drag-region gap={0} w={"full"}>
            <Spacer data-tauri-drag-region></Spacer>
            <IconButton size={"sm"} variant={"ghost"} rounded={"none"} onClick={async () => {
                await getCurrentWindow().minimize();
            }}>
                <Minus color="#ffffff"/>
            </IconButton>
            <IconButton size={"sm"} variant={"ghost"} rounded={"none"} onClick={async() => {
                await getCurrentWindow().close();
            }}>
                <X color="#ffffff"/>
            </IconButton>
            <Box width={"4px"}></Box>
        </HStack>
    )
}