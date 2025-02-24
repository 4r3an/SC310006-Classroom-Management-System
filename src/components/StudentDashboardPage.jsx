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

  // รายการห้องเรียน
  const [myClassrooms, setMyClassrooms] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // สำหรับ “inline” แสดง quiz ในห้องเรียนที่เลือก
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [questions, setQuestions] = useState([])

  // state เพื่อเก็บคำตอบชั่วคราว (input) ของแต่ละ question
  // questionId -> answer
  const [answersInput, setAnswersInput] = useState({})

  useEffect(() => {
    // เช็คล็อกอิน
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

    // โหลดรายการห้องเรียนที่เป็น student
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

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // เมื่อนักเรียนคลิกเข้าดูห้องเรียน => โหลด quiz
  const handleEnterClassroom = async (classroom) => {
    setLoading(true)
    try {
      setSelectedClassroom(classroom)
      setAnswersInput({}) // เคลียร์ input เดิม

      // โหลด checkin
      const checkinSnapshot = await getDocs(
        collection(db, 'classroom', classroom.id, 'checkin')
      )
      let tempQuestions = []
      for (const cDoc of checkinSnapshot.docs) {
        const cData = cDoc.data()
        // ถ้าอยากกรองเฉพาะ checkin.status == 1 => if(cData.status !== 1) continue

        const qCol = collection(db, 'classroom', classroom.id, 'checkin', cDoc.id, 'question')
        const qSnap = await getDocs(qCol)
        qSnap.forEach((qDoc) => {
          const qData = qDoc.data()
          // แสดงเฉพาะ question_show=true
          if (qData.question_show) {
            tempQuestions.push({
              checkinId: cDoc.id,
              questionDocId: qDoc.id, // id ของ question document
              ...qData
            })
          }
        })
      }
      // เรียงตาม question_no
      tempQuestions.sort((a, b) => (a.question_no || 0) - (b.question_no || 0))

      setQuestions(tempQuestions)
    } catch (error) {
      console.error('Error loading quiz inline:', error)
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันกลับไปที่ list ห้องเรียน
  const handleBackToList = () => {
    setSelectedClassroom(null)
    setQuestions([])
    setAnswersInput({})
  }

  // เมื่อพิมพ์คำตอบใน input
  const handleAnswerChange = (questionId, value) => {
    setAnswersInput((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  // เมื่อกด Submit Answer => บันทึกลง Firestore (answers)
  const handleSubmitAnswer = async (q) => {
    try {
      // ดึงคำตอบของ question นี้จาก state
      const studentAnswer = answersInput[q.questionDocId] || ''
      if (!studentAnswer.trim()) {
        alert('Please enter an answer')
        return
      }

      // เช่น /classroom/{cid}/checkin/{q.checkinId}/answers/{q.question_no}/students/{currentUser.uid}
      // เราจะใช้ question_no เป็น document key (qno) ของ answers
      // หรือจะใช้ String(q.question_no) ก็ได้
      const answersDocRef = doc(
        db,
        'classroom',
        selectedClassroom.id,
        'checkin',
        q.checkinId,
        'answers',
        String(q.question_no) // {qno}
      )
      // ส่วนใน answersDocRef เราจะเก็บ {text: q.question_text} หรืออัพเดตทับก็ได้
      // จากนั้นค่อยสร้าง sub-collection students
      // แต่ในตัวอย่างโครงสร้าง: 
      //     answers
      //       -> qno (document)
      //         -> { text: question_text }
      //         -> students (collection)
      //            -> stdid: { time, answer, ... }
      //
      // เรา setDoc ที่ answersDocRef ก่อน (เพื่อให้ {text} อยู่ระดับเดียวกับ students sub-collection)
      await setDoc(answersDocRef, {
        text: q.question_text, // เก็บคำถามไว้ใน doc
      }, { merge: true })

      // แล้วเก็บคำตอบใน sub-collection students
      // doc key = currentUser.uid (หรือ stdid)
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

        {/* List of classrooms */}
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

        {/* Inline quiz detail */}
        {!loading && selectedClassroom && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">
              Quiz (question_show=true)
            </h2>
            {questions.length === 0 ? (
              <p>No quiz found.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((q) => {
                  return (
                    <div key={`${q.checkinId}-${q.questionDocId}`} className="border p-4 rounded">
                      <p className="font-semibold mb-2">
                        #{q.question_no}: {q.question_text}
                      </p>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Type your answer"
                          className="flex-1 p-2 border rounded"
                          value={answersInput[q.questionDocId] || ''}
                          onChange={(e) =>
                            handleAnswerChange(q.questionDocId, e.target.value)
                          }
                        />
                        <button
                          onClick={() => handleSubmitAnswer(q)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                        >
                          Submit Answer
                        </button>
                      </div>
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
