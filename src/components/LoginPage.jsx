import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { app } from '../../firebase_config'

function Login() {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const auth = getAuth(app)
  const googleProvider = new GoogleAuthProvider()

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log('User:', result.user)
      navigate('/dashboard')
    } catch (error) {
      setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-12 shadow-xl w-full max-w-md transform transition hover:scale-105">
        <h2 className="text-4xl font-bold text-blue-900 mb-8 text-center">เข้าสู่ระบบ</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        <div className="space-y-6">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition duration-300 shadow-lg"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-6 h-6"
            />
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login