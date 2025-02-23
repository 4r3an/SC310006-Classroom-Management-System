import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app, db } from '../firebase_config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { FaEdit } from "react-icons/fa";

function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState('');
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Fetch user profile
  useEffect(() => {
    if (!currentUser) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // Fetch classrooms owned by the user
  useEffect(() => {
    if (!currentUser) return;

    const fetchClassrooms = async () => {
      try {
        const q = query(collection(db, 'classroom'), where('owner', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const classroomsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClassrooms(classroomsList);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      }
    };

    fetchClassrooms();
  }, [currentUser]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const courseSnapshot = await getDocs(collection(db, 'courses'));
        const courseList = courseSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCourses(courseList);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse) return;

    try {
      const docRef = await addDoc(collection(db, 'courses'), { name: newCourse });
      setCourses([...courses, { id: docRef.id, name: newCourse }]);
      setNewCourse('');
      setShowAddCourseForm(false);
    } catch (error) {
      console.error('Error adding course:', error);
    }
  };

  const handleEditCourse = (courseId, updatedName) => {
    setEditCourse({ id: courseId, name: updatedName });
  };

  const handleSaveEdit = async () => {
    if (!editCourse) return;

    try {
      await updateDoc(doc(db, 'courses', editCourse.id), { name: editCourse.name });
      setCourses(courses.map((course) => (course.id === editCourse.id ? { ...course, name: editCourse.name } : course)));
      setEditCourse(null);
    } catch (error) {
      console.error('Error editing course:', error);
    }
  };

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white p-6 flex flex-col h-screen">
        {/* Logo / Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center">Classroom Management</h1>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-4">
          <button 
            onClick={() => navigate('/create-classroom')} 
            className="block w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            ➕ Create Classroom
          </button>
        </nav>

        {/* Profile Section */}
        <div 
          className="flex items-center p-4 border-t border-blue-700 cursor-pointer hover:bg-blue-700 transition rounded-lg"
          onClick={() => navigate('/edit-profile')}
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-12 h-12 rounded-full mr-4" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mr-4">
              <span className="text-lg text-white">N/A</span>
            </div>
          )}
          <div>
            <p className="font-bold">{profile?.displayName || currentUser?.email || 'User'}</p>
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 bg-blue-50 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>
          <button onClick={() => setShowSignOutModal(true)} className="bg-red-600 text-white px-4 py-2 rounded">
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classrooms.map((classroom) => (
            <div 
              key={classroom.id}  
              className="border p-6 rounded-lg shadow-lg bg-white hover:scale-105 transition"
            >
              {classroom.info.photo ? (
                <img src={classroom.info.photo} alt={classroom.info.name} className="w-full h-40 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-40 bg-gray-300 flex items-center justify-center rounded-lg mb-4">
                  <span className="text-gray-600">No Image</span>
                </div>
              )}

              <p className="font-semibold text-lg text-blue-900">{classroom.info.name}</p>
              <p className="text-gray-700">Code: {classroom.info.code}</p>
              <p className="text-gray-700">Room: {classroom.info.room}</p>

              {/* ปุ่มแก้ไข */}
              <button 
                onClick={() => navigate(`/edit-classroom/${classroom.id}`)}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-md hover:bg-blue-600 transition"
              >
                <FaEdit className="text-lg" />
                <span className="text-sm font-medium">แก้ไข</span>
              </button>

              {/* ปุ่มจัดการห้องเรียน */}
              <button 
                onClick={() => navigate(`/manageroom/${classroom.id}`)}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-md hover:bg-blue-600 transition"
              >
                <FaEdit className="text-lg" />
                <span className="text-sm font-medium">จัดการห้องเรียน</span>
              </button>
              
            </div>
          ))}
        </div>



      </main>
      
    </div>
    
  );
}

export default Dashboard;
