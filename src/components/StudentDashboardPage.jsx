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

  // รายการห้องเรียนที่เป็นนักเรียน
  const [myClassrooms, setMyClassrooms] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // การแสดงผลแบบ inline
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [questions, setQuestions] = useState([])

  // เก็บคำตอบของแต่ละ question (key = questionDocId)
  const [answersInput, setAnswersInput] = useState({})

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }

    // โหลดโปรไฟล์
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

    // โหลดรายชื่อห้องเรียน (สืบจาก sub-collection students)
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

  // เข้าไปดู quiz ของห้องเรียน
  const handleEnterClassroom = async (classroom) => {
    setLoading(true)
    try {
      setSelectedClassroom(classroom)
      setAnswersInput({})

      // โหลด checkin => question_show=true
      const checkinSnapshot = await getDocs(
        collection(db, 'classroom', classroom.id, 'checkin')
      )
      let tempQuestions = []
      for (const cDoc of checkinSnapshot.docs) {
        const qCol = collection(db, 'classroom', classroom.id, 'checkin', cDoc.id, 'question')
        const qSnap = await getDocs(qCol)
        qSnap.forEach((qDoc) => {
          const qData = qDoc.data()
          // เฉพาะ question_show = true
          if (qData.question_show) {
            tempQuestions.push({
              checkinId: cDoc.id,
              questionDocId: qDoc.id,
              ...qData
            })
          }
        })
      }
      tempQuestions.sort((a, b) => (a.question_no || 0) - (b.question_no || 0))
      setQuestions(tempQuestions)
    } catch (error) {
      console.error('Error loading quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setSelectedClassroom(null)
    setQuestions([])
    setAnswersInput({})
  }

  // เปลี่ยนคำตอบ
  const handleAnswerChange = (questionId, value) => {
    setAnswersInput(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // ส่งคำตอบ
  const handleSubmitAnswer = async (q) => {
    const studentAnswer = answersInput[q.questionDocId] || ''
    if (!studentAnswer.trim()) {
      alert('Please enter an answer or select a choice')
      return
    }

    try {
      // path: classroom/{cid}/checkin/{q.checkinId}/answers/{q.question_no}/students/{uid}
      const answersDocRef = doc(
        db,
        'classroom',
        selectedClassroom.id,
        'checkin',
        q.checkinId,
        'answers',
        String(q.question_no)
      )
      // merge text
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
              Classroom: {selectedClassroom.info?.name || 'Unknown'}
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

        {/* แสดง quiz (inline) */}
        {!loading && selectedClassroom && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">
              ควิซ
            </h2>
            {questions.length === 0 ? (
              <p>No quiz found.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((q) => {
                  const ansValue = answersInput[q.questionDocId] || ''
                  return (
                    <div key={q.questionDocId} className="border p-4 rounded">
                      <p className="font-semibold mb-2">
                        #{q.question_no} ({q.question_type || 'subjective'}): {q.question_text}
                      </p>
                      {q.question_type === 'objective' && Array.isArray(q.choices) && q.choices.length > 0 ? (
                        // ปรนัย -> แสดงตัวเลือก
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
                        // อัตนัย -> ช่องกรอกข้อความ
                        <input
                          type="text"
                          placeholder="Type your answer"
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
                        Submit Answer
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard