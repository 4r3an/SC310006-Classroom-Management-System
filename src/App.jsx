import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import WelcomePage from './components/WelcomePage'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import CreateClassroom from './components/CreateClassroom';
import EditProfile from './components/EditProfile'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create-classroom" element={<CreateClassroom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/edit-profile" element={<EditProfile />} />
      </Routes>
    </Router>
  )
}

export default App