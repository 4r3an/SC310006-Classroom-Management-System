import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, updatePassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { app } from '../../firebase_config'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

function RegisterPage() {
  const navigate = useNavigate()
  const auth = getAuth(app)
  const db = getFirestore(app)
  
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  
  // Check authentication state on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      
      if (user) {
        // Check if user already has complete profile
        try {
          const userDocRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserData(userData)
            
            // If user has phone number, they've completed registration
            if (userData.phone) {
              // Route based on user role
              const userStatus = userData?.classroom?.status
              if (userStatus === 1) {
                navigate('/dashboard')
              } else {
                navigate('/student-dashboard')
              }
            } else {
              // Pre-fill name from Google if available
              if (user.displayName) {
                setFormData(prev => ({...prev, fullName: user.displayName}))
              }
            }
          }
        } catch (error) {
          console.error("Error checking user data:", error)
        }
      } else {
        // No user is signed in, redirect to login
        navigate('/')
      }
      
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [auth, db, navigate])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({...prev, [name]: value}))
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({...prev, [name]: ''}))
    }
  }
  
  const handlePhoneChange = (value) => {
    setFormData(prev => ({...prev, phone: value}))
    if (errors.phone) {
      setErrors(prev => ({...prev, phone: ''}))
    }
  }
  
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'กรุณากรอกชื่อ-นามสกุล'
    }
    
    if (formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    }
    
    if (!formData.phone || formData.phone.length < 8) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    
    if (!validateForm()) return
    
    try {
      setLoading(true)
      
      if (!currentUser) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน")
      }
      
      // Update user password if using email authentication
      if (currentUser.providerData.some(p => p.providerId === 'password')) {
        await updatePassword(currentUser, formData.password)
      }
      
      // Update user profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid)
      
      // Determine if user already has a document
      const userSnapshot = await getDoc(userRef)
      
      if (userSnapshot.exists()) {
        // Update existing document
        await updateDoc(userRef, {
          name: formData.fullName,
          phone: formData.phone,
          // Preserve existing fields
          email: currentUser.email,
          photo: currentUser.photoURL,
          // If classroom status doesn't exist, set default to student (2)
          classroom: userSnapshot.data().classroom || { cid: '', status: 2 }
        })
      } else {
        // Create new document
        await setDoc(userRef, {
          name: formData.fullName,
          email: currentUser.email,
          phone: formData.phone,
          photo: currentUser.photoURL,
          classroom: { cid: '', status: 2 } // Default as student
        })
      }
      
      // Get updated user data to determine redirect
      const updatedUserDoc = await getDoc(userRef)
      const updatedUserData = updatedUserDoc.data()
      
      // Redirect based on user role
      if (updatedUserData.classroom?.status === 1) {
        navigate('/dashboard')
      } else {
        navigate('/student-dashboard')
      }
    } catch (error) {
      console.error("Registration error:", error)
      setSubmitError(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = () => {
    // Sign out and redirect to login
    auth.signOut().then(() => {
      navigate('/')
    })
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-blue-800 font-ChakraPetchTH">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Message */}
      <div className="w-1/2 bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-5xl font-ChakraPetchTH text-white mb-4">ลงทะเบียน</h1>
          <h2 className="text-4xl font-ChakraPetchTH text-white mb-3">ข้อมูลส่วนตัว</h2>
          <h3 className="text-3xl font-InterEN text-white">Complete Your Profile</h3>
          <div className="mt-12 w-24 h-1 bg-white/50 mx-auto rounded-full"></div>
        </div>
      </div>
      
      {/* Right Side - Registration Form */}
      <div className="w-1/2 bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-ChakraPetchTH text-gray-800 mb-2">กรอกข้อมูลเพิ่มเติม</h2>
            <p className="text-gray-500 font-ChakraPetchTH">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อเข้าใช้งานระบบ</p>
          </div>
          
          {submitError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 shadow-sm">
              <p className="font-ChakraPetchTH">{submitError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white/80 rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="mb-5">
              <label className="block font-ChakraPetchTH text-gray-700 text-sm font-medium mb-2" htmlFor="fullName">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                placeholder="ชื่อ นามสกุล"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border font-ChakraPetchTH border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {errors.fullName && (
                <p className="text-red-500 font-ChakraPetchTH text-xs mt-1">{errors.fullName}</p>
              )}
            </div>
            
            <div className="mb-5">
              <label className="block font-ChakraPetchTH text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border font-ChakraPetchTH border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {errors.password && (
                <p className="text-red-500 font-ChakraPetchTH text-xs mt-1">{errors.password}</p>
              )}
            </div>
            
            <div className="mb-5">
              <label className="block font-ChakraPetchTH text-gray-700 text-sm font-medium mb-2" htmlFor="confirmPassword">
                ยืนยันรหัสผ่าน
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                placeholder="ยืนยันรหัสผ่าน"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border font-ChakraPetchTH border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 font-ChakraPetchTH text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block font-ChakraPetchTH text-gray-700 text-sm font-medium mb-2" htmlFor="phone">
                เบอร์โทรศัพท์
              </label>
              <PhoneInput
                country={'th'}
                value={formData.phone}
                onChange={handlePhoneChange}
                inputProps={{
                  name: 'phone',
                  required: true,
                  className: "w-full px-4 py-3 pl-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                }}
                containerClass="relative"
                buttonStyle={{
                  background: 'transparent',
                  border: 'none',
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10
                }}
                dropdownStyle={{
                  width: '300px'
                }}
                containerStyle={{
                  width: '100%',
                  height: '48px'
                }}
                enableSearch={true}
                searchPlaceholder="ค้นหาประเทศ..."
              />
              {errors.phone && (
                <p className="text-red-500 font-ChakraPetchTH text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-ChakraPetchTH py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                ลงทะเบียน
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-700 text-white font-ChakraPetchTH py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage