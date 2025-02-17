import React from 'react'
import { useNavigate } from 'react-router-dom'

function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-xl">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to Classroom Management System
          </h1>
          <p className="text-xl text-gray-100 mb-8">
            Streamline your classroom operations with our comprehensive management solution
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold 
                     hover:bg-blue-50 transition duration-300 shadow-lg"
          >
            Get Started
          </button>
        </div>
        
        <div className="text-white/80 text-sm">
          © 2025 Classroom Management System. All rights reserved.
        </div>
      </div>
    </div>
  )
}

export default WelcomePage