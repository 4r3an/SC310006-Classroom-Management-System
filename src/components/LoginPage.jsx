import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { app } from '../../firebase_config'

function Login() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = getAuth(app)
  const googleProvider = new GoogleAuthProvider()
  const db = getFirestore(app)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      const userDocRef = doc(db, 'users', user.uid)

      // Check if the document exists.
      const userDocSnap = await getDoc(userDocRef)
      
      if (!userDocSnap.exists()) {
        // Create minimal user record
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          classroom: {
            cid: '',
            status: 2 // default status for student
          }
        })
        
        // New user - redirect to registration
        navigate('/register')
        return
      }
      
      // User exists - check if they've completed registration (has phone number)
      const userData = userDocSnap.data()
      
      if (!userData.phone) {
        // Incomplete registration
        navigate('/register')
        return
      }
      
      // Complete registration - redirect based on role
      const userStatus = userData?.classroom?.status
      if (userStatus === 1) {
        navigate('/dashboard')
      } else {
        navigate('/student-dashboard')
      }
      
    } catch (error) {
      console.error(error)
      setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Message */}
      <div className="w-1/2 bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-5xl font-ChakraPetchTH text-white mb-4">ยินดีต้อนรับสู่</h1>
          <h2 className="text-4xl font-ChakraPetchTH text-white mb-2">ระบบจัดการห้องเรียน</h2>
          <h3 className="text-3xl font-InterEN text-white">Classroom Management System</h3>
        </div>
      </div>

      {/* Right Side - Google Login Button */}
      <div className="w-1/2 bg-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center w-full max-w-md">
          <h2 className="text-3xl font-ChakraPetchTH text-gray-800 mb-8">เข้าสู่ระบบ</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-6 w-full">
              {error}
            </div>
          )}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-80 h-16 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 text-xl font-ChakraPetchTH rounded-xl transition duration-300 shadow-lg border-2 border-gray-200 hover:border-blue-500 group mx-auto"
          >
            {loading ? (
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            ) : (
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-7 h-7"
              />
            )}
            <span className="group-hover:text-blue-600">
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
            </span>
          </button>
          <h3 className='p-6 text-red-500 font-ChakraPetchTH'>ลงทะเบียนครั้งแรกสำหรับอาจารย์ โปรดติดต่อแอดมิน</h3>
        </div>
      </div>
    </div>
  )
}

export default Login