import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import Staff from "./pages/Staff";
import Departments from "./pages/Departments";
import Beds from "./pages/Beds";
import Appointments from "./pages/Appointments";
import Admissions from "./pages/Admissions";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import WaitingRoom from "./pages/WaitingRoom";

import OpdAnalytics from "./pages/OpdAnalytics";
import PatientTracking from "./pages/PatientTracking";
import AccessDenied from "./pages/AccessDenied";
import { RequireAuth } from "./context/AuthContext";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/track/:trackingCode" element={<PatientTracking />} />

      <Route path="/dashboard" element={<RequireAuth allowedRoles={["Admin"]}><Dashboard /></RequireAuth>} />
      <Route path="/patients" element={<RequireAuth allowedRoles={["Admin", "Receptionist"]}><Patients /></RequireAuth>} />
      <Route path="/doctors" element={<RequireAuth allowedRoles={["Admin", "Receptionist"]}><Doctors /></RequireAuth>} />
      <Route path="/staff" element={<RequireAuth allowedRoles={["Admin"]}><Staff /></RequireAuth>} />
      <Route path="/departments" element={<RequireAuth allowedRoles={["Admin"]}><Departments /></RequireAuth>} />
      <Route path="/beds" element={<RequireAuth allowedRoles={["Admin"]}><Beds /></RequireAuth>} />
      <Route path="/appointments" element={<RequireAuth allowedRoles={["Admin"]}><Appointments /></RequireAuth>} />
      <Route path="/admissions" element={<RequireAuth allowedRoles={["Admin"]}><Admissions /></RequireAuth>} />
      <Route path="/receptionist" element={<RequireAuth allowedRoles={["Admin", "Receptionist"]}><ReceptionistDashboard /></RequireAuth>} />
      <Route path="/waiting-room" element={<RequireAuth allowedRoles={["Admin", "Receptionist"]}><WaitingRoom /></RequireAuth>} />
      
      <Route path="/opd-analytics" element={<RequireAuth allowedRoles={["Admin"]}><OpdAnalytics /></RequireAuth>} />
      <Route path="/access-denied" element={<AccessDenied />} />
    </Routes>
  );
}

export default App;
