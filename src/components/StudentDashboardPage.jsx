import React, { useEffect, useState } from 'react'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  collectionGroup,
  query,
  where,
} from 'firebase/firestore'
import { app } from '../../firebase_config'
import { useNavigate } from 'react-router-dom'

function StudentDashboard() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // รายการห้องเรียนที่นักเรียนคนนี้ลงทะเบียน
  const [myClassrooms, setMyClassrooms] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // state สำหรับ "inline" แสดงรายละเอียดของห้องเรียนที่เลือก
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [questions, setQuestions] = useState([]) // เก็บ quiz จากทุก checkin

  useEffect(() => {
    // ถ้าไม่ได้ล็อกอิน ให้กลับหน้า login
    if (!currentUser) {
      navigate('/')
      return
    }

    // โหลดโปรไฟล์ผู้ใช้ปัจจุบัน
    const loadProfile = async () => {
      try {
        const userDoc = doc(db, 'users', currentUser.uid)
        const userSnap = await getDoc(userDoc)
        if (userSnap.exists()) {
          setProfile(userSnap.data())
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    // โหลดรายชื่อห้องเรียนที่ currentUser เป็น student (stdid == currentUser.uid)
    const loadClassrooms = async () => {
      try {
        setLoading(true)
        // ใช้ collectionGroup เพื่อเจาะ sub-collection "students" ในทุก "classroom"
        const studentsRef = query(
          collectionGroup(db, 'students'),
          where('stdid', '==', currentUser.uid)
        )
        const snapshot = await getDocs(studentsRef)

        // classroomDocPromises จะเก็บ Promise เพื่อดึง parent doc (classroom doc)
        const classroomDocPromises = []
        snapshot.forEach((studentDocSnap) => {
          const classroomDocRef = studentDocSnap.ref.parent.parent
          if (classroomDocRef) {
            classroomDocPromises.push(getDoc(classroomDocRef))
          }
        })

        // รอทุก Promise (ได้เอกสารของ classroom แต่ละห้องที่เราลงทะเบียน)
        const classroomDocs = await Promise.all(classroomDocPromises)
        // สร้าง array เก็บข้อมูลห้องเรียน
        const classroomsData = classroomDocs.map(c => ({
          id: c.id,
          ...c.data()
        }))
        setMyClassrooms(classroomsData)
      } catch (error) {
        console.error('Error loading classrooms:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
    loadClassrooms()
  }, [currentUser, db, navigate])

  // ฟังก์ชัน Sign Out
  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // เมื่อคลิกที่การ์ดห้องเรียน => โหลด Quiz แบบ inline
  const handleEnterClassroom = async (classroom) => {
    setLoading(true)
    try {
      // เซตห้องเรียนที่เลือก
      setSelectedClassroom(classroom)

      // โหลด checkin ทั้งหมดของ classroom นี้
      const checkinSnapshot = await getDocs(
        collection(db, 'classroom', classroom.id, 'checkin')
      )
      let tempQuestions = []

      // วนทุก checkin => โหลด sub-collection 'question'
      for (const cDoc of checkinSnapshot.docs) {
        const cData = cDoc.data()
        // ถ้าต้องการกรองเฉพาะ status=1 => if(cData.status !== 1) continue

        const qCol = collection(
          db,
          'classroom',
          classroom.id,
          'checkin',
          cDoc.id,
          'question'
        )
        const qSnap = await getDocs(qCol)
        qSnap.forEach((qDoc) => {
          const qData = qDoc.data()
          // สมมติจะแสดงเฉพาะ question_show === true
          if (qData.question_show) {
            tempQuestions.push({
              checkinId: cDoc.id,
              id: qDoc.id,
              ...qData
            })
          }
        })
      }

      // เรียงคำถามตาม question_no
      tempQuestions.sort((a, b) => (a.question_no || 0) - (b.question_no || 0))
      setQuestions(tempQuestions)
    } catch (error) {
      console.error('Error loading quiz inline:', error)
    } finally {
      setLoading(false)
    }
  }

  // ปุ่ม Back กลับมาดูรายการห้องปกติ
  const handleBackToList = () => {
    setSelectedClassroom(null)
    setQuestions([])
  }

  // ถ้าไม่ได้ล็อกอินให้ return null (กันไว้สองชั้น)
  if (!currentUser) {
    return null
  }

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-2xl mb-6">Student Classroom</div>
          <div className="mb-4">
            {!selectedClassroom ? (
              <button
                onClick={() => navigate('/student-dashboard')}
                className="hover:text-blue-300 transition"
              >
                My Classes
              </button>
            ) : (
              <button
                onClick={handleBackToList}
                className="hover:text-blue-300 transition"
              >
                Back to My Classes
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center pt-6 border-t border-blue-700 cursor-pointer">
          {profile && profile.photo ? (
            <img
              src={profile.photo}
              alt="Profile"
              className="w-12 h-12 rounded-full mr-4"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mr-4">
              <span className="text-lg text-white">N/A</span>
            </div>
          )}
          <div>
            <p className="font-bold">{profile?.name || currentUser.email}</p>
            <p className="text-sm">Status: Student</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-blue-50 p-8 overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          {!selectedClassroom ? (
            <h1 className="text-3xl">My Classes</h1>
          ) : (
            <h1 className="text-3xl">
              Classroom : {selectedClassroom.info?.name || 'Unknown'}
            </h1>
          )}
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>

        {loading && <p>Loading...</p>}

        {/* 1) แสดงรายการห้องเรียน ถ้าไม่ได้เลือกห้องไหน */}
        {!loading && !selectedClassroom && (
          <>
            {myClassrooms.length === 0 ? (
              <p>You are not registered in any classroom yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myClassrooms.map((classroom) => {
                  const info = classroom.info || {}
                  return (
                    <div
                      key={classroom.id}
                      className="border rounded-lg shadow-md p-4 bg-white hover:shadow-lg transition cursor-pointer"
                      onClick={() => handleEnterClassroom(classroom)}
                    >
                      {info.photo ? (
                        <img
                          src={info.photo}
                          alt={info.name}
                          className="w-full h-40 object-cover rounded-md mb-4"
                        />
                      ) : (
                        <div className="w-full h-40 bg-blue-300 flex items-center justify-center rounded-md mb-4">
                          <span className="text-white">No Image</span>
                        </div>
                      )}
                      <h2 className="text-xl font-bold">{info.name}</h2>
                      <p>Code: {info.code}</p>
                      <p>Room: {info.room}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* 2) แสดง Quiz (inline) ถ้าเลือกห้องแล้ว */}
        {!loading && selectedClassroom && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Quiz (question_show=true)</h2>
            {questions.length === 0 ? (
              <p>No quiz found.</p>
            ) : (
              <ul className="space-y-2">
                {questions.map((q) => (
                  <li key={q.checkinId + '-' + q.id} className="border p-2 rounded">
                    <span className="font-semibold">
                      #{q.question_no}:
                    </span>{' '}
                    {q.question_text}
                    <span className="text-gray-500 text-sm ml-4">
                      (Checkin: {q.checkinId})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
