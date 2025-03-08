import TitleBar from "@/components/TitleBar.tsx";
import { Outlet } from "react-router";
import {Sidebar} from "@/components/Sidebar.tsx";
import { Box, HStack, VStack, Image, Spinner, Text } from "@chakra-ui/react";
import { useBgCaches } from "@/zustand/app";
import { useConf } from "@/zustand/conf";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster"

export default function AppLayout() {
    const conf = useConf();

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);
    }, []);

    useEffect(() => {
        if (conf.osuRootDir == "") {
            conf.autoDetectOsuPath().then(() => {
                if (conf.osuSongsDir == "") {
                    conf.autoDetectOsuSongsPath();
                }
            });
        }
    }, [conf.autoDetectOsuPath, conf.autoDetectOsuSongsPath]);

    return (
        <Box bgSize={"cover"} bgPos={"center"} overflow={"hidden"}>
            <Toaster />
            <Box position="absolute" zIndex={-1} top={0} right={0} width="100%" height="100%" pointerEvents="none">
                <RotatedBg/>
            </Box>
            <Box 
                position="absolute" 
                top={0} 
                right={0} 
                width="100%" 
                height="100%" 
                bgGradient="to-bl" gradientFrom="rgba(0,0,0,0.5)" gradientVia={"rgba(0,0,0,0.2)"} gradientTo="transparent 70%"
                pointerEvents="none"
                borderTopRightRadius="md"
            />
            <Box 
                position="absolute" 
                top={0} 
                left={0} 
                width="30%" 
                height="100%" 
                bgGradient="to-r" gradientFrom="rgba(0,0,0,0.5)" gradientTo="transparent 70%"
                pointerEvents="none"
                borderTopRightRadius="md"
            />
            <HStack height="100vh" gap={0} alignItems="flex-start">
                <Box height="100%">
                    <Sidebar/>
                </Box>
                <VStack width="full" height="full" gap={0}>
                    <TitleBar/>
                    <Outlet />
                </VStack>
            </HStack>
        </Box>
    );
}

const RotatedBg = () => {
    const bgCaches = useBgCaches();
    const timerRef = useRef<number | null>(null);
    
    const [activeIndex, setActiveIndex] = useState(0);
    const [images, setImages] = useState(['', '']);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!bgCaches.bgs && bgCaches.shouldFetchBgs()) {
            setIsLoading(true);
            bgCaches.fetchBgs().finally(() => {
                setIsLoading(false);
            });
        }
    }, [bgCaches.bgs, bgCaches.fetchBgs, bgCaches.shouldFetchBgs]);

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (bgCaches.autoRotation && bgCaches.bgs) {
            timerRef.current = setInterval(() => {
                bgCaches.nextBg();
            }, bgCaches.rotationInterval);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [bgCaches.autoRotation, bgCaches.rotationInterval, bgCaches.nextBg, bgCaches.bgs]);

    // 监听背景URL变化
    useEffect(() => {
        const currentUrl = bgCaches.getCurrentBgUrl() ?? bgCaches.defaultBg;
                    
        // 如果URL已经在数组中，不做任何改变
        if (images.includes(currentUrl)) return;
        
        // 确定非活动的索引
        const inactiveIndex = activeIndex === 0 ? 1 : 0;
        
        // 更新图片数组
        const newImages = [...images];
        newImages[inactiveIndex] = currentUrl;
        setImages(newImages);
        
        // 切换活动索引，触发过渡
        setActiveIndex(inactiveIndex);
    }, [bgCaches.getCurrentBgUrl()]);

    return (
        <Box position="relative" w="full" h="full" overflow="hidden">
            {/* 底层默认背景 - 始终显示，z-index最低 */}
            <Image 
                src={bgCaches.defaultBg} 
                position="absolute"
                top="0"
                left="0"
                w="full" 
                h="full" 
                objectFit="cover"
                zIndex={0}
            />
            
            {/* 第一张轮换图片 */}
            <Image 
                src={images[0]} 
                position="absolute"
                top="0"
                left="0"
                w="full" 
                h="full" 
                objectFit="cover"
                opacity={activeIndex === 0 && images[0] ? 1 : 0}
                transition="opacity 1s ease-in-out"
                zIndex={activeIndex === 0 ? 2 : 1}
            />
            
            {/* 第二张轮换图片 */}
            <Image 
                src={images[1]} 
                position="absolute"
                top="0"
                left="0"
                w="full" 
                h="full" 
                objectFit="cover"
                opacity={activeIndex === 1 && images[1] ? 1 : 0}
                transition="opacity 1s ease-in-out"
                zIndex={activeIndex === 1 ? 2 : 1}
            />
            
            {/* 加载指示器 */}
            {isLoading && (
                <HStack
                    position="absolute"
                    bottom="4px"
                    left="68px"
                    zIndex={3}
                >
                    <Spinner size="xs" color="white" />
                    <Text color="white" fontSize="xs">Loading new background...</Text>
                </HStack>
            )}
        </Box>
    );
}
