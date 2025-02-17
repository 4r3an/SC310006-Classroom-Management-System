import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { app } from '../../firebase_config'

function Dashboard() {
  const navigate = useNavigate()
  const auth = getAuth()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
          >
            Sign Out
          </button>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <p className="text-gray-600">
            Welcome, {auth.currentUser?.email || 'User'}
            <button onClick={() => navigate('/create-classroom')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
  Create Classroom
</button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard