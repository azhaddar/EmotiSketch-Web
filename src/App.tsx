import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import AddPatient from "./pages/AddPatient";
import EditPatient from "./pages/EditPatient";
import EditUser from "./pages/EditUser"; // Add this import
import AddUser from "./pages/AddUser";
// FIX 1: Ensure this matches your file name (UsersManagement vs UserManagement)
import UsersManagement from "./pages/UserManagement";
import ChildrenProgress from "./pages/ChildrenProgress";
import ChildProgressDetail from "./pages/ChildProgressDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard Group */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/add" element={<AddPatient />} />
          {/* FIX 2: Removed the ";" that was at the end of this line */}
          <Route path="children" element={<ChildrenProgress />} />
          <Route path="children/:id" element={<ChildProgressDetail />} />
          <Route path="patients/edit/:id" element={<EditPatient />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="users/add" element={<AddUser />} />
          <Route path="users/edit/:id" element={<EditUser />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
