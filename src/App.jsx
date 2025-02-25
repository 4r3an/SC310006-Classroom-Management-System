import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import EditProfilePage from './components/EditProfilePage'
import EditClassroom from './components/EditClassroom'
import StudentDashboardPage from './components/StudentDashboardPage'
import CreateQuizPage from './components/CreateQuizPage'
import StudentClassroomDetailPage from './components/StudentClassroomDetailPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/student-dashboard" element={<StudentDashboardPage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/edit-classroom/:cid" element={<EditClassroom />} />
        <Route path="/create-quiz/:classroomId" element={<CreateQuizPage />} />
        <Route path="/student-classroom/:classroomId" element={<StudentClassroomDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App