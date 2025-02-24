import React, { useState } from 'react';

const StudentCheckIn = () => {
    const [studentName, setStudentName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [checkInTime, setCheckInTime] = useState(new Date().toLocaleString());
    const [checkedInStudents, setCheckedInStudents] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const newStudent = { studentName, studentId, checkInTime };
        setCheckedInStudents([...checkedInStudents, newStudent]);
        // Reset form fields
        setStudentName('');
        setStudentId('');
        setCheckInTime(new Date().toLocaleString());
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Student Check-In</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Name:</label>
                    <input
                        type="text"
                        id="studentName"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">Student ID:</label>
                    <input
                        type="text"
                        id="studentId"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Check In</button>
            </form>
            <div className="mt-6">
                <h3 className="text-xl font-bold mb-2">Checked-In Students</h3>
                <ul className="space-y-2">
                    {checkedInStudents.map((student, index) => (
                        <li key={index} className="p-4 border border-gray-200 rounded-lg">
                            <p><strong>Name:</strong> {student.studentName}</p>
                            <p><strong>Student ID:</strong> {student.studentId}</p>
                            <p><strong>Check-In Time:</strong> {student.checkInTime}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default StudentCheckIn;