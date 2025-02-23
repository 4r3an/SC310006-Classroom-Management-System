import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { app } from '../firebase_config'

function EditClassroom() {
  const { cid } = useParams()
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)
  const currentUser = auth.currentUser

  const [classroom, setClassroom] = useState(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState('')
  const [room, setRoom] = useState('')
  const [students, setStudents] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // โหลดข้อมูลห้องเรียน พร้อมนักเรียนและเช็คอิน
  useEffect(() => {
    if (cid) {
      const classroomRef = doc(db, 'classroom', cid)
      getDoc(classroomRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data()
            // ตรวจสอบว่าเป็นเจ้าของห้องเรียนหรือไม่
            if (data.owner !== currentUser.uid) {
              setError('สิทธิ์ไม่พอ คุณไม่ใช่เจ้าของห้องเรียนนี้.')
              return
            }
            setClassroom(data)
            setCode(data.info.code)
            setName(data.info.name)
            setPhoto(data.info.photo)
            setRoom(data.info.room)
          } else {
            setError('ไม่พบห้องเรียน.')
          }
        })
        .catch((err) => {
          console.error(err)
          setError('เกิดข้อผิดพลาดในการดึงข้อมูลห้องเรียน.')
        })

      // โหลดนักเรียนที่ลงทะเบียน
      const studentsRef = collection(db, 'classroom', cid, 'students')
      getDocs(studentsRef)
        .then((querySnapshot) => {
          const studentsList = []
          querySnapshot.forEach((doc) => {
            studentsList.push({ id: doc.id, ...doc.data() })
          })
          setStudents(studentsList)
        })
        .catch((err) => console.error('เกิดข้อผิดพลาดในการดึงนักเรียน: ', err))

      // โหลดกิจกรรมเช็คอิน
      const checkinRef = collection(db, 'classroom', cid, 'checkin')
      getDocs(checkinRef)
        .then((querySnapshot) => {
          const checkinList = []
          querySnapshot.forEach((doc) => {
            checkinList.push({ id: doc.id, ...doc.data() })
          })
          setCheckins(checkinList)
        })
        .catch((err) => console.error('เกิดข้อผิดพลาดในการดึงกิจกรรมเช็คอิน: ', err))
    }
  }, [cid, currentUser.uid, db])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const classroomRef = doc(db, 'classroom', cid)
      await updateDoc(classroomRef, {
        'info.code': code,
        'info.name': name,
        'info.photo': photo,
        'info.room': room,
      })
      setMessage('แก้ไขห้องเรียนสำเร็จแล้ว.')
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการแก้ไขห้องเรียน: ', err)
      setMessage('แก้ไขห้องเรียนไม่สำเร็จ.')
    }
    setLoading(false)
  }

  if (error) {
    return <div className="p-6 text-red-600 text-center">{error}</div>
  }

  if (!classroom) {
    return <div className="p-6 text-center">กำลังโหลดข้อมูลห้องเรียน...</div>
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-blue-900">แก้ไขห้องเรียน</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          กลับไปที่แดชบอร์ด
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <form onSubmit={handleUpdate}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">รหัสวิชา</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">ชื่อวิชา</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">URL รูปภาพ</label>
            <input
              type="text"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">ห้องเรียน</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? 'กำลังแก้ไข...' : 'บันทึกการแก้ไข'}
          </button>
          {message && <p className="mt-4 text-green-600 text-center">{message}</p>}
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">นักเรียนที่ลงทะเบียน</h2>
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-2 text-left">รหัสนักเรียน</th>
                  <th className="border p-2 text-left">ชื่อ</th>
                  <th className="border p-2 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50">
                    <td className="border p-2">{student.stdid}</td>
                    <td className="border p-2">{student.name}</td>
                    <td className="border p-2">
                      {student.status === 0 ? 'รออนุมัติ' : 'ยืนยันแล้ว'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-700">ยังไม่มีนักเรียนที่ลงทะเบียน</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-blue-900 mb-4">กิจกรรมเช็คอิน</h2>
        {checkins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-2 text-left">หมายเลขเช็คอิน</th>
                  <th className="border p-2 text-left">รหัส</th>
                  <th className="border p-2 text-left">วันที่</th>
                  <th className="border p-2 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((checkin) => (
                  <tr key={checkin.id} className="hover:bg-blue-50">
                    <td className="border p-2">{checkin.id}</td>
                    <td className="border p-2">{checkin.code}</td>
                    <td className="border p-2">{checkin.date}</td>
                    <td className="border p-2">
                      {checkin.status === 0
                        ? 'ยังไม่เริ่ม'
                        : checkin.status === 1
                        ? 'กำลังดำเนินการ'
                        : 'เสร็จสิ้น'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-700">ไม่มีกิจกรรมเช็คอิน</p>
        )}
      </div>
    </div>
  )
}

export default EditClassroom