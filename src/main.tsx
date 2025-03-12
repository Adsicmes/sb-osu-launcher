import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "./components/ui/provider";
import { BrowserRouter, Route, Routes } from "react-router";
import AppLayout from "./pages/AppLayout";
import { HomePage } from "./pages/HomePage";
import { SettingPage } from "./pages/SettingPage";
import "./i18n";

import "@/fonts.css";
import { ColorModeProvider } from "@/components/ui/color-mode";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Provider>
            <ColorModeProvider forcedTheme="dark">
                <BrowserRouter>
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route index element={<HomePage />} />
                            <Route path="/settings" element={<SettingPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ColorModeProvider>
            {/* <AppLayout /> */}
        </Provider>
    </React.StrictMode>
);
