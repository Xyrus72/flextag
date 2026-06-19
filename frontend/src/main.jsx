import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from "react-router-dom";
import { RouterProvider } from "react-router-dom";
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Root from './Component/root/root.jsx'
import Home from './Component/home/home.jsx'
import MediTrackLanding from './Component/landing/MediTrackLanding.jsx'
import PatientDashboard from './Component/dashboard/PatientDashboard.jsx'
import PharmacyDashboard from './Component/dashboard/PharmacyDashboard.jsx'
import DoctorDashboard from './Component/dashboard/DoctorDashboard.jsx'
import AdminDashboard from './Component/dashboard/AdminDashboard.jsx'

const router = createBrowserRouter([
  { path: "/",                  element: <MediTrackLanding /> },
  { path: "/dashboard/patient", element: <PatientDashboard /> },
  { path: "/dashboard/pharmacy",element: <PharmacyDashboard /> },
  { path: "/dashboard/doctor",  element: <DoctorDashboard /> },
  { path: "/dashboard/admin",   element: <AdminDashboard /> },
  {
    path: "/app",
    element: <Root />,
    children: [{ index: true, element: <Home /> }]
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)

