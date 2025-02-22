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
} from 'firebase/firestore'

function Dashboard() {
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const [profile, setProfile] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [showSignOutModal, setShowSignOutModal] = useState(false)

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

  const handleConfirmSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-4xl --font-InterEN mb-8">Classroom Management System</div>
          <ul>
            <li className="mb-4">
              <button
                onClick={() => navigate('/create-classroom')}
                className="hover:text-blue-300 transition font-ChakraPetchTH"
              >
                สร้างห้องเรียน
              </button>
            </li>
          </ul>
        </div>
        {/* Clickable Profile for editing */}
        <div
          className="flex items-center pt-6 border-t border-blue-700 cursor-pointer"
          onClick={() => navigate('/edit-profile')}
        >
          {profile && profile.photoURL ? (
            <img
              src={profile.photoURL}
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
              {profile?.displayName || currentUser?.email || 'User'}
            </p>
            {currentUser && (
              <p className="text-blue-200 text-sm">{currentUser.email}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-blue-50 p-8 animate-fadeIn overflow-y-auto">
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
            ยินดีต้อนรับสู่ระบบจัดการห้องเรียน, {profile?.displayName || currentUser?.email || 'User'}🥳
          </h2>
          <p className="text-blue-700 font-ChakraPetchTH mb-4">
            ยินดีต้อนรับสู่ระบบจัดการห้องเรียนมหาวิทยาลัยขอนแก่น
          </p>
          <div>
            <h3 className="text-lg font-ChakraPetchTH mb-4 text-blue-900">ห้องเรียนของคุณ</h3>
            {classrooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    onClick={() => navigate(`/edit-classroom/${classroom.id}`)}
                    className="cursor-pointer flex flex-col items-center border p-6 rounded-lg shadow-lg bg-white transform hover:scale-105 transition duration-300"
                  >
                    {classroom.info.photo ? (
                      <img
                        src={classroom.info.photo}
                        alt={classroom.info.name}
                        className="w-full h-48 object-cover rounded-lg border border-gray-300 mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-blue-300 flex items-center justify-center rounded-lg border border-gray-300 mb-4">
                        <span className="text-lg text-white">No Image</span>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-Inter text-blue-900 text-xl">{classroom.info.name}</p>
                      <p className="text-blue-700 font-Inter text-lg">Code: {classroom.info.code}</p>
                      <p className="text-blue-700 font-Inter text-lg">Room: {classroom.info.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-700">ไม่พบห้องเรียน</p>
            )}
          </div>
        </div>
      </main>

      {/* Sign Out Confirmation Modal */}
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