import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, updateProfile } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { app } from '../../firebase_config'

function EditProfilePage() {
  const auth = getAuth()
  const db = getFirestore(app)
  const navigate = useNavigate()
  const [user, setUser] = useState(auth.currentUser)
  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // โหลดข้อมูลโปรไฟล์เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      try {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setDisplayName(data.name || '') // เปลี่ยนจาก displayName เป็น name
          setPhotoURL(data.photo || '') // เปลี่ยนจาก photoURL เป็น photo
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()
  }, [user, db])

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
        {photoURL ? (
          <img
            src={photoURL}
            alt="Profile"
            className="w-32 h-32 rounded-full mx-auto mb-4"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">N/A</span>
          </div>
        )}
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
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="กรอก URL รูปโปรไฟล์"
                className="w-full px-3 py-2 border rounded-lg"
              />
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
                onClick={() => { setIsEditing(false); setMessage('') }}
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
              <p className="px-3 py-2 border rounded-lg">{displayName}</p>
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