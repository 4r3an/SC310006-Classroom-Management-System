import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  query,
  where
} from 'firebase/firestore'
import { app } from '../../firebase_config'

function StudentClassroomDetailPage() {
  const db = getFirestore(app)
  const auth = getAuth(app)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // classroomId มาจาก path param
  const { classroomId } = useParams()

  const [profile, setProfile] = useState(null)
  const [classroomInfo, setClassroomInfo] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }

    const loadAll = async () => {
      try {
        // โหลดข้อมูลโปรไฟล์นักเรียน
        const userRef = doc(db, 'users', currentUser.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setProfile(userSnap.data())
        }

        // โหลดข้อมูล classroom
        const classroomRef = doc(db, 'classroom', classroomId)
        const classroomSnap = await getDoc(classroomRef)
        if (classroomSnap.exists()) {
          setClassroomInfo(classroomSnap.data().info || {})
        }

        // สมมติเราจะแสดง quiz จาก checkin “ทั้งหมด” ที่ question_show = true
        // หรือจะแสดงเฉพาะ checkin “status=1” ก็ได้
        // ตัวอย่างด้านล่างคือ “ดึง checkin ทั้งหมด -> ตามด้วย questions ที่ question_show = true”
        const checkinCol = collection(db, 'classroom', classroomId, 'checkin')
        const checkinSnap = await getDocs(checkinCol)
        
        // เก็บ question ทั้งหมดไว้ใน array ตัวเดียว
        let allQuestions = []

        for (const checkinDoc of checkinSnap.docs) {
          // สมมติถ้าจะกรองเฉพาะ checkin ที่ status = 1 ก็ทำ:
          // if (checkinDoc.data().status !== 1) continue

          const checkinId = checkinDoc.id
          const qCol = collection(db, 'classroom', classroomId, 'checkin', checkinId, 'question')
          const qSnap = await getDocs(qCol)

          qSnap.forEach((qDoc) => {
            const qData = qDoc.data()
            // สมมติจะแสดงเฉพาะ question_show === true
            if (qData.question_show === true) {
              allQuestions.push({
                checkinId,
                id: qDoc.id,
                question_no: qData.question_no,
                question_text: qData.question_text,
                question_show: qData.question_show
              })
            }
          })
        }

        // ตัวอย่างสั้น ๆ ว่าเรียงตาม question_no
        allQuestions.sort((a, b) => a.question_no - b.question_no)
        setQuestions(allQuestions)
      } catch (error) {
        console.error('Error loading data for student detail:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [db, currentUser, navigate, classroomId])

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!currentUser) return null
  if (loading) return <div>Loading...</div>

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-2xl mb-6">Student Classroom</div>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="hover:text-blue-300 transition"
          >
            Back to My Classes
          </button>
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
          <h1 className="text-3xl">
            {classroomInfo?.name || 'Unknown'} - Quiz
          </h1>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4">
            Questions (ที่ question_show = true)
          </h2>
          {questions.length === 0 ? (
            <p>No questions yet.</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => (
                <li
                  key={`${q.checkinId}-${q.id}`}
                  className="border p-2 rounded hover:bg-blue-50"
                >
                  <span className="font-semibold">Question #{q.question_no}:</span>{' '}
                  {q.question_text}
                  <span className="ml-4 italic text-sm text-gray-500">
                    (Checkin: {q.checkinId})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default StudentClassroomDetailPage
