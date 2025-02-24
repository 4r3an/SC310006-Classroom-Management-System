import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { app } from '../../firebase_config'
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

function CreateQuizPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)

  // อ่านค่า classroomId จาก path param และ checkinId จาก query param
  const { classroomId } = useParams()
  const [searchParams] = useSearchParams()
  const checkinId = searchParams.get('checkinId') || ''

  // State: สำหรับเก็บข้อมูล user profile (เฉพาะชื่อกับรูป)
  const [profile, setProfile] = useState(null)

  // State: สำหรับเก็บรายการ question ของ checkin ปัจจุบัน
  const [questions, setQuestions] = useState([])

  // State: ฟอร์มเพิ่ม/แก้ไข question
  const [questionNo, setQuestionNo] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [questionShow, setQuestionShow] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)

  // State: modal ยืนยัน sign out
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  // State: ใช้แสดง “Give Score” แบบ inline
  const [gradingQuestion, setGradingQuestion] = useState(null)  // question object ที่กำลังให้คะแนน
  const [studentAnswers, setStudentAnswers] = useState([])      // รายการคำตอบของนักเรียน
  const [loadingAnswers, setLoadingAnswers] = useState(false)   // ระบุว่ากำลังโหลดคำตอบอยู่หรือไม่

  // ดึง current user
  const currentUser = auth.currentUser

  // โหลดข้อมูลโปรไฟล์ผู้ใช้
  useEffect(() => {
    async function fetchProfile() {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setProfile(snap.data())
        }
      }
    }
    fetchProfile()
  }, [currentUser, db])

  // โหลดข้อมูล question ทั้งหมดใน sub-collection "question"
  useEffect(() => {
    async function loadQuestions() {
      if (!classroomId || !checkinId) return

      try {
        const questionRef = collection(db, 'classroom', classroomId, 'checkin', checkinId, 'question')
        const snap = await getDocs(questionRef)
        const list = []
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() })
        })
        // เรียงตาม question_no
        list.sort((a, b) => (a.question_no > b.question_no ? 1 : -1))
        setQuestions(list)
      } catch (error) {
        console.error('Error loading questions:', error)
      }
    }
    loadQuestions()
  }, [db, classroomId, checkinId])

  // สร้าง/แก้ไข Question
  const handleSaveQuestion = async () => {
    if (!classroomId || !checkinId) {
      alert('Missing classroomId or checkinId')
      return
    }
    if (!questionNo || !questionText) {
      alert('Please fill in questionNo and questionText')
      return
    }

    try {
      // ถ้ามี editingQuestionId => แก้ไข document เดิม
      // ถ้าไม่มี => สร้าง doc ใหม่ (ใช้ uuid หรือ questionNo เป็น id ก็ได้)
      const newId = editingQuestionId || uuidv4()
      const questionDocRef = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', newId)
      await setDoc(questionDocRef, {
        question_no: parseInt(questionNo, 10),
        question_text: questionText,
        question_show: questionShow
      })

      alert(editingQuestionId ? 'Question updated successfully' : 'Question created successfully')

      // เคลียร์ฟอร์ม
      setQuestionNo('')
      setQuestionText('')
      setQuestionShow(false)
      setEditingQuestionId(null)

      // Reload questions
      const snap = await getDocs(collection(db, 'classroom', classroomId, 'checkin', checkinId, 'question'))
      const list = []
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() })
      })
      list.sort((a, b) => (a.question_no > b.question_no ? 1 : -1))
      setQuestions(list)
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Error saving question. See console for details.')
    }
  }

  // แก้ไข question
  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id)
    setQuestionNo(q.question_no)
    setQuestionText(q.question_text)
    setQuestionShow(q.question_show)
  }

  // ลบ question
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return

    try {
      await deleteDoc(doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', questionId))
      alert('Question deleted successfully.')
      setQuestions((prev) => prev.filter((item) => item.id !== questionId))
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Failed to delete question.')
    }
  }

  // toggle question_show
  const handleToggleShow = async (q) => {
    try {
      const ref = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', q.id)
      await updateDoc(ref, { question_show: !q.question_show })

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, question_show: !q.question_show } : item
        )
      )
    } catch (error) {
      console.error('Error toggling question_show:', error)
    }
  }

  // เมื่อกด "Give Score" => โหลดคำตอบของนักเรียน (answers -> qno -> students -> stdid)
  // gradingQuestion = question object ที่เรากำลังให้คะแนน
  const handleGradeQuestion = async (q) => {
    if (!classroomId || !checkinId) {
      alert('Missing classroomId or checkinId')
      return
    }
    // q เป็น question doc => ต้องใช้ question_no เป็น key ของ answers
    // สมมติเราจะใช้ question_no เป็น doc key (qno)
    const qno = String(q.question_no)

    setGradingQuestion(q)       // เก็บคำถามที่กำลังให้คะแนน
    setStudentAnswers([])       // เคลียร์ก่อน
    setLoadingAnswers(true)

    try {
      // path: /classroom/{classroomId}/checkin/{checkinId}/answers/{qno}/students/{stdid}
      const answersDocRef = doc(
        db,
        'classroom',
        classroomId,
        'checkin',
        checkinId,
        'answers',
        qno
      )
      // สร้างไว้ก่อน เผื่อยังไม่มี
      await setDoc(answersDocRef, { text: q.question_text }, { merge: true })

      // จากนั้นไปโหลด students sub-collection
      const studentsColRef = collection(answersDocRef, 'students')
      const snap = await getDocs(studentsColRef)

      const arr = []
      snap.forEach((docSnap) => {
        arr.push({
          studentDocId: docSnap.id, // ตรงกับ uid ของนักเรียน
          ...docSnap.data()
        })
      })
      setStudentAnswers(arr)
    } catch (error) {
      console.error('Error loading student answers:', error)
      alert('Failed to load student answers.')
    } finally {
      setLoadingAnswers(false)
    }
  }

  // ปิด/ยกเลิกการให้คะแนน
  const handleCloseGrading = () => {
    setGradingQuestion(null)
    setStudentAnswers([])
  }

  // เปลี่ยนค่าคะแนนใน state ก่อนบันทึก
  const handleScoreChange = (index, value) => {
    setStudentAnswers((prev) => {
      const newArr = [...prev]
      newArr[index] = { ...newArr[index], score: value }
      return newArr
    })
  }

  // บันทึกคะแนนลง Firestore => answers -> qno -> students -> stdid -> {score}
  const handleSaveScore = async (index) => {
    if (!gradingQuestion) return
    const student = studentAnswers[index]
    // ตัวอย่าง: { studentDocId: 'XXXUID', time: '...', answer: '...', score: 10 }
    const qno = String(gradingQuestion.question_no)

    if (student.score == null || student.score === '') {
      alert('Please enter a valid score')
      return
    }

    try {
      const answersDocRef = doc(
        db,
        'classroom',
        classroomId,
        'checkin',
        checkinId,
        'answers',
        qno
      )
      const studentRef = doc(answersDocRef, 'students', student.studentDocId)

      // บันทึกค่า score ไว้ใน doc
      await updateDoc(studentRef, {
        score: Number(student.score)
      })

      alert(`Score saved for student: ${student.studentDocId}`)
    } catch (error) {
      console.error('Error saving score:', error)
      alert('Failed to save score.')
    }
  }

  // ฟังก์ชัน sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-4xl --font-InterEN mb-8">Create Quiz</div>
          <ul className="space-y-4">
            <li>
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                Back to Dashboard
              </button>
            </li>
          </ul>
        </div>
        <div
          className="flex items-center pt-6 border-t border-blue-700 cursor-pointer"
          onClick={() => navigate('/edit-profile')}
        >
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
            <p className="text-white font-bold">
              {profile?.name || currentUser?.email || 'User'}
            </p>
            {currentUser && (
              <p className="text-blue-200 text-sm">{currentUser.email}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-blue-50 p-8 animate-fadeIn overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-ChakraPetchTH text-blue-900">Create / Manage Quiz</h1>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
            Classroom ID: {classroomId || 'N/A'} | Checkin ID: {checkinId || 'N/A'}
          </h2>

          {/* ฟอร์มเพิ่ม/แก้ไข question */}
          <div className="mb-8 border p-4 rounded-md bg-blue-50">
            <h3 className="text-lg font-ChakraPetchTH mb-4 text-blue-900">
              {editingQuestionId ? `Edit Question (ID: ${editingQuestionId})` : 'Create New Question'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-blue-700 mb-1">Question No.</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={questionNo}
                  onChange={(e) => setQuestionNo(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-blue-700 mb-1">Question Text</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-blue-700 mb-1">Show Question?</label>
                <input
                  type="checkbox"
                  checked={questionShow}
                  onChange={(e) => setQuestionShow(e.target.checked)}
                  className="h-5 w-5 text-blue-600"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleSaveQuestion}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition mr-2"
              >
                {editingQuestionId ? 'Update Question' : 'Save Question'}
              </button>
              {editingQuestionId && (
                <button
                  onClick={() => {
                    // เคลียร์ form
                    setEditingQuestionId(null)
                    setQuestionNo('')
                    setQuestionText('')
                    setQuestionShow(false)
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* แสดงตาราง question ที่มีอยู่ */}
          <h3 className="text-lg font-ChakraPetchTH mb-2 text-blue-900">Question List</h3>
          {questions.length === 0 ? (
            <p className="text-gray-600">No questions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border p-2 text-left">No.</th>
                    <th className="border p-2 text-left">Question Text</th>
                    <th className="border p-2 text-left">Show?</th>
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, index) => (
                    <tr key={q.id} className="hover:bg-blue-50">
                      <td className="border p-2">{q.question_no}</td>
                      <td className="border p-2">{q.question_text}</td>
                      <td className="border p-2">
                        {q.question_show ? 'True' : 'False'}
                      </td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleShow(q)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition mr-2"
                        >
                          Toggle Show
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition mr-2"
                        >
                          Delete
                        </button>
                        {/* ปุ่ม Give Score => แสดงตารางคำตอบของนักเรียน */}
                        <button
                          onClick={() => handleGradeQuestion(q)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                        >
                          Give Score
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ส่วนแสดงตารางของนักเรียนที่ตอบ (inline) */}
          {gradingQuestion && (
            <div className="mt-8 border p-4 rounded-md bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Student Answers for Question #{gradingQuestion.question_no}
                </h3>
                <button
                  onClick={handleCloseGrading}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                >
                  Close
                </button>
              </div>
              {loadingAnswers ? (
                <p>Loading answers...</p>
              ) : studentAnswers.length === 0 ? (
                <p>No student answers found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border p-2 text-left">Student ID</th>
                        <th className="border p-2 text-left">Answer</th>
                        <th className="border p-2 text-left">Time</th>
                        <th className="border p-2 text-left">Score</th>
                        <th className="border p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAnswers.map((std, idx) => (
                        <tr key={std.studentDocId} className="hover:bg-blue-50">
                          <td className="border p-2">{std.studentDocId}</td>
                          <td className="border p-2">{std.answer || '-'}</td>
                          <td className="border p-2">{std.time || '-'}</td>
                          <td className="border p-2">
                            <input
                              type="number"
                              className="w-20 p-1 border rounded"
                              value={std.score || ''}
                              onChange={(e) => handleScoreChange(idx, e.target.value)}
                            />
                          </td>
                          <td className="border p-2">
                            <button
                              onClick={() => handleSaveScore(idx)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Sign Out Confirmation */}
      {showSignOutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-30 z-50">
          <div className="relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50 w-11/12 md:w-1/2">
            <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">Confirm Sign Out</h3>
            <p className="text-blue-700 font-ChakraPetchTH mb-4">
              Are you sure you want to sign out?
            </p>
            <div className="flex justify-end mt-4 space-x-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 shadow-xs transition"
              >
                Yes, Sign Out
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateQuizPage
