import React, { useEffect, useState, useRef } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
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
import { Html5QrcodeScanner } from "html5-qrcode";

function StudentDashboard() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const navigate = useNavigate()

  // Add this new state for auth loading
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // Add this at the beginning of StudentDashboard function to check authentication
  useEffect(() => {
    console.log("Current user:", currentUser);
    console.log("User is authenticated:", !!currentUser);
  }, [currentUser]);

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

  // Add these new states for classroom registration
  const [showRegisterClassroomModal, setShowRegisterClassroomModal] = useState(false)
  const [registerClassroomId, setRegisterClassroomId] = useState('')
  const [registerMessage, setRegisterMessage] = useState({ type: '', text: '' })

  const qrScannerRef = useRef(null);

  // Add these near the other state declarations (around line 30)
  const [showCheckinQRModal, setShowCheckinQRModal] = useState(false)
  const [checkinMessage, setCheckinMessage] = useState({ type: '', text: '' })
  const [isProcessingCheckin, setIsProcessingCheckin] = useState(false)
  const checkinQRScannerRef = useRef(null)

  // First, add a new state to store check-in history (add near the other state declarations)
  const [checkinHistory, setCheckinHistory] = useState([]);

  // Replace current authentication check with this
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed, user:", user);
      setCurrentUser(user);
      setAuthLoading(false);
      
      // If no user and auth is finished loading, redirect to login
      if (!user && !authLoading) {
        navigate('/');
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [auth, navigate]);

  // Replace the initial loading check that redirects
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/')
      return
    }
    
    // Only load user data if authenticated
    if (!authLoading && currentUser) {
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
          const classroomsData = classroomDocs
            .map((c) => ({
              id: c.id,
              ...c.data(),
            }))
            .filter(classroom => classroom.info && classroom.info.name); // Only include classrooms with valid info

          setMyClassrooms(classroomsData)
        } catch (error) {
          console.error('Error loading classrooms:', error)
        } finally {
          setLoading(false)
        }
      }

      loadProfile()
      loadClassrooms()
    }
  }, [authLoading, currentUser, db, navigate])

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

      // เรียกดูประวัติการเช็คชื่อของนักเรียนในห้องเรียนนี้
      await fetchCheckinHistory(classroom.id);

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

  // Add this function to fetch check-in history for the currently selected classroom
  const fetchCheckinHistory = async (classroomId) => {
    try {
      // Get all check-ins for this classroom
      const checkinSnapshot = await getDocs(
        collection(db, 'classroom', classroomId, 'checkin')
      );
      
      let history = [];
      
      // For each check-in, check if this student has checked in
      for (const checkinDoc of checkinSnapshot.docs) {
        const checkinData = checkinDoc.data();
        
        // Check if student has a document in the students subcollection
        const studentCheckinRef = doc(
          db, 
          'classroom', 
          classroomId, 
          'checkin', 
          checkinDoc.id, 
          'students', 
          currentUser.uid
        );
        
        const studentCheckinSnap = await getDoc(studentCheckinRef);
        
        // If student has checked in for this record, add it to history
        if (studentCheckinSnap.exists()) {
          const studentData = studentCheckinSnap.data();
          history.push({
            id: checkinDoc.id,
            code: checkinData.code,
            date: checkinData.date,
            checkinTime: studentData.date,
            status: checkinData.status
          });
        }
      }
      
      // Sort by date (newest first)
      history.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      setCheckinHistory(history);
    } catch (error) {
      console.error("Error fetching check-in history:", error);
    }
  };

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

  // Add this function to handle classroom registration
  /**
   * handleRegisterClassroom: Registers a student in a classroom using the classroom ID.
   * Adds the student to the classroom's students collection in Firestore.
   * 
   * ลงทะเบียนนักเรียนในห้องเรียนโดยใช้รหัสห้องเรียน
   * เพิ่มนักเรียนเข้าไปในคอลเลกชัน students ของห้องเรียนใน Firestore
   */
  const handleRegisterClassroom = async (e) => {
    e.preventDefault()
    
    if (!registerClassroomId.trim()) {
      setRegisterMessage({ type: 'error', text: 'กรุณาใส่รหัสห้องเรียน' })
      return
    }
    
    try {
      // Check if classroom exists
      const classroomRef = doc(db, 'classroom', registerClassroomId)
      const classroomSnap = await getDoc(classroomRef)
      
      if (!classroomSnap.exists()) {
        setRegisterMessage({ type: 'error', text: 'ไม่พบห้องเรียนที่ระบุ กรุณาตรวจสอบรหัสอีกครั้ง' })
        return
      }
      
      // Check if student already registered in this classroom
      const studentRef = doc(db, 'classroom', registerClassroomId, 'students', currentUser.uid)
      const studentSnap = await getDoc(studentRef)
      
      if (studentSnap.exists()) {
        setRegisterMessage({ type: 'error', text: 'คุณได้ลงทะเบียนในห้องเรียนนี้แล้ว' })
        return
      }
      
      // Add student to classroom
      await setDoc(studentRef, {
        stdid: currentUser.uid,
        name: profile?.name || currentUser.email,
        status: 0 // Pending status
      })
      
      setRegisterMessage({ type: 'success', text: 'ลงทะเบียนสำเร็จ! รอการยืนยันจากอาจารย์' })
      
      // Refresh classrooms list after successful registration
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
      
      // Auto-close modal after successful registration
      setTimeout(() => {
        setShowRegisterClassroomModal(false)
        setRegisterClassroomId('')
        setRegisterMessage({ type: '', text: '' })
      }, 2000)
      
    } catch (error) {
      console.error('Error registering for classroom:', error)
      setRegisterMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลงทะเบียน โปรดลองอีกครั้ง' })
    }
  }
  
  /**
   * handleQRCodeScanned: Processes classroom registration via QR code scan.
   * Extracts classroom ID from URL and registers the student.
   * 
   * ประมวลผลการลงทะเบียนห้องเรียนผ่านการสแกน QR code
   * แยกรหัสห้องเรียนจาก URL และลงทะเบียนนักเรียน
   * @param {string} qrData - URL data from QR code scan
   */
  const handleQRCodeScanned = (qrData) => {
    try {
      // Extract classroom ID from URL pattern
      // Expected format: https://4r3an.github.io/SC310006-Classroom-Management-System/#/register-classroom/{classroomId}
      const urlPattern = /\/register-classroom\/([^/?\s]+)/
      const match = qrData.match(urlPattern)
      
      if (match && match[1]) {
        const classroomId = match[1]
        setRegisterClassroomId(classroomId)
        // Automatically submit after QR scan
        handleRegisterClassroom({ preventDefault: () => {} })
      } else {
        setRegisterMessage({ type: 'error', text: 'รูปแบบ QR Code ไม่ถูกต้อง' })
      }
    } catch (error) {
      console.error('Error processing QR code:', error)
      setRegisterMessage({ type: 'error', text: 'ไม่สามารถประมวลผล QR Code ได้' })
    }
  }

  /**
   * handleCheckinQRCodeScanned: Processes student check-in via QR code scan.
   * Extracts classroom ID and check-in ID from URL and marks the student as present.
   * 
   * ประมวลผลการเช็คชื่อนักเรียนผ่านการสแกน QR code
   * แยก ID ห้องเรียนและ ID การเช็คชื่อจาก URL และทำเครื่องหมายว่านักเรียนเข้าเรียน
   * @param {string} qrData - URL data from QR code scan
   */
  const handleCheckinQRCodeScanned = async (qrData) => {
    try {
      setIsProcessingCheckin(true);
      // Extract classroom ID and check-in ID from URL pattern
      // Expected format: https://4r3an.github.io/SC310006-Classroom-Management-System/#/student-checkin/{classroomId}/{checkinId}
      const urlPattern = /\/student-checkin\/([^/?\s]+)\/([^/?\s]+)/;
      const match = qrData.match(urlPattern);
      
      if (!match || !match[1] || !match[2]) {
        setCheckinMessage({ type: 'error', text: 'QR Code ไม่ถูกต้องสำหรับการเช็คชื่อ' });
        return;
      }
  
      const classroomId = match[1];
      const checkinId = match[2];
      
      // Verify this QR code is for the currently selected classroom
      if (selectedClassroom && selectedClassroom.id !== classroomId) {
        setCheckinMessage({ 
          type: 'error', 
          text: 'QR Code นี้ไม่ตรงกับห้องเรียนที่คุณเลือก' 
        });
        return;
      }
      
      // Check if student is registered for this classroom
      const studentRef = doc(db, 'classroom', classroomId, 'students', currentUser.uid);
      const studentDoc = await getDoc(studentRef);
      
      if (!studentDoc.exists()) {
        setCheckinMessage({ 
          type: 'error', 
          text: 'คุณไม่ได้ลงทะเบียนในห้องเรียนนี้' 
        });
        return;
      }
      
      // Check if the check-in exists and is active
      const checkinRef = doc(db, 'classroom', classroomId, 'checkin', checkinId);
      const checkinDoc = await getDoc(checkinRef);
      
      if (!checkinDoc.exists()) {
        setCheckinMessage({ 
          type: 'error', 
          text: 'ไม่พบรายการเช็คชื่อ หรือการเช็คชื่อถูกยกเลิก' 
        });
        return;
      }
      
      const checkinData = checkinDoc.data();
      
      // Check status - 0 means disabled, 2 means finished
      if (checkinData.status === 0) {
        setCheckinMessage({ 
          type: 'error', 
          text: 'การเช็คชื่อนี้ถูกปิดใช้งานชั่วคราว กรุณาติดต่ออาจารย์' 
        });
        return;
      }
      
      if (checkinData.status === 2) {
        setCheckinMessage({ 
          type: 'error', 
          text: 'การเช็คชื่อนี้ได้สิ้นสุดแล้ว' 
        });
        return;
      }
      
      // Check if student already checked in
      const studentCheckinRef = doc(
        db, 
        'classroom', 
        classroomId, 
        'checkin', 
        checkinId, 
        'students', 
        currentUser.uid
      );
      
      const studentCheckinDoc = await getDoc(studentCheckinRef);
      if (studentCheckinDoc.exists()) {
        setCheckinMessage({ 
          type: 'info', 
          text: 'คุณได้เช็คชื่อในคาบเรียนนี้แล้ว' 
        });
        return;
      }
      
      // Process check-in
      const studentData = studentDoc.data();
      const dateString = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      
      // Store in 'students' subcollection
      await setDoc(studentCheckinRef, {
        stdid: currentUser.uid,
        name: profile?.name || currentUser.email,
        remark: '',
        date: dateString
      });
      
      // Store in 'scores' subcollection 
      await setDoc(
        doc(db, 'classroom', classroomId, 'checkin', checkinId, 'scores', currentUser.uid),
        {
          uid: currentUser.uid,
          stdid: currentUser.uid,
          name: profile?.name || currentUser.email,
          remark: '',
          dates: dateString,
          score: 1,
          status: 1
        }
      );
      
      setCheckinMessage({ 
        type: 'success', 
        text: 'เช็คชื่อสำเร็จ! 🎉' 
      });
      
      // Auto-close modal after successful check-in
      setTimeout(() => {
        setShowCheckinQRModal(false);
        setCheckinMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error processing check-in QR code:', error);
      setCheckinMessage({ 
        type: 'error', 
        text: 'เกิดข้อผิดพลาดในการเช็คชื่อ โปรดลองใหม่อีกครั้ง' 
      });
    } finally {
      setIsProcessingCheckin(false);
    }
  };
  
  /**
   * handleShowCheckinScanner: Shows the QR scanner modal for check-ins.
   * Opens a modal with QR scanner to allow students to check in.
   * 
   * แสดงโมดัลสแกนเนอร์ QR สำหรับการเช็คชื่อ
   * เปิดโมดัลพร้อมเครื่องสแกน QR เพื่อให้นักเรียนเช็คชื่อ
   */
  const handleShowCheckinScanner = () => {
    setCheckinMessage({ type: '', text: '' });
    setShowCheckinQRModal(true);
  };

  /**
   * handleShowCheckinInClassroom: Shows the QR scanner modal for check-ins within a specific classroom.
   * Opens a modal with QR scanner to allow students to check in to the current classroom.
   * 
   * แสดงโมดัลสแกนเนอร์ QR สำหรับการเช็คชื่อภายในห้องเรียนที่ระบุ
   * เปิดโมดัลพร้อมเครื่องสแกน QR เพื่อให้นักเรียนเช็คชื่อในห้องเรียนปัจจุบัน
   * @param {Object} classroom - The classroom object for context
   */
  const handleShowCheckinInClassroom = (classroom) => {
    setCheckinMessage({ type: '', text: '' });
    setShowCheckinQRModal(true);
  };

  useEffect(() => {
    if (showRegisterClassroomModal && !qrScannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader", 
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        // QR code detected - process it
        handleQRCodeScanned(decodedText);
        // Optional: stop scanning after successful detection
        scanner.clear();
      }, (error) => {
        // Handle scan errors silently
      });
      
      qrScannerRef.current = scanner;
      
      // Cleanup function
      return () => {
        if (qrScannerRef.current) {
          qrScannerRef.current.clear();
          qrScannerRef.current = null;
        }
      };
    }
  }, [showRegisterClassroomModal]);

  // Initialize check-in QR scanner when modal is opened
  useEffect(() => {
    if (showCheckinQRModal && !checkinQRScannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "checkin-qr-reader", 
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        // QR code detected - process it for check-in
        handleCheckinQRCodeScanned(decodedText);
        // Stop scanning after successful detection
        scanner.clear();
      }, (error) => {
        // Handle scan errors silently
      });
      
      checkinQRScannerRef.current = scanner;
      
      // Cleanup function
      return () => {
        if (checkinQRScannerRef.current) {
          checkinQRScannerRef.current.clear();
          checkinQRScannerRef.current = null;
        }
      };
    }
  }, [showCheckinQRModal]);

  useEffect(() => {
    console.log("Loading state:", loading);
    console.log("Selected classroom:", selectedClassroom);
  }, [loading, selectedClassroom]);

  // Update the return statement to handle auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-blue-800">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
        </div>
      </div>
    )
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
            <div className="mb-6">
              <button
                onClick={() => setShowRegisterClassroomModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-ChakraPetchTH text-lg shadow-md"
              >
                ลงทะเบียนห้องเรียนใหม่
              </button>
            </div>
            
            {myClassrooms.length === 0 ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">คุณยังไม่ได้อยู่ในห้องเรียนใด ๆ</p>
                <button
                  onClick={() => setShowRegisterClassroomModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-ChakraPetchTH text-lg shadow-md mx-auto"
                >
                  ลงทะเบียนห้องเรียนใหม่
                </button>
              </div>
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

        {/* ถ้าเลือกห้อง => แสดงการเช็คชื่อและ quiz แยกเป็นส่วนๆ ชัดเจน */}
        {!loading && selectedClassroom && (
          <div className="space-y-6">
            {/* SECTION 1: Classroom Info */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-blue-900 font-ChakraPetchTH">
                  <span className="inline-block mr-2">📚</span> 
                  ข้อมูลห้องเรียน
                </h2>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-700 mb-2">
                    <span className="font-bold">รหัสวิชา:</span> {selectedClassroom.info?.code || 'N/A'}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-bold">ชื่อวิชา:</span> {selectedClassroom.info?.name || 'N/A'}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-bold">ห้องเรียน:</span> {selectedClassroom.info?.room || 'N/A'}
                  </p>
                </div>
                {selectedClassroom.info?.photo && (
                  <div className="flex justify-center">
                    <img 
                      src={selectedClassroom.info.photo} 
                      alt={selectedClassroom.info.name}
                      className="w-full max-w-xs rounded-md object-cover" 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Check-in */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-blue-900 font-ChakraPetchTH">
                  <span className="inline-block mr-2">✅</span>
                  การเช็คชื่อเข้าเรียน
                </h2>
                <button
                  onClick={() => handleShowCheckinInClassroom(selectedClassroom)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-ChakraPetchTH shadow-md flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  เช็คชื่อเข้าเรียน
                </button>
              </div>
              
              <div className="mt-3">
                <p className="text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  กดปุ่มเช็คชื่อเพื่อสแกน QR Code ที่อาจารย์แสดง เพื่อบันทึกการเข้าเรียนของคุณ
                </p>
                
                {/* Check-in History Table */}
                <div className="mt-4">
                  <h3 className="text-lg font-ChakraPetchTH font-semibold text-blue-800 mb-2">
                    ประวัติการเช็คชื่อของคุณ
                  </h3>
                  
                  {checkinHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-green-50">
                            <th className="border border-green-200 px-4 py-2 text-left font-ChakraPetchTH">ลำดับ</th>
                            <th className="border border-green-200 px-4 py-2 text-left font-ChakraPetchTH">รหัสการเช็คชื่อ</th>
                            <th className="border border-green-200 px-4 py-2 text-left font-ChakraPetchTH">วันที่เช็คชื่อ</th>
                            <th className="border border-green-200 px-4 py-2 text-left font-ChakraPetchTH">เช็คชื่อเมื่อ</th>
                            <th className="border border-green-200 px-4 py-2 text-left font-ChakraPetchTH">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkinHistory.map((checkin, index) => (
                            <tr key={checkin.id} className="hover:bg-green-50 transition-colors">
                              <td className="border border-green-200 px-4 py-2 font-ChakraPetchTH">{index + 1}</td>
                              <td className="border border-green-200 px-4 py-2 font-ChakraPetchTH">{checkin.code}</td>
                              <td className="border border-green-200 px-4 py-2 font-ChakraPetchTH">{checkin.date}</td>
                              <td className="border border-green-200 px-4 py-2 font-ChakraPetchTH">{checkin.checkinTime}</td>
                              <td className="border border-green-200 px-4 py-2 font-ChakraPetchTH">
                                {checkin.status === 1 ? (
                                  <span className="text-green-600 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    เปิดใช้งาน
                                  </span>
                                ) : checkin.status === 0 ? (
                                  <span className="text-red-600 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    ปิดใช้งาน
                                  </span>
                                ) : (
                                  <span className="text-gray-600 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    เสร็จสิ้น
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-600 font-ChakraPetchTH">คุณยังไม่มีประวัติการเช็คชื่อในห้องเรียนนี้</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Quiz */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <h2 className="text-2xl font-bold text-blue-900 font-ChakraPetchTH mb-4">
                <span className="inline-block mr-2">📝</span>
                แบบทดสอบ (Quiz)
              </h2>
              
              {questions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 font-ChakraPetchTH">ยังไม่มีควิซในขณะนี้</p>
                  <p className="text-gray-500 text-sm font-ChakraPetchTH mt-1">อาจารย์จะเพิ่มควิซเมื่อต้องการให้คุณตอบคำถาม</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q) => {
                    // คำตอบที่พิมพ์/เลือกไว้ (ใน state)
                    const ansValue = answersInput[q.questionDocId] || '';
                    return (
                      <div
                        key={q.questionDocId}
                        className="border-2 border-indigo-100 p-6 rounded-lg hover:bg-indigo-50 transition bg-white"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-lg text-indigo-900 font-ChakraPetchTH">
                            คำถาม #{q.question_no}
                          </h3>
                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                            รหัสเช็คชื่อ: {q.checkinCode || '-'}
                          </span>
                        </div>
                        
                        <p className="font-medium mb-4 text-gray-800 font-ChakraPetchTH">
                          {q.question_text}
                        </p>

                        {/* ถ้าเป็นปรนัย => มี choices */}
                        {q.question_type === 'objective' && Array.isArray(q.choices) && q.choices.length > 0 ? (
                          <div className="flex flex-col space-y-3 mb-4 bg-white p-4 rounded-lg border border-indigo-100">
                            {q.choices.map((choice, idx) => (
                              <label key={idx} className="flex items-center space-x-3 p-2 rounded hover:bg-indigo-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`q_${q.questionDocId}`}
                                  value={choice}
                                  checked={ansValue === choice}
                                  onChange={(e) => handleAnswerChange(q.questionDocId, e.target.value)}
                                  className="h-5 w-5 text-indigo-600"
                                />
                                <span className="font-ChakraPetchTH">{choice}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          // ถ้าเป็นอัตนัย => ช่องกรอก
                          <textarea
                            placeholder="พิมพ์คำตอบของคุณที่นี่..."
                            className="w-full p-3 border border-indigo-200 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none mb-4"
                            rows="3"
                            value={ansValue}
                            onChange={(e) => handleAnswerChange(q.questionDocId, e.target.value)}
                          ></textarea>
                        )}

                        <button
                          onClick={() => handleSubmitAnswer(q)}
                          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-ChakraPetchTH flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          ส่งคำตอบ
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
        {showRegisterClassroomModal && (
          <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg
                          className="h-6 w-6 text-green-600"
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
                          ลงทะเบียนห้องเรียน
                        </h3>
                        <div className="mt-2">
                          <form onSubmit={handleRegisterClassroom}>
                            <input
                              type="text"
                              placeholder="รหัสห้องเรียน"
                              className="w-full p-2 border rounded mb-2"
                              value={registerClassroomId}
                              onChange={(e) => setRegisterClassroomId(e.target.value)}
                            />
                            <button
                              type="submit"
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                            >
                              ลงทะเบียน
                            </button>
                          </form>
                          {registerMessage.text && (
                            <p
                              className={`mt-2 text-sm ${
                                registerMessage.type === 'error' ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {registerMessage.text}
                            </p>
                          )}
                          <div className="mt-4">
                            <h4 className="text-md font-ChakraPetchTH mb-2">หรือสแกน QR Code</h4>
                            <div 
                              id="qr-reader" 
                              className="w-full rounded overflow-hidden"
                              style={{ maxWidth: '100%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      onClick={() => setShowRegisterClassroomModal(false)}
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
        {/* Modal: Check-in QR Scanner */}
        {showCheckinQRModal && (
          <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg
                          className="h-6 w-6 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-base font-semibold text-gray-900" id="modal-title">
                          เช็คชื่อเข้าเรียน
                          {selectedClassroom && (
                            <span className="text-blue-600 ml-2">
                              {selectedClassroom.info?.name}
                            </span>
                          )}
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 mb-4">
                            กรุณาสแกน QR Code ที่อาจารย์แสดงเพื่อเช็คชื่อเข้าเรียน
                          </p>
                          
                          {checkinMessage.text && (
                            <div className={`p-3 rounded mb-4 ${
                              checkinMessage.type === 'error' ? 'bg-red-100 text-red-700' : 
                              checkinMessage.type === 'success' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              <p className="text-sm font-ChakraPetchTH">{checkinMessage.text}</p>
                            </div>
                          )}
                          
                          <div 
                            id="checkin-qr-reader" 
                            className="w-full rounded overflow-hidden"
                            style={{ maxWidth: '100%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      onClick={() => setShowCheckinQRModal(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 shadow-xs ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      ปิด
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