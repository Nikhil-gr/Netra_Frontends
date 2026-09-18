import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage.jsx'
import FindPage from '../pages/FindPage.jsx'
import CameraPage from '../pages/CameraPage.jsx'
import ResultPage from '../pages/ResultPage.jsx'
import HistoryPage from '../pages/HistoryPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/find', element: <FindPage /> },
  { path: '/camera/:mode', element: <CameraPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/history', element: <HistoryPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '*', element: <NotFoundPage /> },
])
