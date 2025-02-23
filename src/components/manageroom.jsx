import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { app } from '../firebase_config'

function Manageroom() {
  const { cid } = useParams()  // Classroom ID
  const navigate = useNavigate()
  const auth = getAuth()
  const db = getFirestore(app)
  const currentUser = auth.currentUser
  const [classroom, setClassroom] = useState(null)
  const [user, setUser] = useState(null)
  const [students, setStudents] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')  // State to store the generated QR code URL

// Name of manage Class
  useEffect(() => {
    if (auth.currentUser) {
      setUser({
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
      })
    }
  }, [auth.currentUser])

 // Load classroom, students, and check-ins   
  useEffect(() => {
    if (cid) {
      const classroomRef = doc(db, 'classroom', cid)
      getDoc(classroomRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setClassroom(data)
        } else {
          setMessage('Classroom not found.')
        }
      })
      // Load students
      const studentsRef = collection(db, 'classroom', cid, 'students')
      getDocs(studentsRef).then((querySnapshot) => {
        const studentsList = []
        querySnapshot.forEach((doc) => {
          studentsList.push({ id: doc.id, ...doc.data() })
        })
        setStudents(studentsList)
      })

      // Load check-ins
      const checkinRef = collection(db, 'classroom', cid, 'checkin')
      getDocs(checkinRef).then((querySnapshot) => {
        const checkinList = []
        querySnapshot.forEach((doc) => {
          checkinList.push({ id: doc.id, ...doc.data() })
        })
        setCheckins(checkinList)
      })
    }
  }, [cid, db])
  
  
  // Create QR Code based on classroom code
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = `${window.location.origin}/SC310006-Classroom-Management-System/#/manageroom/${cid}`
        const qrCode = await QRCode.toDataURL(url)
        setQrCodeUrl(qrCode)  // Update state with the QR code URL
      } catch (err) {
        console.error('Error generating QR Code:', err)
      }
    }

    if (cid) {
      generateQRCode()
    }
  }, [cid])

  // Add check-in
  const addCheckin = async () => {
    setLoading(true)
    setMessage('')
    try {
      // Create a new check-in record
      const newCheckinRef = doc(collection(db, 'classroom', cid, 'checkin'))
      const newCheckinData = {
        date: new Date().toLocaleString(),
        status: 'ongoing',
        studentsCount: students.length,
      }

      // Add the new check-in
      await setDoc(newCheckinRef, newCheckinData)

      // Copy students to the check-in scores subcollection
      const scoresRef = collection(newCheckinRef, 'scores')
      students.forEach((student) => {
        setDoc(doc(scoresRef, student.id), { status: 0 })  // status 0 for pending check-in
      })

      setMessage('Check-in added successfully.')
    } catch (err) {
      console.error('Error adding check-in:', err)
      setMessage('Failed to add check-in.')
    }
    setLoading(false)
  }

  if (!classroom) {
    return <div className="p-6 text-center text-gray-700">Loading classroom...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with Back to Dashboard button */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-t-lg shadow-lg mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-white text-blue-600 hover:bg-blue-100 transition px-4 py-2 rounded-lg border border-blue-600"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Classroom Info Section */}
      <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between">
          <div className="sm:w-2/3">
            <h1 className="text-4xl font-semibold text-blue-900">Course {classroom.info.name}</h1>
            <p className="text-lg text-blue-700 mt-2">รหัสวิชา: {classroom.info.code}</p>
            <p className="text-lg text-blue-700 mt-2">ห้องเรียน: {classroom.info.room}</p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1">จัดการโดย:  {user?.displayName || 'User'}</h2>
          </div>
          {classroom.info.photo && (
            <img
              src={classroom.info.photo}
              alt="Classroom"
              className="w-50 h-40 object-cover rounded-lg mt-4 sm:mt-0 sm:ml-8"
            />
          )}
        </div>
      </div>

      {/* QR Code for Registration */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">QR Code for Registration</h2>
        <div className="flex flex-col items-center">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mb-4" />
          ) : (
            <p className="text-center text-gray-700">Generating QR code...</p>
          )}
          <p className="text-center text-gray-700">Scan this QR code to register for this classroom.</p>
        </div>
      </div>

      {/* Registered Students */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">Registered Students</h2>
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-3 text-left">#</th>
                  <th className="border p-3 text-left">Student ID</th>
                  <th className="border p-3 text-left">Name</th>
                  <th className="border p-3 text-left">Image</th>
                  <th className="border p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-blue-50">
                    <td className="border p-3">{index + 1}</td>
                    <td className="border p-3">{student.stdid}</td>
                    <td className="border p-3">{student.name}</td>
                    <td className="border p-3">
                      {student.photo ? (
                        <img src={student.photo} alt="Student" className="w-12 h-12 rounded-full" />
                      ) : (
                        'No Image'
                      )}
                    </td>
                    <td className="border p-3">{student.status === 0 ? 'Pending' : 'Confirmed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-700">No students registered yet.</p>
        )}
      </div>

      {/* Add Check-in Button */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
        <button
          onClick={addCheckin}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Adding Check-in...' : 'Add Check-in'}
        </button>
      </div>

      {/* Check-in History */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">Check-in History</h2>
        {checkins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-3 text-left">#</th>
                  <th className="border p-3 text-left">Date</th>
                  <th className="border p-3 text-left">Number of Students</th>
                  <th className="border p-3 text-left">Status</th>
                  <th className="border p-3 text-left">Manage</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((checkin, index) => (
                  <tr key={checkin.id} className="hover:bg-blue-50">
                    <td className="border p-3">{index + 1}</td>
                    <td className="border p-3">{checkin.date}</td>
                    <td className="border p-3">{checkin.studentsCount}</td>
                    <td className="border p-3">{checkin.status}</td>
                    <td className="border p-3">
                      <button
                        onClick={() => navigate(`/manage-checkin/${checkin.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-700">No check-in history available.</p>
        )}
      </div>
    </div>
  )
}

export default Manageroom
