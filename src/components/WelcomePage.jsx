import React from 'react'
import { useNavigate } from 'react-router-dom'
//import

function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-5 shadow-xl w-full max-w-md transform transition hover:scale-105 text-center">
        <h1 className="text-xl font-ChakraPetchTH text-blue-900 mb-5">ยินดีต้อนรับสู่</h1>
        <h1 className='text-4xl font-ChakraPetchTH text-blue-900 mb-'>ระบบจัดการห้องเรียน</h1>
        <h1 className='text-4xl font-InterEN text-blue-900 mb-2'>Classroom Management System</h1>
        <p className="text-lg text-gray-700 mb-8">
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition duration-300 shadow-lg  text-xl font-ChakraPetchTH"
        >
          เริ่มต้นใช้งาน
        </button>
      </div>
    </div>
  )
}

export default WelcomePage