import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../../firebase_config';

function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();
  const db = getFirestore(app);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // เก็บข้อมูลผู้ใช้ใน Firestore
      const userRef = doc(db, 'users', user.uid);  // สร้าง reference สำหรับผู้ใช้ใน Firestore
      await setDoc(userRef, {
        displayName: user.displayName || '',  // เก็บชื่อผู้ใช้
        email: user.email,  // เก็บอีเมล
        photoURL: user.photoURL || '',  // เก็บรูปโปรไฟล์
      }, { merge: true });  // ใช้ merge: true เพื่ออัปเดตข้อมูลโดยไม่ลบข้อมูลเดิม

      console.log('User:', user);
      navigate('/dashboard');  // ไปยังหน้า Dashboard หลังจากลงชื่อเข้าใช้สำเร็จ
    } catch (error) {
      setError('Failed to sign in with Google: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Login</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition duration-300"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;