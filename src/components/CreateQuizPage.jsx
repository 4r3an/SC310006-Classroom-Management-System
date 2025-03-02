import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
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

  // Add auth loading state
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // รับ classroomId / checkinId จาก param/query
  const { classroomId } = useParams()
  const [searchParams] = useSearchParams()
  const checkinId = searchParams.get('checkinId') || ''

  // State: โปรไฟล์ผู้ใช้
  const [profile, setProfile] = useState(null)

  // State: รายการคำถาม
  const [questions, setQuestions] = useState([])

  // State: ฟอร์มสร้าง/แก้ไขคำถาม
  const [questionNo, setQuestionNo] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [questionShow, setQuestionShow] = useState(false)
  const [questionType, setQuestionType] = useState('subjective') // 'subjective' (อัตนัย), 'objective' (ปรนัย)
  const [choices, setChoices] = useState(['']) // array สำหรับตัวเลือก (ถ้าเป็นปรนัย)
  const [editingQuestionId, setEditingQuestionId] = useState(null)

  // State: inline grading
  const [gradingQuestion, setGradingQuestion] = useState(null)
  const [studentAnswers, setStudentAnswers] = useState([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  
  // State: feedback messages
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  // modal sign out
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setAuthLoading(false)
      
      if (!user && !authLoading) {
        navigate('/')
      }
    })
    
    return () => unsubscribe()
  }, [auth, navigate, authLoading])

  // โหลดโปรไฟล์ผู้ใช้
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
    
    if (!authLoading && currentUser) {
      fetchProfile()
    }
  }, [currentUser, db, authLoading])

  // โหลดคำถามจาก Firestore
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
        list.sort((a, b) => a.question_no - b.question_no)
        setQuestions(list)
        
        // Automatically set next question number for new questions
        if (!editingQuestionId) {
          const nextNumber = list.length > 0 
            ? Math.max(...list.map(q => q.question_no)) + 1 
            : 1
          setQuestionNo(nextNumber.toString())
        }
      } catch (error) {
        console.error('Error loading questions:', error)
      }
    }
    loadQuestions()
  }, [db, classroomId, checkinId, editingQuestionId])

  // Show feedback message with timeout
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback({ type: '', message: '' })
    }, duration)
  }

  // ฟังก์ชันสร้าง/แก้ไขคำถาม
  const handleSaveQuestion = async () => {
    if (!classroomId || !checkinId) {
      showFeedback('error', 'ไม่พบ classroomId หรือ checkinId')
      return
    }
    if (!questionNo || !questionText) {
      showFeedback('error', 'กรุณากรอกหมายเลขและข้อความคำถาม')
      return
    }

    try {
      const newId = editingQuestionId || uuidv4()
      const questionDocRef = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', newId)
      await setDoc(questionDocRef, {
        question_no: parseInt(questionNo, 10),
        question_text: questionText,
        question_show: questionShow,
        question_type: questionType,
        choices: questionType === 'objective' ? choices.filter(c => c.trim() !== '') : []
      })

      showFeedback(
        'success', 
        editingQuestionId ? 'แก้ไขคำถามสำเร็จ' : 'สร้างคำถามสำเร็จ'
      )

      // โหลดคำถามใหม่
      const snap = await getDocs(collection(db, 'classroom', classroomId, 'checkin', checkinId, 'question'))
      const list = []
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() })
      })
      list.sort((a, b) => a.question_no - b.question_no)
      setQuestions(list)
      
      // เคลียร์ฟอร์ม (moved after loading questions so resetForm has access to updated list)
      resetForm()
      
    } catch (error) {
      console.error('Error saving question:', error)
      showFeedback('error', 'เกิดข้อผิดพลาดในการบันทึกคำถาม')
    }
  }

  // Reset form to initial state
  const resetForm = () => {
    setQuestionText('')
    setQuestionShow(false)
    setQuestionType('subjective')
    setChoices([''])
    
    // Clear the editing state
    setEditingQuestionId(null)
    
    // Always recalculate the next question number when returning to "create" mode
    const nextNumber = questions.length > 0 
      ? Math.max(...questions.map(q => parseInt(q.question_no))) + 1 
      : 1
    setQuestionNo(nextNumber.toString())
  }

  // กดแก้ไขคำถาม
  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id)
    setQuestionNo(q.question_no)
    setQuestionText(q.question_text)
    setQuestionShow(q.question_show)
    setQuestionType(q.question_type || 'subjective')
    if (q.choices && Array.isArray(q.choices)) {
      setChoices(q.choices)
    } else {
      setChoices([''])
    }
  }

  // ลบคำถาม
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) return
    try {
      await deleteDoc(doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', questionId))
      showFeedback('success', 'ลบคำถามสำเร็จ')
      setQuestions(prev => prev.filter((item) => item.id !== questionId))
    } catch (error) {
      console.error('Error deleting question:', error)
      showFeedback('error', 'ไม่สามารถลบคำถามได้')
    }
  }

  // สลับสถานะแสดงคำถาม
  const handleToggleShow = async (q) => {
    try {
      const ref = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'question', q.id)
      await updateDoc(ref, { question_show: !q.question_show })

      setQuestions(prev =>
        prev.map(item =>
          item.id === q.id ? { ...item, question_show: !q.question_show } : item
        )
      )
    } catch (error) {
      console.error('Error toggling question_show:', error)
    }
  }

  // ฟังก์ชันเสริมสำหรับเพิ่ม/ลบตัวเลือก (เมื่อเป็นปรนัย)
  const handleAddChoice = () => {
    setChoices(prev => [...prev, ''])
  }
  const handleChoiceChange = (index, value) => {
    setChoices(prev => {
      const newArr = [...prev]
      newArr[index] = value
      return newArr
    })
  }
  const handleRemoveChoice = (index) => {
    setChoices(prev => {
      const newArr = [...prev]
      newArr.splice(index, 1)
      return newArr
    })
  }

  // ให้คะแนนคำถาม
  const handleGradeQuestion = async (q) => {
    if (!classroomId || !checkinId) {
      alert('ไม่พบ classroomId หรือ checkinId')
      return
    }
    const qno = String(q.question_no)
    setGradingQuestion(q)
    setStudentAnswers([])
    setLoadingAnswers(true)

    try {
      const answersDocRef = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'answers', qno)
      await setDoc(answersDocRef, { text: q.question_text }, { merge: true })
      const studentsColRef = collection(answersDocRef, 'students')
      const snap = await getDocs(studentsColRef)

      const arr = []
      for (const docSnap of snap.docs) {
        const ansData = docSnap.data()
        const studentUid = docSnap.id

        // ดึงชื่อจาก students sub-collection
        const stuDocRef = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'students', studentUid)
        const stuSnap = await getDoc(stuDocRef)
        let studentName = '(ไม่มีชื่อ)'
        if (stuSnap.exists()) {
          const stuData = stuSnap.data()
          studentName = stuData.name || '(ไม่มีชื่อ)'
        }

        arr.push({
          studentDocId: studentUid,
          name: studentName,
          ...ansData
        })
      }
      setStudentAnswers(arr)
    } catch (error) {
      console.error('Error loading student answers:', error)
      alert('ไม่สามารถโหลดคำตอบนักเรียนได้')
    } finally {
      setLoadingAnswers(false)
    }
  }

  const handleCloseGrading = () => {
    setGradingQuestion(null)
    setStudentAnswers([])
  }

  const handleScoreChange = (index, value) => {
    setStudentAnswers(prev => {
      const newArr = [...prev]
      newArr[index] = { ...newArr[index], score: value }
      return newArr
    })
  }

  const handleSaveScore = async (index) => {
    if (!gradingQuestion) return
    const student = studentAnswers[index]
    const qno = String(gradingQuestion.question_no)

    if (student.score == null || student.score === '') {
      alert('กรุณากรอกคะแนนให้ถูกต้อง')
      return
    }

    try {
      const answersDocRef = doc(db, 'classroom', classroomId, 'checkin', checkinId, 'answers', qno)
      const studentRef = doc(answersDocRef, 'students', student.studentDocId)
      await updateDoc(studentRef, { score: Number(student.score) })

      alert(`บันทึกคะแนนสำเร็จสำหรับนักเรียน: ${student.studentDocId}`)
    } catch (error) {
      console.error('Error saving score:', error)
      alert('ไม่สามารถบันทึกคะแนนได้')
    }
  }

  /**
   * handleConfirmSignOut: ออกจากระบบแล้วนำไปยังหน้าแรก
   */
  const handleConfirmSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Show loading state while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-800 font-ChakraPetchTH">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-4xl font-ChakraPetchTH mb-8">สร้างควิซ</div>
          <ul className="space-y-4">
            <li>
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                กลับไปแดชบอร์ด
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
            <p className="font-bold font-ChakraPetchTH">
              {profile?.name || currentUser?.email || 'User'}
            </p>
            {currentUser && (
              <p className="text-blue-200 text-sm font-ChakraPetchTH">{currentUser.email}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-blue-50 p-8 animate-fadeIn overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-ChakraPetchTH text-blue-900">สร้าง/จัดการควิซ</h1>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition font-ChakraPetchTH"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Feedback message */}
        {feedback.message && (
          <div className={`mb-4 p-3 rounded-md ${
            feedback.type === 'success' ? 'bg-green-100 text-green-800' : 
            feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
          }`}>
            <p className="font-ChakraPetchTH">{feedback.message}</p>
          </div>
        )}

        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
            รหัสห้องเรียน: {classroomId || 'N/A'} | รหัสเช็คอิน: {checkinId || 'N/A'}
          </h2>

          {/* ฟอร์มสร้าง/แก้ไขคำถาม */}
          <div className="mb-8 border p-4 rounded-md bg-blue-50 shadow-md">
            <h3 className="text-lg font-ChakraPetchTH mb-4 text-blue-900">
              {editingQuestionId ? `แก้ไขคำถาม (ID: ${editingQuestionId})` : 'สร้างคำถามใหม่'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-blue-700 mb-1 font-ChakraPetchTH">หมายเลขคำถาม</label>
                <input
                  type="number"
                  className={`w-full p-2 border rounded ${!editingQuestionId ? 'bg-gray-100' : ''}`}
                  value={questionNo}
                  onChange={(e) => setQuestionNo(e.target.value)}
                  readOnly={!editingQuestionId} // Only allow editing question number when editing
                />
                {!editingQuestionId && (
                  <p className="text-xs text-gray-500 mt-1">
                    หมายเลขคำถามถูกสร้างโดยอัตโนมัติ
                  </p>
                )}
              </div>
              <div>
                <label className="block text-blue-700 mb-1 font-ChakraPetchTH">แสดงคำถาม?</label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="questionShow"
                    checked={questionShow}
                    onChange={(e) => setQuestionShow(e.target.checked)}
                    className="h-5 w-5 text-blue-600"
                  />
                  <label htmlFor="questionShow" className="ml-2 text-gray-700">
                    {questionShow ? 'แสดงให้นักเรียนเห็น' : 'ซ่อนจากนักเรียน'}
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-blue-700 mb-1 font-ChakraPetchTH">ประเภทคำถาม</label>
              <select
                className="p-2 border rounded w-full md:w-auto"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <option value="subjective">อัตนัย (เขียนตอบ)</option>
                <option value="objective">ปรนัย (ตัวเลือก)</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-blue-700 mb-1 font-ChakraPetchTH">ข้อความคำถาม</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="พิมพ์คำถามที่นี่..."
              />
            </div>

            {questionType === 'objective' && (
              <div className="mt-4">
                <label className="block text-blue-700 mb-2 font-ChakraPetchTH">ตัวเลือก</label>
                {choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center space-x-2 mb-2">
                    <div className="flex-none w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded"
                      value={choice}
                      onChange={(e) => handleChoiceChange(idx, e.target.value)}
                      placeholder={`ตัวเลือกที่ ${idx + 1}`}
                    />
                    {choices.length > 1 && (
                      <button
                        onClick={() => handleRemoveChoice(idx)}
                        className="bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 transition flex-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddChoice}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition font-ChakraPetchTH flex items-center mt-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  เพิ่มตัวเลือก
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleSaveQuestion}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-ChakraPetchTH flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {editingQuestionId ? 'อัปเดตคำถาม' : 'บันทึกคำถาม'}
              </button>
              {editingQuestionId && (
                <button
                  onClick={resetForm}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition font-ChakraPetchTH flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  ยกเลิก
                </button>
              )}
            </div>
          </div>

          {/* ตารางรายการคำถาม */}
          <h3 className="text-lg font-ChakraPetchTH mb-2 text-blue-900">รายการคำถาม</h3>
          {questions.length === 0 ? (
            <p className="font-ChakraPetchTH">ไม่พบคำถาม</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border p-2 text-left font-ChakraPetchTH">ลำดับ</th>
                    <th className="border p-2 text-left font-ChakraPetchTH">ข้อความคำถาม</th>
                    <th className="border p-2 text-left font-ChakraPetchTH">ประเภท</th>
                    <th className="border p-2 text-left font-ChakraPetchTH">แสดง?</th>
                    <th className="border p-2 text-left font-ChakraPetchTH">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="hover:bg-blue-50">
                      <td className="border p-2">{q.question_no}</td>
                      <td className="border p-2">{q.question_text}</td>
                      <td className="border p-2">{q.question_type === 'objective' ? 'ปรนัย' : 'อัตนัย'}</td>
                      <td className="border p-2">{q.question_show ? 'ใช่' : 'ไม่ใช่'}</td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition font-ChakraPetchTH mr-2"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleToggleShow(q)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition font-ChakraPetchTH mr-2"
                        >
                          สลับแสดง
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition font-ChakraPetchTH mr-2"
                        >
                          ลบ
                        </button>
                        <button
                          onClick={() => handleGradeQuestion(q)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition font-ChakraPetchTH"
                        >
                          ให้คะแนน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ส่วนให้คะแนนแบบ Inline */}
          {gradingQuestion && (
            <div className="mt-8 border p-4 rounded-md bg-blue-50 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-ChakraPetchTH">
                  คำตอบนักเรียนสำหรับคำถามที่ #{gradingQuestion.question_no}
                </h3>
                <button
                  onClick={handleCloseGrading}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition font-ChakraPetchTH"
                >
                  ปิด
                </button>
              </div>
              {loadingAnswers ? (
                <p className="font-ChakraPetchTH">กำลังโหลดคำตอบ...</p>
              ) : studentAnswers.length === 0 ? (
                <p className="font-ChakraPetchTH">ไม่พบคำตอบนักเรียน</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border p-2 text-left font-ChakraPetchTH">รหัสนักเรียน</th>
                        <th className="border p-2 text-left font-ChakraPetchTH">ชื่อ</th>
                        <th className="border p-2 text-left font-ChakraPetchTH">คำตอบ</th>
                        <th className="border p-2 text-left font-ChakraPetchTH">เวลา</th>
                        <th className="border p-2 text-left font-ChakraPetchTH">คะแนน</th>
                        <th className="border p-2 text-left font-ChakraPetchTH">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAnswers.map((std, idx) => (
                        <tr key={std.studentDocId} className="hover:bg-blue-50">
                          <td className="border p-2">{std.studentDocId}</td>
                          <td className="border p-2">{std.name}</td>
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
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition font-ChakraPetchTH"
                            >
                              บันทึก
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

      {/* Modal ยืนยันออกจากระบบ */}
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
                      handleConfirmSignOut()
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
    </div>
  )
}

export default CreateQuizPage