import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase_config';
import { v4 as uuidv4 } from 'uuid';

const CreateClassroom = () => {
  const [classroomCode, setClassroomCode] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [room, setRoom] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cid = uuidv4(); // สร้างรหัสสุ่มสำหรับห้องเรียน
      const classroomRef = doc(db, 'classroom', cid);
      await setDoc(classroomRef, {
        cid: cid,
        owner: auth.currentUser?.uid,
        info: {
          code: classroomCode,
          name: classroomName,
          room: room,
          photo: photoURL || '',
        },
      });
      alert('Classroom created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating classroom:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Create Classroom</h2>
        <form onSubmit={handleCreateClassroom} className="space-y-5">
          <input type="text" placeholder="Classroom Code" value={classroomCode} onChange={(e) => setClassroomCode(e.target.value)} className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input type="text" placeholder="Classroom Name" value={classroomName} onChange={(e) => setClassroomName(e.target.value)} className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input type="text" placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          <input type="url" placeholder="Photo URL (Optional)" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition font-semibold" disabled={loading}>
            {loading ? 'Creating...' : 'Create Classroom'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateClassroom;