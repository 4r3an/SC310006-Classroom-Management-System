import React, { useEffect, useState } from "react";
import { getAuth, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase_config";

function EditProfile() {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch user profile from Firestore
  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setDisplayName(userData.displayName || "");
            setEmail(userData.email || "");
            setPhotoURL(userData.photoURL || "");
          } else {
            console.log("No profile found, using auth data.");
            setDisplayName(user.displayName || "");
            setEmail(user.email || "");
            setPhotoURL(user.photoURL || "");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      };

      fetchUserProfile();
    }
  }, [user]);

  // Handle form submission
  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Update Firebase Authentication
      await updateProfile(user, {
        displayName,
        photoURL,
      });

      // Update Firestore database
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
      }, { merge: true }); // Merge to avoid deleting existing data

      alert("Profile updated successfully!");
      navigate("/dashboard"); // Redirect to dashboard
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Edit Profile</h2>
        
        <label className="block text-gray-700">Name:</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="border border-gray-300 p-2 w-full rounded mb-4"
        />

        <label className="block text-gray-700">Email (Read-Only):</label>
        <input
          type="email"
          value={email}
          disabled
          className="border border-gray-300 p-2 w-full rounded mb-4 bg-gray-100"
        />

        <label className="block text-gray-700">Profile Picture URL:</label>
        <input
          type="text"
          value={photoURL}
          onChange={(e) => setPhotoURL(e.target.value)}
          className="border border-gray-300 p-2 w-full rounded mb-4"
        />

        {photoURL && (
          <img src={photoURL} alt="Profile" className="w-24 h-24 rounded-full mx-auto mb-4" />
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className={`w-full py-2 rounded-lg text-white ${loading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"} transition duration-300`}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-3 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition duration-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditProfile;
