import { createBrowserRouter, Outlet } from "react-router-dom";
import NetraVoiceProvider from "../voice/NetraVoiceProvider.jsx";

import HomePage from "../pages/HomePage.jsx";
import FindPage from "../pages/FindPage.jsx";
import CameraPage from "../pages/CameraPage.jsx";
import ResultPage from "../pages/ResultPage.jsx";
import HistoryPage from "../pages/HistoryPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import GuidePage from "../pages/GuidePage.jsx";
import WalkAssistPage from "../pages/WalkAssitPage.jsx";
import EmergencyCallPage from "../pages/EmergencyCallPage.jsx";

function RootLayout() {
  return <NetraVoiceProvider><Outlet /></NetraVoiceProvider>;
}

export const router = createBrowserRouter([{ element: <RootLayout />, children: [
  { path: "/", element: <HomePage /> },
  { path: "/find", element: <FindPage /> },
  { path: "/guide", element: <GuidePage /> },
  { path: "/walk-assist", element: <WalkAssistPage /> },
  { path: "/camera/:mode", element: <CameraPage /> },
  { path: "/result", element: <ResultPage /> },
  { path: "/history", element: <HistoryPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/emergency-call", element: <EmergencyCallPage /> },
  { path: "*", element: <NotFoundPage /> },
]}]);
