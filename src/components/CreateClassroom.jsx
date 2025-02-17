import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { app } from '../../firebase_config'
import { v4 as uuidv4 } from 'uuid'

const CreateClassroom = () => {
  const [classroomCode, setClassroomCode] = useState('')
  const [classroomName, setClassroomName] = useState('')
  const [room, setRoom] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = getAuth(app)
  const db = getFirestore(app)

  const handleCreateClassroom = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cid = uuidv4() // สร้างรหัสสุ่มสำหรับห้องเรียน
      const classroomRef = doc(db, 'classroom', cid)
      await setDoc(classroomRef, {
        owner: auth.currentUser?.uid, // เจ้าของห้องเรียน
        info: {
          code: classroomCode,      // รหัสห้องเรียน
          name: classroomName,      // ชื่อห้องเรียน
          photo: photoURL || '',    // URL รูปภาพ (ถ้ามี)
          room: room,               // ห้องเรียน
        },
        cid: cid, // รหัสห้องเรียน (ถ้ามี)
      })
      alert('สร้างห้องเรียนสำเร็จแล้ว!')
      navigate('/dashboard')
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้างห้องเรียน:', error)
      alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center">สร้างห้องเรียน</h2>
        <form onSubmit={handleCreateClassroom} className="space-y-6">
          <input
            type="text"
            placeholder="รหัสห้องเรียน"
            value={classroomCode}
            onChange={(e) => setClassroomCode(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <input
            type="text"
            placeholder="ชื่อห้องเรียน"
            value={classroomName}
            onChange={(e) => setClassroomName(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <input
            type="text"
            placeholder="ห้องเรียน"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <input
            type="url"
            placeholder="URL รูปภาพ (ถ้ามี)"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
            disabled={loading}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างห้องเรียน'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateClassroom