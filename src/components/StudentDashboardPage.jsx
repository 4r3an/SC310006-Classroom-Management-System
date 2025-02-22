import React from 'react';

const StudentDashboardPage = () => {
  return (
    <div className="student-dashboard">
      <header>
        <h1>Welcome to Your Classroom</h1>
      </header>
      
      <main>
        <section className="classroom-overview">
          <h2>Your Classes</h2>
          <p>View and manage your schedule, assignments, and announcements here.</p>
          {/* You can add more classroom-specific functionality as needed */}
        </section>
      </main>
      
      <footer>
        <p>&copy; {new Date().getFullYear()} Classroom Management System</p>
      </footer>
    </div>
  );
};

export default StudentDashboardPage;