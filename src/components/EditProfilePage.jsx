import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, updateProfile, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { app } from '../../firebase_config'

function EditProfilePage() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const navigate = useNavigate()
  
  // Add auth loading state
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
      
      // Redirect to login if not authenticated
      if (!currentUser && !authLoading) {
        navigate('/')
      }
    })
    
    // Cleanup subscription
    return () => unsubscribe()
  }, [auth, navigate, authLoading])

  // โหลดข้อมูลโปรไฟล์เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    // Only load profile when auth is confirmed and user exists
    if (authLoading || !user) return

    const loadProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setDisplayName(data.name || '')
          setPhotoURL(data.photo || '')
          setImagePreviewUrl(data.photo || '')
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()
  }, [user, db, authLoading])

  const handlePhotoURLChange = (e) => {
    const url = e.target.value
    setPhotoURL(url)
    
    // Reset error state when URL changes
    setImageError(false)
    
    // Only update preview if URL is not empty
    if (url.trim()) {
      setImagePreviewUrl(url)
    } else {
      setImagePreviewUrl('')
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    
    setIsSaving(true)
    setMessage('')

    try {
      // อัปเดตข้อมูลใน Firebase Auth
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL
      })

      // อัปเดตข้อมูลใน Firestore
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, {
        name: displayName, // เปลี่ยนเป็น name
        photo: photoURL,   // เปลี่ยนเป็น photo
        email: user.email,
        classroom: {
          status: 1 // เพิ่ม status สำหรับเก็บสถานะการเป็นอาจารย์
        }
      }, { merge: true })

      setMessage('อัปเดตโปรไฟล์สำเร็จแล้ว')
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์')
    }
    setIsSaving(false)
  }

  // Generate initials from name or email
  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'N/A';
  }

  // Generate a background color based on user's ID for consistent avatar colors
  const getAvatarColor = () => {
    if (!user?.uid) return 'bg-blue-600';
    
    const colors = [
      'bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600', 
      'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600'
    ];
    
    const index = user.uid.split('').reduce(
      (acc, char) => acc + char.charCodeAt(0), 0
    ) % colors.length;
    
    return colors[index];
  }

  // Show loading state while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-800">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>ผู้ใช้ยังไม่ได้เข้าสู่ระบบ.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gray-100 p-8">
      {/* ปุ่มกลับไปที่แดชบอร์ดที่มุมซ้ายบน */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
      >
        ไปที่แดชบอร์ด
      </button>
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">แก้ไขโปรไฟล์</h1>
        
        {/* Profile Picture Display */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            {imagePreviewUrl && !imageError ? (
              <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-200">
                <img
                  src={imagePreviewUrl}
                  alt="Profile"
                  className="object-cover w-full h-full"
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-2xl ${getAvatarColor()}`}>
                {getInitials()}
              </div>
            )}
            
            {isEditing && (
              <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">อีเมล</label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-200 cursor-not-allowed"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">ชื่อ</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">URL รูปโปรไฟล์</label>
              <input
                type="text"
                value={photoURL}
                onChange={handlePhotoURLChange}
                placeholder="กรอก URL รูปโปรไฟล์"
                className="w-full px-3 py-2 border rounded-lg"
              />
              {imageError && photoURL && (
                <p className="mt-1 text-sm text-red-500">
                  ไม่สามารถโหลดรูปภาพได้ กรุณาตรวจสอบ URL
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                * ใส่ URL รูปภาพจากอินเทอร์เน็ต เช่น https://example.com/image.jpg
              </p>
            </div>
            {message && (
              <div className="mb-4 text-green-500">{message}</div>
            )}
            <div className="flex justify-between">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
              <button
                type="button"
                onClick={() => { 
                  setIsEditing(false); 
                  setMessage('');
                  setImagePreviewUrl(photoURL);
                  setImageError(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition duration-300"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">อีเมล</label>
              <p className="px-3 py-2 border rounded-lg bg-gray-200">{user.email}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">ชื่อ</label>
              <p className="px-3 py-2 border rounded-lg">{displayName || 'ไม่ได้ระบุ'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">URL รูปโปรไฟล์</label>
              <p className="px-3 py-2 border rounded-lg">{photoURL}</p>
            </div>
            <button
              type="button"
              onClick={() => { setIsEditing(true); setMessage('') }}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
            >
              แก้ไขโปรไฟล์
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditProfilePage