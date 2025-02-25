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
  setDoc
} from 'firebase/firestore'
import { app } from '../../firebase_config'
import { useNavigate } from 'react-router-dom'

function StudentDashboard() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // รายการห้องเรียนที่นักเรียนลงทะเบียน
  const [myClassrooms, setMyClassrooms] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // เมื่อคลิกเข้าห้องเรียน => ดู quiz แบบ inline
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [questions, setQuestions] = useState([])

  // เก็บคำตอบของนักเรียนใน state (key = questionDocId)
  const [answersInput, setAnswersInput] = useState({})

  // Add this near the top of the StudentDashboard component, with other state declarations
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }

    // โหลดโปรไฟล์ผู้ใช้ (ชื่อนักเรียน, รูปโปรไฟล์ ฯลฯ)
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

    // โหลดห้องเรียนทั้งหมดที่มี sub-collection "students" แล้ว doc(...).stdid == currentUser.uid
    const loadClassrooms = async () => {
      try {
        setLoading(true)
        const studentsRef = query(
          collectionGroup(db, 'students'),
          where('stdid', '==', currentUser.uid)
        )
        const snapshot = await getDocs(studentsRef)
        const parentDocPromises = []
        snapshot.forEach((docSnap) => {
          const classroomDocRef = docSnap.ref.parent.parent
          if (classroomDocRef) {
            parentDocPromises.push(getDoc(classroomDocRef))
          }
        })
        const classroomDocs = await Promise.all(parentDocPromises)
        const classroomsData = classroomDocs.map((c) => ({
          id: c.id,
          ...c.data(),
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

  // ออกจากระบบ
  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // เมื่อคลิกห้องเรียน => โหลดคำถาม (quiz) ที่ question_show = true
  const handleEnterClassroom = async (classroom) => {
    setLoading(true)
    try {
      setSelectedClassroom(classroom)
      setAnswersInput({}) // เคลียร์คำตอบเก่า

      // โหลดเอกสาร checkin ทั้งหมดของห้อง (classroom.id)
      const checkinSnapshot = await getDocs(
        collection(db, 'classroom', classroom.id, 'checkin')
      )

      let tempQuestions = []
      // สำหรับแต่ละ checkin => ไปดู sub-collection question
      for (const cDoc of checkinSnapshot.docs) {
        const cData = cDoc.data()
        const qCol = collection(db, 'classroom', classroom.id, 'checkin', cDoc.id, 'question')
        const qSnap = await getDocs(qCol)
        qSnap.forEach((qDoc) => {
          const qData = qDoc.data()
          // เก็บเฉพาะ question_show = true
          if (qData.question_show) {
            tempQuestions.push({
              checkinId: cDoc.id,
              checkinCode: cData.code || '-', // เก็บ code เพื่อนำไปโชว์หลังคำถาม
              questionDocId: qDoc.id,
              ...qData
            })
          }
        })
      }
      // เรียงตาม question_no
      tempQuestions.sort((a, b) => (a.question_no || 0) - (b.question_no || 0))
      setQuestions(tempQuestions)
    } catch (error) {
      console.error('Error loading quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  // ปิดมุมมอง quiz กลับสู่รายชื่อห้องเรียน
  const handleBackToList = () => {
    setSelectedClassroom(null)
    setQuestions([])
    setAnswersInput({})
  }

  // เปลี่ยนค่าคำตอบใน state
  const handleAnswerChange = (questionId, value) => {
    setAnswersInput(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // เมื่อกด Submit Answer => บันทึกลง Firestore
  const handleSubmitAnswer = async (q) => {
    const studentAnswer = answersInput[q.questionDocId] || ''
    if (!studentAnswer.trim()) {
      alert('Please enter an answer or select a choice')
      return
    }

    try {
      // บันทึก path: classroom/{id}/checkin/{q.checkinId}/answers/{q.question_no}/students/{currentUser.uid}
      const answersDocRef = doc(
        db,
        'classroom',
        selectedClassroom.id,
        'checkin',
        q.checkinId,
        'answers',
        String(q.question_no)
      )
      // text = คำถาม (เก็บไว้ใน doc)
      await setDoc(answersDocRef, { text: q.question_text }, { merge: true })

      const studentAnswerRef = doc(answersDocRef, 'students', currentUser.uid)
      const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })

      await setDoc(studentAnswerRef, {
        time: nowStr,
        answer: studentAnswer,
      })

      alert('Answer submitted!')
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('Failed to submit answer.')
    }
  }

  if (!currentUser) return null

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">

      {/* Sidebar (คล้ายกับ Dashboard) */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold mb-6">Student Classroom</div>
          <div className="mb-4">
            {!selectedClassroom ? (
              <button
                onClick={() => navigate('/student-dashboard')}
                className="hover:text-blue-300 transition"
              >
                ห้องเรียนของฉัน
              </button>
            ) : (
              <button
                onClick={handleBackToList}
                className="hover:text-blue-300 transition"
              >
                กลับสู่รายการห้องเรียน
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center pt-6 border-t border-blue-700">
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
            <p className="text-sm">Status : Student</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-blue-50 p-8 overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          {!selectedClassroom ? (
            <h1 className="text-3xl font-bold text-blue-900">ห้องเรียนของฉัน</h1>
          ) : (
            <h1 className="text-3xl font-bold text-blue-900">
              ห้องเรียน : {selectedClassroom.info?.name || 'Unknown'}
            </h1>
          )}
          <button
            onClick={() => setShowSignOutModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Loading */}
        {loading && <p className="text-lg text-gray-700 mb-4">Loading...</p>}

        {/* ถ้ายังไม่เลือกห้อง => แสดง list ห้องเรียน */}
        {!loading && !selectedClassroom && (
          <>
            {myClassrooms.length === 0 ? (
              <p className="text-center text-gray-600">คุณยังไม่ได้อยู่ในห้องเรียนใด ๆ</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myClassrooms.map((classroom) => {
                  const info = classroom.info || {}
                  return (
                    <div
                      key={classroom.id}
                      className="border rounded-lg shadow-md p-4 bg-white hover:shadow-xl transition cursor-pointer"
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
                      <h2 className="text-xl font-bold text-blue-900">{info.name}</h2>
                      <p className="text-blue-700 text-lg">Code : {info.code}</p>
                      <p className="text-blue-700 text-lg">Room : {info.room}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ถ้าเลือกห้อง => แสดงรายการ quiz */}
        {!loading && selectedClassroom && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-blue-900">แบบทดสอบ (Quiz)</h2>
            {questions.length === 0 ? (
              <p className="text-gray-600">ยังไม่มีควิซ (question_show = true)</p>
            ) : (
              <div className="space-y-6">
                {questions.map((q) => {
                  // คำตอบที่พิมพ์/เลือกไว้ (ใน state)
                  const ansValue = answersInput[q.questionDocId] || ''
                  return (
                    <div
                      key={q.questionDocId}
                      className="border p-4 rounded-md hover:bg-blue-50 transition"
                    >
                      <p className="font-semibold mb-2 text-blue-900">
                        คำถาม #{q.question_no} [{q.checkinCode || '-'}] : {q.question_text}
                      </p>

                      {/* ถ้าเป็นปรนัย => มี choices */}
                      {q.question_type === 'objective' && Array.isArray(q.choices) && q.choices.length > 0 ? (
                        <div className="flex flex-col space-y-2 mb-2">
                          {q.choices.map((choice, idx) => (
                            <label key={idx} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`q_${q.questionDocId}`}
                                value={choice}
                                checked={ansValue === choice}
                                onChange={(e) =>
                                  handleAnswerChange(q.questionDocId, e.target.value)
                                }
                              />
                              <span>{choice}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        // ถ้าเป็นอัตนัย => ช่องกรอก
                        <input
                          type="text"
                          placeholder="Type your answer here..."
                          className="w-full p-2 border rounded mb-2"
                          value={ansValue}
                          onChange={(e) =>
                            handleAnswerChange(q.questionDocId, e.target.value)
                          }
                        />
                      )}

                      <button
                        onClick={() => handleSubmitAnswer(q)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                      >
                        ส่งคำตอบ
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {showSignOutModal && (
          <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg
                          className="h-6 w-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                          />
                        </svg>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-base font-semibold text-gray-900" id="modal-title">
                          ยืนยันการออกจากระบบ
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignOutModal(false)
                        handleSignOut()
                      }}
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:ml-3 sm:w-auto"
                    >
                      ใช่, ออกจากระบบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignOutModal(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 shadow-xs ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard