import React, { useEffect, useState } from 'react'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  collectionGroup,
  getDocs,
  query,
  where,
  documentId,
  setDoc
} from 'firebase/firestore'
import { app } from '../../firebase_config'
import { useNavigate } from 'react-router-dom'

function StudentDashboard() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  const [myClassrooms, setMyClassrooms] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      // If not logged in, go to login
      navigate('/')
      return
    }

    // 1) Load the student’s user profile
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

    // 2) Query all 'students' subcollections across all classroom docs,
    // looking for a doc where doc.id == currentUser.uid
    const loadClassrooms = async () => {
      try {
        setLoading(true)
        const q = query(
          collectionGroup(db, 'students'),
          where('stdid', '==', currentUser.uid)
        )
        const snapshot = await getDocs(q)
        const parentDocPromises = []

        snapshot.forEach((studentDocSnap) => {
          const classroomDocRef = studentDocSnap.ref.parent.parent
          if (classroomDocRef) {
            parentDocPromises.push(getDoc(classroomDocRef))
          }
        })

        const classroomDocs = await Promise.all(parentDocPromises)
        const classroomsData = classroomDocs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
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
  }, [currentUser, navigate, db])

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // เพิ่มฟังก์ชันเพื่อพาไปหน้า StudentClassroomDetailPage
  const handleEnterClassroom = (classroomId) => {
    // ไปหน้า student-classroom/:classroomId
    navigate(`/student-classroom/${classroomId}`)
  }

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
            <button
              onClick={() => navigate('/student-dashboard')}
              className="hover:text-blue-300 transition"
            >
              My Classes
            </button>
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
          <h1 className="text-3xl">My Classes</h1>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <p>Loading your classes...</p>
        ) : myClassrooms.length === 0 ? (
          <p>You are not registered in any classroom yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myClassrooms.map((classroom) => {
              const info = classroom.info || {}
              return (
                <div
                  key={classroom.id}
                  className="border rounded-lg shadow-md p-4 bg-white hover:shadow-lg transition cursor-pointer"
                  // เมื่อกดจะไปหน้า StudentClassroomDetailPage
                  onClick={() => handleEnterClassroom(classroom.id)}
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
      </main>
    </div>
  )
}

export default StudentDashboard
