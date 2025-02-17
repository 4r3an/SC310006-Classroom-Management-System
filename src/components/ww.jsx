import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app, db } from '../firebase_config';
import { collection, getDocs } from 'firebase/firestore';

function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [classrooms, setClassrooms] = useState([]); // 🔹 State สำหรับเก็บข้อมูลห้องเรียน

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // 🔹 ดึงข้อมูลห้องเรียนจาก Firestore
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const classroomsCollection = collection(db, 'classroom'); // ดึงจาก collection "classroom"
        const classroomSnapshot = await getDocs(classroomsCollection);
        const classroomList = classroomSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClassrooms(classroomList);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      }
    };

    fetchClassrooms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
          >
            Sign Out
          </button>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          <p className="text-gray-600">
            Welcome, {auth.currentUser?.email || 'User'}
          </p>
        </div>

        {/* 🔹 ปุ่มไปหน้าสร้าง Classroom */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/create-classroom')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Create Classroom
          </button>
        </div>

        {/* 🔹 แสดงข้อมูลห้องเรียนที่สร้าง */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Classrooms</h2>
          {classrooms.length === 0 ? (
            <p className="text-gray-600">No classrooms available.</p>
          ) : (
            <div className="space-y-4">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="p-4 border rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold">{classroom.info.name}</h3>
                  <p className="text-gray-600">Code: {classroom.info.code}</p>
                  <p className="text-gray-600">Room: {classroom.info.room}</p>
                  {classroom.info.photo && (
                    <img src={classroom.info.photo} alt="Classroom" className="mt-2 w-full h-40 object-cover rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
