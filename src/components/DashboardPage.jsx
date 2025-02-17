import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app, db } from '../firebase_config';  // Without .js extension
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'; // Import Firestore functions

function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [courses, setCourses] = useState([]); // State to hold courses
  const [newCourse, setNewCourse] = useState(''); // For adding a new course
  const [showAddCourseForm, setShowAddCourseForm] = useState(false); // To toggle the add course form
  const [editCourse, setEditCourse] = useState(null); // State for course being edited

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Fetch courses from Firestore when the component mounts
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesCollection = collection(db, 'courses'); // Specify the 'courses' collection
        const courseSnapshot = await getDocs(coursesCollection); // Fetch documents
        const courseList = courseSnapshot.docs.map(doc => ({
          id: doc.id, // Add the document ID to each course
          ...doc.data(),
        })); 
        setCourses(courseList); // Set courses state
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, []); // Empty dependency array to run once when component mounts

  // Handle course addition
  const handleAddCourse = async () => {
    if (newCourse) {
      try {
        const docRef = await addDoc(collection(db, 'courses'), {
          name: newCourse, // Add the course name to Firestore
        });
        setCourses([...courses, { id: docRef.id, name: newCourse }]); // Update courses state with the new course
        setNewCourse(''); // Clear the input
        setShowAddCourseForm(false); // Close the form
      } catch (error) {
        console.error('Error adding course:', error);
      }
    }
  };

  // Handle editing a course
  const handleEditCourse = (courseId, updatedName) => {
    setEditCourse({ id: courseId, name: updatedName }); // Set the course to be edited
  };

  // Save the edited course
  const handleSaveEdit = async () => {
    if (editCourse) {
      try {
        const courseRef = doc(db, 'courses', editCourse.id); // Get reference to the course document
        await updateDoc(courseRef, {
          name: editCourse.name, // Update the course name in Firestore
        });
        setCourses(courses.map(course =>
          course.id === editCourse.id ? { ...course, name: editCourse.name } : course
        )); // Update the courses state
        setEditCourse(null); // Clear the edit state
      } catch (error) {
        console.error('Error editing course:', error);
      }
    }
  };

  // Navigate to the edit profile page
  const handleEditProfile = () => {
    navigate('/edit-profile');
  };

  // Navigate to the manage classrooms page
  const handleManageClassrooms = () => {
    navigate('/manage-classrooms');
  };

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

        {/* Buttons to add course, edit profile, and manage classrooms */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddCourseForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 mr-4"
          >
            Add Course
          </button>
          <button
            onClick={handleEditProfile}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 mr-4"
          >
            Edit Profile
          </button>
          <button onClick={() => navigate('/create-classroom')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
Create Classroom
</button>

        </div>

        {/* Form to add a new course */}
        {showAddCourseForm && (
          <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add New Course</h2>
            <input
              type="text"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              placeholder="Enter course name"
              className="border-2 border-gray-300 p-2 rounded-lg w-full mb-4"
            />
            <button
              onClick={handleAddCourse}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Add Course
            </button>
            <button
              onClick={() => setShowAddCourseForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition duration-300 ml-4"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Display the list of courses */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Courses</h2>
          <ul className="list-disc pl-6">
            {courses.length === 0 ? (
              <p className="text-gray-600">No courses available.</p>
            ) : (
              courses.map((course, index) => (
                <li key={course.id} className="text-gray-600">
                  {editCourse?.id === course.id ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={editCourse.name}
                        onChange={(e) => setEditCourse({ ...editCourse, name: e.target.value })}
                        className="border-2 border-gray-300 p-2 rounded-lg w-full mb-4"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 ml-4"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>{course.name}</span>
                      <button
                        onClick={() => handleEditCourse(course.id, course.name)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 transition duration-300"
                      >
                        Edit
                      </button>
                    </div>

                    

            
                  )}
                  
                </li>
              ))
            )}
          </ul>
        </div>
        
      </div>
    </div>
  );
}

export default Dashboard;


