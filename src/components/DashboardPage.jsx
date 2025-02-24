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
  updateDoc,
  addDoc
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

/**
 * Dashboard component provides the main classroom management UI.
 * Users can view, create, edit, and manage classrooms, as well as perform attendance check-ins.
 */
function Dashboard() {
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)
  const currentUser = auth.currentUser

  // State: user profile data
  const [profile, setProfile] = useState(null)

  // State: collection of classrooms owned by current user
  const [classrooms, setClassrooms] = useState([])

  // State: sign-out confirmation modal
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  // State: dropdown UI for each classroom card
  const [openDropdownId, setOpenDropdownId] = useState(null)

  // State: classroom creation form
  const [showCreate, setShowCreate] = useState(false)
  const [classroomCode, setClassroomCode] = useState('')
  const [classroomName, setClassroomName] = useState('')
  const [room, setRoom] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [loading, setLoading] = useState(false)

  // State: manage mode toggles the view between "My Classrooms" and "Create/Edit Classroom"
  const [manageMode, setManageMode] = useState(false)

  // State: for editing an existing classroom
  const [editingClassroom, setEditingClassroom] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhoto, setEditPhoto] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editMessage, setEditMessage] = useState('')

  // State: for inline student management
  const [editStudents, setEditStudents] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')

  // State: toggles between detail-edit of the classroom and student management
  const [showDetailEdit, setShowDetailEdit] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // State: attendance check
  const [showAttendanceInline, setShowAttendanceInline] = useState(false)
  const [editCheckinRecords, setEditCheckinRecords] = useState([])
  const [newCheckinCode, setNewCheckinCode] = useState('')
  const [newCheckinDate, setNewCheckinDate] = useState('')
  const [currentCheckinRecord, setCurrentCheckinRecord] = useState(null)

  // State: check-in details modal
  const [showCheckinDetailsModal, setShowCheckinDetailsModal] = useState(false)
  const [selectedCheckinForDetails, setSelectedCheckinForDetails] = useState(null)

  /**
   * useEffect: Fetch user profile if currentUser exists.
   */
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

  /**
   * useEffect: Fetch all classrooms owned by the currentUser.
   */
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

  /**
   * useEffect: Fetch students for the currently selected (editing) classroom.
   */
  useEffect(() => {
    if (editingClassroom) {
      const fetchStudents = async () => {
        try {
          const studentsRef = collection(db, 'classroom', editingClassroom.id, 'students')
          const querySnapshot = await getDocs(studentsRef)
          const studentsList = []
          querySnapshot.forEach((docSnap) => {
            // Initialize 'checked' as false if not found
            studentsList.push({ id: docSnap.id, checked: false, ...docSnap.data() })
          })
          setEditStudents(studentsList)
        } catch (error) {
          console.error('Error fetching students for inline edit:', error)
        }
      }
      fetchStudents()
    }
  }, [editingClassroom, db])

  /**
   * useEffect: Fetch available users who can be added as students.
   * Adjusting the query to match your user logic.
   */
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

  /**
   * useEffect: Fetch check-in records for the editing classroom.
   */
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
          setEditCheckinRecords(records)
        } catch (error) {
          console.error('Error fetching check-in records:', error)
        }
      }
      fetchCheckinRecords()
    }
  }, [editingClassroom, db])

  /**
   * useEffect: Load 'checked' status for students when a check-in record is currently active.
   */
  useEffect(() => {
    const loadCheckedStatus = async () => {
      if (!editingClassroom || !currentCheckinRecord) return
      try {
        const studentsRef = collection(
          db,
          'classroom',
          editingClassroom.id,
          'checkin',
          currentCheckinRecord.id,
          'students'
        )
        const snapshot = await getDocs(studentsRef)
        const checkedIds = snapshot.docs.map((doc) => doc.id) // IDs of checked-in students

        const updated = editStudents.map((s) =>
          checkedIds.includes(s.id) ? { ...s, checked: true } : { ...s, checked: false }
        )
        setEditStudents(updated)
      } catch (error) {
        console.error('Error loading checked status:', error)
      }
    }

    loadCheckedStatus()
  }, [editingClassroom, currentCheckinRecord, db, editStudents])

  /**
   * handleAddStudent: Adds a selected student (from availableUsers) to the editing classroom.
   */
  const handleAddStudent = async () => {
    if (!selectedStudent) return

    // Prevent re-adding the same student
    if (editStudents.some(student => student.id === selectedStudent)) {
      alert('This student is already added.')
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
      alert('Student added successfully.')
      setSelectedStudent('')
    } catch (err) {
      console.error('Error adding student inline:', err)
      alert('Failed to add student.')
    }
  }

  /**
   * handleConfirmSignOut: Signs out the user and navigates back to the home page.
   */
  const handleConfirmSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  /**
   * toggleDropdown: Toggles the classroom card dropdown menu.
   */
  const toggleDropdown = (id) => {
    setOpenDropdownId(prev => (prev === id ? null : id))
  }

  /**
   * handleDeleteClassroom: Deletes a classroom by ID if user confirms.
   */
  const handleDeleteClassroom = async (classroomId) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) return
    try {
      await deleteDoc(doc(db, 'classroom', classroomId))
      setClassrooms(prev => prev.filter(c => c.id !== classroomId))
    } catch (error) {
      console.error('Error deleting classroom:', error)
    }
  }

  /**
   * handleCreateClassroom: Creates a new classroom document in Firestore.
   */
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
        {
          id: cid,
          owner: currentUser.uid,
          info: {
            code: classroomCode,
            name: classroomName,
            photo: photoURL,
            room: room
          }
        }
      ])
      setClassroomCode('')
      setClassroomName('')
      setRoom('')
      setPhotoURL('')
      setShowCreate(false)
      if (manageMode) setManageMode(false)
      alert('Classroom created successfully!')
    } catch (error) {
      console.error('Error creating classroom:', error)
      alert('Error creating classroom.')
    }
    setLoading(false)
  }

  /**
   * initEditClassroom: Initializes edit mode for a selected classroom.
   */
  const initEditClassroom = (classroom) => {
    setManageMode(true)
    setEditingClassroom(classroom)
    setEditCode(classroom.info.code)
    setEditName(classroom.info.name)
    setEditPhoto(classroom.info.photo)
    setEditRoom(classroom.info.room)
    setEditMessage('')
    setOpenDropdownId(null)
    setShowDetailEdit(false)
    setEditStudents([])
    setSelectedStudent('')
  }

  /**
   * handleUpdateClassroom: Updates an existing classroom's info fields.
   */
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

      // Update local state to reflect changes
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === editingClassroom.id
            ? {
                ...c,
                info: {
                  code: editCode,
                  name: editName,
                  photo: editPhoto,
                  room: editRoom
                }
              }
            : c
        )
      )

      setEditMessage('Classroom updated successfully.')
    } catch (err) {
      console.error('Error updating classroom:', err)
      setEditMessage('Failed to update classroom.')
    }
    setLoading(false)
  }

  /**
   * handleCreateCheckin: Creates a new check-in record in the current editingClassroom.
   */
  const handleCreateCheckin = async () => {
    if (!newCheckinCode || !newCheckinDate) {
      alert('Please provide check-in code and date/time.')
      return
    }
    try {
      const checkinRef = await addDoc(
        collection(db, 'classroom', editingClassroom.id, 'checkin'),
        {
          code: newCheckinCode,
          date: newCheckinDate,
          status: 0
        }
      )
      setCurrentCheckinRecord({
        id: checkinRef.id,
        code: newCheckinCode,
        date: newCheckinDate,
        status: 0
      })
      setNewCheckinCode('')
      setNewCheckinDate('')
    } catch (error) {
      console.error('Error creating check-in record:', error)
      alert('Failed to create check-in record.')
    }
  }

  /**
   * handleStudentCheckin: Marks a student as checked-in for the current check-in record.
   */
  const handleStudentCheckin = async (studentId) => {
    try {
      const student = editStudents.find(s => s.id === studentId)
      if (!student) return

      const dateString = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })

      // Store in 'students' subcollection
      await setDoc(
        doc(db, 'classroom', editingClassroom.id, 'checkin', currentCheckinRecord.id, 'students', studentId),
        {
          stdid: student.stdid,
          name: student.name,
          remark: '',
          date: dateString
        }
      )

      // Store in 'scores' subcollection
      await setDoc(
        doc(db, 'classroom', editingClassroom.id, 'checkin', currentCheckinRecord.id, 'scores', student.stdid),
        {
          uid: studentId,
          stdid: student.stdid,
          name: student.name,
          remark: '',
          dates: dateString,
          score: 1,
          status: 1
        }
      )

      // Update local state
      setEditStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, checked: true } : s))
      )
    } catch (error) {
      console.error('Error storing student check-in:', error)
      alert('Failed to check in student.')
    }
  }

  /**
   * handleFinishCheckin: Sets the current check-in record status to "finished" (2).
   */
  const handleFinishCheckin = async () => {
    if (!currentCheckinRecord) return
    try {
      const checkinDocRef = doc(
        db,
        'classroom',
        editingClassroom.id,
        'checkin',
        currentCheckinRecord.id
      )
      await updateDoc(checkinDocRef, {
        status: 2
      })
      alert('Check-in process has been finalized.')

      // Refresh the list of check-in records after finishing
      const checkinRef = collection(db, 'classroom', editingClassroom.id, 'checkin')
      const querySnapshot = await getDocs(checkinRef)
      const records = []
      querySnapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() })
      })
      setEditCheckinRecords(records)

      // Clear the current check-in record to allow a new one
      setCurrentCheckinRecord(null)
    } catch (error) {
      console.error('Error finishing check-in:', error)
      alert('Error finalizing check-in.')
    }
  }

  /**
   * handleViewCheckinDetails: Displays check-in details in a modal for a specific record.
   */
  const handleViewCheckinDetails = async (record) => {
    setSelectedCheckinForDetails(record)
    setShowCheckinDetailsModal(true)

    try {
      const studentsRef = collection(
        db,
        'classroom',
        editingClassroom.id,
        'checkin',
        record.id,
        'students'
      )
      const snapshot = await getDocs(studentsRef)
      const checkedIds = snapshot.docs.map((doc) => doc.id)

      setEditStudents((prev) =>
        prev.map((s) =>
          checkedIds.includes(s.id)
            ? { ...s, checked: true }
            : { ...s, checked: false }
        )
      )
    } catch (error) {
      console.error('Error viewing check-in details:', error)
    }
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
                onClick={() => {
                  setManageMode(false)
                  setShowCreate(false)
                  setEditingClassroom(null)
                }}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                My Classrooms
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setManageMode(true)
                  setShowCreate(true)
                  setEditingClassroom(null)
                }}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                Create Classroom
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
          <h1 className="text-3xl font-ChakraPetchTH text-blue-900">Dashboard</h1>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
            Welcome to the Classroom Management System, {profile?.name || currentUser?.email || 'User'}!
          </h2>
          <p className="text-blue-700 font-ChakraPetchTH mb-4">
            Manage your classrooms at Khon Kaen University.
          </p>
          <div>
            <h3 className="text-lg font-ChakraPetchTH mb-4 text-blue-900">
              {manageMode
                ? editingClassroom
                  ? 'Edit Classroom'
                  : 'Create Classroom'
                : 'Your Classrooms'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {manageMode ? (
                editingClassroom ? (
                  // Inline Edit Classroom Form
                  <div className="col-span-1 md:col-span-2 relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-ChakraPetchTH text-blue-900">
                        {showDetailEdit
                          ? `Edit Classroom Details: ${editingClassroom.info.name}`
                          : `Manage Students: ${editingClassroom.info.name}`}
                      </h2>
                      {/* Three-dot button for dropdown */}
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
                              onClick={() => {
                                setShowDetailEdit(true)
                                setDropdownOpen(false)
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Edit Classroom
                            </button>
                            <button
                              onClick={() => {
                                setShowDetailEdit(false)
                                setDropdownOpen(false)
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Manage Students
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {showDetailEdit ? (
                      // Edit Classroom Details
                      <form onSubmit={handleUpdateClassroom} className="space-y-6">
                        <input
                          type="text"
                          placeholder="Subject Code (e.g., SC310001)"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Subject Name (e.g., Computer Programming)"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        <input
                          type="url"
                          placeholder="Photo URL (optional)"
                          value={editPhoto}
                          onChange={(e) => setEditPhoto(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        />
                        <input
                          type="text"
                          placeholder="Classroom Name (e.g., SC5101)"
                          value={editRoom}
                          onChange={(e) => setEditRoom(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          required
                        />
                        {editMessage && (
                          <p className="text-green-600 text-center">{editMessage}</p>
                        )}
                        <div className="flex justify-end space-x-4">
                          <button
                            type="button"
                            onClick={() => setEditingClassroom(null)}
                            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          >
                            {loading ? 'Updating...' : 'Save'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Student Management
                      <>
                        <div className="mt-4">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
                            Registered Students
                          </h3>
                          {editStudents.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border">
                                <thead>
                                  <tr className="bg-blue-100">
                                    <th className="border p-2 text-left">Student ID</th>
                                    <th className="border p-2 text-left">Name</th>
                                    <th className="border p-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-blue-50">
                                      <td className="border p-2">{student.stdid}</td>
                                      <td className="border p-2">{student.name}</td>
                                      <td className="border p-2">
                                        {student.status === 0 ? 'Pending' : 'Approved'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-700">
                              No students have registered yet.
                            </p>
                          )}
                        </div>

                        <div className="mt-8">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
                            Add Students
                          </h3>
                          <div className="mb-4">
                            <select
                              value={selectedStudent}
                              onChange={(e) => setSelectedStudent(e.target.value)}
                              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              <option value="">-- Choose a student --</option>
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
                              Add Student
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAttendanceInline(prev => !prev)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            >
                              {currentCheckinRecord ? 'Show Check-in Table' : 'Create Check-in'}
                            </button>
                          </div>

                          {/* Inline Check-in Creation Form */}
                          {showAttendanceInline && !currentCheckinRecord && (
                            <div className="mt-4 p-4 border border-gray-300 rounded-lg">
                              <div className="space-y-4">
                                <input
                                  type="text"
                                  placeholder="Check-in Code"
                                  value={newCheckinCode}
                                  onChange={(e) => setNewCheckinCode(e.target.value)}
                                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                />
                                <input
                                  type="datetime-local"
                                  value={newCheckinDate}
                                  onChange={(e) => setNewCheckinDate(e.target.value)}
                                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateCheckin}
                                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                  Create Check-in
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inline Check-in Table */}
                          {showAttendanceInline && currentCheckinRecord && (
                            <div className="mt-4 p-4 border border-gray-300 rounded-lg">
                              <div className="space-y-4">
                                <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
                                  Check-in Table (Code: {currentCheckinRecord.code}, Time: {currentCheckinRecord.date})
                                </h3>
                                {editStudents.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border">
                                      <thead>
                                        <tr className="bg-blue-100">
                                          <th className="border p-2 text-left">No.</th>
                                          <th className="border p-2 text-left">Student ID</th>
                                          <th className="border p-2 text-left">Name</th>
                                          <th className="border p-2 text-left">Status</th>
                                          <th className="border p-2 text-left">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {editStudents.map((student, index) => (
                                          <tr key={student.id} className="hover:bg-blue-50">
                                            <td className="border p-2">{index + 1}</td>
                                            <td className="border p-2">{student.stdid}</td>
                                            <td className="border p-2">{student.name}</td>
                                            <td className="border p-2">
                                              {student.checked ? 'Checked In' : 'Not Checked'}
                                            </td>
                                            <td className="border p-2">
                                              <button
                                                type="button"
                                                onClick={() => handleStudentCheckin(student.id)}
                                                disabled={student.checked}
                                                className={`px-3 py-1 rounded ${
                                                  student.checked
                                                    ? 'bg-gray-400'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                } text-white transition`}
                                              >
                                                Check In
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-center text-gray-700">
                                    No students in this classroom yet.
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={handleFinishCheckin}
                                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition mt-4"
                                >
                                  Finalize Check-in
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-8">
                          <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">
                            Check-in Records
                          </h3>
                          {editCheckinRecords.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border">
                                <thead>
                                  <tr className="bg-blue-100">
                                    <th className="border p-2 text-left">No.</th>
                                    <th className="border p-2 text-left">Check-in Code</th>
                                    <th className="border p-2 text-left">Date/Time</th>
                                    <th className="border p-2 text-left">Status</th>
                                    <th className="border p-2 text-left">Details</th>
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
                                          ? 'Not Started'
                                          : record.status === 1
                                          ? 'In Progress'
                                          : 'Finished'}
                                      </td>
                                      <td className="border p-2">
                                        <button
                                          type="button"
                                          onClick={() => handleViewCheckinDetails(record)}
                                          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                                        >
                                          Details
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-700">
                              No check-in records yet.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : showCreate ? (
                  // Create Classroom Form
                  <div className="col-span-1 md:col-span-2 relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50">
                    <form onSubmit={handleCreateClassroom} className="space-y-6">
                      <input
                        type="text"
                        placeholder="Subject Code (e.g., SC310001)"
                        value={classroomCode}
                        onChange={(e) => setClassroomCode(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Subject Name (e.g., Computer Programming)"
                        value={classroomName}
                        onChange={(e) => setClassroomName(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Classroom Name (e.g., SC5101)"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        required
                      />
                      <input
                        type="url"
                        placeholder="Photo URL (optional)"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      />
                      <div className="flex justify-end space-x-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreate(false)
                            setManageMode(false)
                          }}
                          className="px-6 py-3 rounded border border-gray-300 hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-md"
                        >
                          {loading ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  // "Create New Classroom" prompt
                  <div
                    onClick={() => setShowCreate(true)}
                    className="col-span-1 md:col-span-2 relative flex flex-col items-center justify-center border-4 border-dashed border-blue-400 rounded-xl h-60 cursor-pointer hover:bg-blue-100 transition duration-300"
                  >
                    <span className="text-6xl text-blue-500">+</span>
                    <span className="mt-4 text-2xl text-blue-700 font-bold">
                      Create New Classroom
                    </span>
                  </div>
                )
              ) : (
                // List of existing classrooms
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
                            Manage
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteClassroom(classroom.id)
                              setOpenDropdownId(null)
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            Delete
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
                        <p className="text-blue-700 text-lg">
                          Code: {classroom.info.code}
                        </p>
                        <p className="text-blue-700 text-lg">
                          Room: {classroom.info.room}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Check-in Details */}
      {showCheckinDetailsModal && selectedCheckinForDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-30 z-50">
          <div className="col-span-1 md:col-span-2 relative flex flex-col p-8 border-2 border-dashed border-blue-400 rounded-xl shadow-xl bg-blue-50 w-11/12 md:w-1/2">
            <h3 className="text-xl font-ChakraPetchTH mb-4 text-blue-900">Check-in Details</h3>
            <p className="text-blue-700 font-ChakraPetchTH mb-2">
              Check-in Code: {selectedCheckinForDetails.code}
            </p>
            <p className="text-blue-700 font-ChakraPetchTH mb-2">
              Date/Time: {selectedCheckinForDetails.date}
            </p>
            <p className="text-blue-700 font-ChakraPetchTH">
              Students Checked In: {editStudents.filter(s => s.checked).length} / {editStudents.length}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border p-2 text-left">No.</th>
                    <th className="border p-2 text-left">Student ID</th>
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {editStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-blue-50">
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">{student.stdid}</td>
                      <td className="border p-2">{student.name}</td>
                      <td className="border p-2">
                        {student.checked ? 'Checked In' : 'Not Checked'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowCheckinDetailsModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sign Out Confirmation */}
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
                      <h3
                        className="text-base font-semibold text-gray-900"
                        id="modal-title"
                      >
                        Confirm Sign Out
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to sign out?
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
                    Yes, Sign Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignOutModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 shadow-xs ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
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
