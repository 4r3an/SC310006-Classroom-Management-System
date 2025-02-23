import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { app } from '../../firebase_config'
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  setDoc,
  updateDoc  // <-- added updateDoc for edit functionality
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

function Dashboard() {
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const [profile, setProfile] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState(null)

  // Inline classroom creation state
  const [showCreate, setShowCreate] = useState(false)
  const [classroomCode, setClassroomCode] = useState('')
  const [classroomName, setClassroomName] = useState('')
  const [room, setRoom] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [loading, setLoading] = useState(false)
  const [manageMode, setManageMode] = useState(false)

  // New state for inline editing a classroom
  const [editingClassroom, setEditingClassroom] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhoto, setEditPhoto] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editMessage, setEditMessage] = useState('')

  // *** New state added for inline EditClassroom functionality ***
  const [editStudents, setEditStudents] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')

  // New state to toggle between student management vs. full detail edit
  const [showDetailEdit, setShowDetailEdit] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Add new state for inline attendance check
  const [showAttendanceInline, setShowAttendanceInline] = useState(false)

  // Add new state to hold check-in records near the other inline edit states
  const [editCheckinRecords, setEditCheckinRecords] = useState([])

  // Fetch user profile
  useEffect(() => {
    if (currentUser) {
      const docRef = doc(db, 'users', currentUser.uid)
      getDoc(docRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data())
          }
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error)
        })
    }
  }, [currentUser, db])

  // Fetch classrooms owned by the current user
  useEffect(() => {
    if (currentUser) {
      const classroomsQuery = query(
        collection(db, 'classroom'),
        where('owner', '==', currentUser.uid)
      )
      getDocs(classroomsQuery)
        .then((querySnapshot) => {
          const classroomsData = []
          querySnapshot.forEach((docSnap) => {
            classroomsData.push({ id: docSnap.id, ...docSnap.data() })
          })
          setClassrooms(classroomsData)
        })
        .catch((error) => {
          console.error('Error fetching classrooms:', error)
        })
    }
  }, [currentUser, db])

  // Fetch students for the classroom that is being edited
  useEffect(() => {
    if (editingClassroom) {
      const fetchStudents = async () => {
        try {
          const studentsRef = collection(db, 'classroom', editingClassroom.id, 'students')
          const querySnapshot = await getDocs(studentsRef)
          const studentsList = []
          querySnapshot.forEach((docSnap) => {
            studentsList.push({ id: docSnap.id, ...docSnap.data() })
          })
          setEditStudents(studentsList)
        } catch (error) {
          console.error('Error fetching students for inline edit:', error)
        }
      }
      fetchStudents()
    }
  }, [editingClassroom, db])

  // Fetch available users for adding as students
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('classroom.status', '==', 2))
        const querySnapshot = await getDocs(q)
        const availableList = []
        querySnapshot.forEach((docSnap) => {
          availableList.push({ id: docSnap.id, ...docSnap.data() })
        })
        setAvailableUsers(availableList)
      } catch (error) {
        console.error('Error fetching available users:', error)
      }
    }
    fetchAvailableUsers()
  }, [db])

  // Add a useEffect to fetch check-in records when a classroom is being edited
  useEffect(() => {
    if (editingClassroom) {
      const fetchCheckinRecords = async () => {
        try {
          const checkinRef = collection(db, 'classroom', editingClassroom.id, 'checkin')
          const querySnapshot = await getDocs(checkinRef)
          const records = []
          querySnapshot.forEach((docSnap) => {
            records.push({ id: docSnap.id, ...docSnap.data() })
          })
          // Optionally sort records by document id or a specific field
          setEditCheckinRecords(records)
        } catch (error) {
          console.error('Error fetching check-in records:', error)
        }
      }
      fetchCheckinRecords()
    }
  }, [editingClassroom, db])

  const handleAddStudent = async () => {
    if (!selectedStudent) return

    // Check if the student is already added
    if (editStudents.some(student => student.id === selectedStudent)) {
      alert('นักเรียนนี้ถูกเพิ่มแล้ว.')
      return
    }

    try {
      const userToAdd = availableUsers.find((user) => user.id === selectedStudent)
      if (!userToAdd) return
      const studentRef = doc(db, 'classroom', editingClassroom.id, 'students', userToAdd.id)
      await setDoc(studentRef, {
        stdid: userToAdd.id,
        name: userToAdd.name,
        status: 1,
      })
      setEditStudents([
        ...editStudents,
        { id: userToAdd.id, stdid: userToAdd.id, name: userToAdd.name, status: 1 }
      ])
      alert('เพิ่มนักเรียนสำเร็จแล้ว.')
      setSelectedStudent('')
    } catch (err) {
      console.error('Error adding student inline:', err)
      alert('เพิ่มนักเรียนไม่สำเร็จ.')
    }
  }

  const handleConfirmSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleDropdown = (id) => {
    setOpenDropdownId(prev => (prev === id ? null : id))
  }

  const handleDeleteClassroom = async (classroomId) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบห้องเรียนนี้หรือไม่?")) return
    try {
      await deleteDoc(doc(db, 'classroom', classroomId))
      setClassrooms(prev => prev.filter(c => c.id !== classroomId))
    } catch (error) {
      console.error("Error deleting classroom:", error)
    }
  }

  // Revised function to create a classroom document following the new structure  
  const handleCreateClassroom = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cid = uuidv4()
      const classroomRef = doc(db, 'classroom', cid)
      await setDoc(classroomRef, {
        owner: currentUser.uid,
        info: {
          code: classroomCode,
          name: classroomName,
          photo: photoURL || '',
          room: room,
        }
      })
      setClassrooms(prev => [
        ...prev,
        { id: cid, owner: currentUser.uid, info: { code: classroomCode, name: classroomName, photo: photoURL, room: room } }
      ])
      setClassroomCode('')
      setClassroomName('')
      setRoom('')
      setPhotoURL('')
      setShowCreate(false)
      if (manageMode) setManageMode(false)
      alert('สร้างห้องเรียนสำเร็จแล้ว!')
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้างห้องเรียน:', error)
      alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน')
    }
    setLoading(false)
  }

  // Function to initialize edit form when a classroom is selected to edit
  const initEditClassroom = (classroom) => {
    setManageMode(true) // เพิ่มบรรทัดนี้เพื่อให้เข้าสู่โหมดแก้ไข
    setEditingClassroom(classroom)
    setEditCode(classroom.info.code)
    setEditName(classroom.info.name)
    setEditPhoto(classroom.info.photo)
    setEditRoom(classroom.info.room)
    setEditMessage('')
    setOpenDropdownId(null)
    setShowDetailEdit(false) // start with student management view
    // Clear any previously loaded students or selected student
    setEditStudents([])
    setSelectedStudent('')
  }

  // Function to handle the classroom update
  const handleUpdateClassroom = async (e) => {
    e.preventDefault()
    setLoading(true)
    setEditMessage('')
    try {
      const classroomRef = doc(db, 'classroom', editingClassroom.id)
      await updateDoc(classroomRef, {
        'info.code': editCode,
        'info.name': editName,
        'info.photo': editPhoto,
        'info.room': editRoom,
      })
      // Update local state
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === editingClassroom.id
            ? { ...c, info: { code: editCode, name: editName, photo: editPhoto, room: editRoom } }
            : c
        )
      )
      setEditMessage('แก้ไขห้องเรียนสำเร็จแล้ว.')
      // Optionally, close edit mode after success:
      // setEditingClassroom(null)
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการแก้ไขห้องเรียน: ', err)
      setEditMessage('แก้ไขห้องเรียนไม่สำเร็จ.')
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-500 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-4xl --font-InterEN mb-8">Classroom Management System</div>
          <ul className="space-y-4">
            <li>
              <button
                onClick={() => { setManageMode(false); setShowCreate(false); setEditingClassroom(null) }}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                ห้องเรียนของคุณ
              </button>
            </li>
            <li>
              <button
                onClick={() => { setManageMode(true); setShowCreate(true); setEditingClassroom(null) }}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                สร้างห้องเรียน
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
          <h1 className="text-3xl font-ChakraPetchTH text-blue-900">แดชบอร์ด</h1>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            ออกจากระบบ
          </button>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
            ยินดีต้อนรับสู่ระบบจัดการห้องเรียน, {profile?.name || currentUser?.email || 'User'}🥳
          </h2>
          <p className="text-blue-700 font-ChakraPetchTH mb-4">
            ยินดีต้อนรับสู่ระบบจัดการห้องเรียนมหาวิทยาลัยขอนแก่น
          </p>
          <div>
            <h3 className="text-lg font-ChakraPetchTH mb-4 text-blue-900">
              {manageMode
                ? editingClassroom ? 'แก้ไขห้องเรียน' : 'สร้างห้องเรียน'
                : 'ห้องเรียนของคุณ'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {manageMode ? (
                // ถ้ามี editingClassroom จะแสดงฟอร์มแก้ไขแบบ inline
                editingClassroom ? (
                  <div className="col-span-1 md:col-span-2 relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-ChakraPetchTH text-blue-900">
                        {showDetailEdit
                          ? `แก้ไขรายละเอียดห้องเรียน: ${editingClassroom.info.name}`
                          : `จัดการนักเรียนในห้องเรียน: ${editingClassroom.info.name}`}
                      </h2>
                      {/* Three dot button for dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen((prev) => !prev)}
                          className="p-2 focus:outline-none"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-gray-700"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M6 10c0-1.105.672-2 1.5-2S9 8.895 9 10s-.672 2-1.5 2S6 11.105 6 10zm4 0c0-1.105.672-2 1.5-2s1.5.895 1.5 2-.672 2-1.5 2-1.5-.895-1.5-2zm4 0c0-1.105.672-2 1.5-2s1.5.895 1.5 2-.672 2-1.5 2-1.5-.895-1.5-2z" />
                          </svg>
                        </button>
                        {dropdownOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10">
                            <button
                              onClick={() => { setShowDetailEdit(true); setDropdownOpen(false) }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              แก้ไขรายละเอียดห้องเรียน
                            </button>
                            <button
                              onClick={() => { setShowDetailEdit(false); setDropdownOpen(false) }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              จัดการนักเรียน
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {showDetailEdit ? (
                      // Inline classroom detail edit form
                      <form onSubmit={handleUpdateClassroom} className="space-y-6">
                        <input
                          type="text"
                          placeholder="รหัสวิชา (ex. SC310001)"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="text"
                          placeholder="ชื่อวิชา (ex. Computer Programming)"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="url"
                          placeholder="URL รูปภาพ (ถ้ามี)"
                          value={editPhoto}
                          onChange={(e) => setEditPhoto(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        />
                        <input
                          type="text"
                          placeholder="ชื่อห้องเรียน (ex. SC5101)"
                          value={editRoom}
                          onChange={(e) => setEditRoom(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        {editMessage && <p className="text-green-600 text-center">{editMessage}</p>}
                        <div className="flex justify-end space-x-4">
                          <button
                            type="button"
                            onClick={() => setEditingClassroom(null)}
                            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          >
                            {loading ? 'กำลังแก้ไข...' : 'บันทึกการแก้ไข'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Inline student management view: show registered students and add new
                      <>
                        <div className="mt-4">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">นักเรียนที่ลงทะเบียน</h3>
                          {editStudents.length > 0 ? (
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
                                  {editStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-blue-50">
                                      <td className="border p-2">{student.stdid}</td>
                                      <td className="border p-2">{student.name}</td>
                                      <td className="border p-2">
                                        {student.status === 0 ? 'รออนุมัติ' : 'ตรวจสอบแล้ว'}
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

                        <div className="mt-8">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">เพิ่มนักเรียน</h3>
                          <div className="mb-4">
                            <select
                              value={selectedStudent}
                              onChange={(e) => setSelectedStudent(e.target.value)}
                              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              <option value="">-- เลือกนักเรียน --</option>
                              {availableUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex space-x-4">
                            <button
                              type="button"
                              onClick={handleAddStudent}
                              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                            >
                              เพิ่มนักเรียน
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAttendanceInline(prev => !prev)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            >
                              สร้างการเช็คชื่อ
                            </button>
                          </div>
                          {showAttendanceInline && (
                            <div className="mt-4 p-4 border border-gray-300 rounded-lg">
                              {/* Inline สำหรับการเช็คชื่อ (ยังไม่มีเนื้อหา) */}
                            </div>
                          )}
                        </div>

                        <div className="mt-8">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">ตารางการเช็คชื่อ</h3>
                          {editCheckinRecords.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border">
                                <thead>
                                  <tr className="bg-blue-100">
                                    <th className="border p-2 text-left">ลำดับที่</th>
                                    <th className="border p-2 text-left">รหัสเช็คชื่อ</th>
                                    <th className="border p-2 text-left">วัน/เวลา</th>
                                    <th className="border p-2 text-left">สถานะ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editCheckinRecords.map((record, index) => (
                                    <tr key={record.id} className="hover:bg-blue-50">
                                      <td className="border p-2">{index + 1}</td>
                                      <td className="border p-2">{record.code}</td>
                                      <td className="border p-2">{record.date}</td>
                                      <td className="border p-2">
                                        {record.status === 0
                                          ? 'ยังไม่เริ่ม'
                                          : record.status === 1
                                          ? 'กำลังเช็คชื่อ'
                                          : 'เสร็จแล้ว'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-700">ยังไม่มีข้อมูลการเช็คชื่อ</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // ถ้ายังไม่ได้เลือกแก้ไข ให้แสดงฟอร์มสร้างห้องเรียน
                  showCreate ? (
                    <div className="col-span-1 md:col-span-2 relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50">
                      <form onSubmit={handleCreateClassroom} className="space-y-6">
                        <input
                          type="text"
                          placeholder="รหัสวิชา (ex. SC310001)"
                          value={classroomCode}
                          onChange={(e) => setClassroomCode(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="text"
                          placeholder="ชื่อวิชา (ex. Computer Programming)"
                          value={classroomName}
                          onChange={(e) => setClassroomName(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="text"
                          placeholder="ชื่อห้องเรียน (ex. SC5101)"
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
                        <div className="flex justify-end space-x-4">
                          <button
                            type="button"
                            onClick={() => { setShowCreate(false); setManageMode(false) }}
                            className="px-6 py-3 rounded border border-gray-300 hover:bg-gray-100 transition"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-md"
                          >
                            {loading ? 'กำลังสร้าง...' : 'สร้าง'}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div
                      onClick={() => setShowCreate(true)}
                      className="col-span-1 md:col-span-2 relative flex flex-col items-center justify-center border-4 border-dashed border-blue-400 rounded-xl h-60 cursor-pointer hover:bg-blue-100 transition duration-300"
                    >
                      <span className="text-6xl text-blue-500">+</span>
                      <span className="mt-4 text-2xl text-blue-700 font-bold">
                        สร้างห้องเรียนใหม่
                      </span>
                    </div>
                  )
                )
              ) : (
                <>
                  {classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="relative flex flex-col items-center border border-gray-200 rounded-lg shadow-md bg-white transition transform hover:-translate-y-1 hover:shadow-xl duration-300"
                    >
                      {/* Dropdown Button */}
                      <button
                        onClick={() => toggleDropdown(classroom.id)}
                        className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-2 transition duration-200 active:scale-95 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-700"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6 10c0-1.105.672-2 1.5-2S9 8.895 9 10s-.672 2-1.5 2S6 11.105 6 10zm4 0c0-1.105.672-2 1.5-2s1.5.895 1.5 2-.672 2-1.5 2-1.5-.895-1.5-2zm4 0c0-1.105.672-2 1.5-2s1.5.895 1.5 2-.672 2-1.5 2-1.5-.895-1.5-2z" />
                        </svg>
                      </button>
                      {openDropdownId === classroom.id && (
                        <div className="absolute top-10 right-2 w-32 bg-white shadow-lg rounded py-1 z-20">
                          <button
                            onClick={() => initEditClassroom(classroom)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            จัดการ
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteClassroom(classroom.id)
                              setOpenDropdownId(null)
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                      {classroom.info.photo ? (
                        <img
                          src={classroom.info.photo}
                          alt={classroom.info.name}
                          className="w-full h-48 object-cover rounded-t-lg border-b border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-48 bg-blue-300 flex items-center justify-center rounded-t-lg border-b border-gray-200">
                          <span className="text-lg text-white">No Image</span>
                        </div>
                      )}
                      <div className="p-4 text-center">
                        <p className="font-semibold text-blue-900 text-xl mb-1">
                          {classroom.info.name}
                        </p>
                        <p className="text-blue-700 text-lg">Code: {classroom.info.code}</p>
                        <p className="text-blue-700 text-lg">Room: {classroom.info.room}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ไม่ใช้ modal แสดง inline จนกว่าจะออกจาก manageMode */}
      </main>
      
      {/* Sign Out Confirmation Modal (ยังคงใช้ modalสำหรับออกจากระบบ) */}
      {showSignOutModal && (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-base font-semibold text-gray-900" id="modal-title">ยืนยันออกจากระบบ</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?</p>
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
                    ยืนยันออกจากระบบ
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

export default Dashboard