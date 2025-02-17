import React from 'react'
import { useNavigate } from 'react-router-dom'

function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-12 shadow-xl w-full max-w-md transform transition hover:scale-105 text-center">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">
          ยินดีต้อนรับสู่ระบบจัดการห้องเรียน
        </h1>
        <p className="text-lg text-gray-700 mb-8">
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition duration-300 shadow-lg"
        >
          เริ่มต้นใช้งาน
        </button>
      </div>
    </div>
  )
}

export default WelcomePage