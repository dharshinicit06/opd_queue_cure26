import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/api';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [selectedPatientNotes, setSelectedPatientNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);

  const doctorId = user?.doctorId || user?.id || user?.userId;

  const fetchPatientNotes = async (patientId) => {
    setNotesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await API.get(`/consultation-notes/notes/patient/${patientId}`, { headers });
      setSelectedPatientNotes({
        patientId,
        notes: res.data?.notes || []
      });
    } catch (error) {
      console.error('Error fetching consultation notes:', error);
      setSelectedPatientNotes({ patientId, notes: [] });
    } finally {
      setNotesLoading(false);
    }
  };

  const closeNotesModal = () => {
    setSelectedPatientNotes(null);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!doctorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const today = new Date().toISOString().split('T')[0];

        const [appointmentsRes, waitingRoomRes, currentServingRes] = await Promise.all([
          API.get('/appointments/all', { headers }),
          API.get('/waiting-room/overview', { headers }),
          API.get('/waiting-room/current', { headers }),
        ]);

        const allAppointments = appointmentsRes.data?.appointments || [];
        const overview = waitingRoomRes.data?.overview || {};
        const currentServing = currentServingRes.data?.current || null;

        const myAppointments = allAppointments.filter(
          (apt) => String(apt.doctorId) === String(doctorId)
        );

        const todayAppointments = myAppointments.filter(
          (apt) => apt.appointmentDate === today
        );

        setTodayAppointments(todayAppointments);

        const completedAppointments = myAppointments.filter(
          (apt) => apt.status === 'Completed' || apt.status === 'completed'
        );

        const thisWeekCompleted = completedAppointments.filter((apt) => {
          if (!apt.updatedAt && !apt.completedAt) return false;
          const date = new Date(apt.updatedAt || apt.completedAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date >= weekAgo;
        });

        const waitingForDoctor = overview.waitingCount || 0;
        const servingForDoctor = overview.servingCount || 0;

        setCards([
          {
            title: 'Current Queue',
            value: String(waitingForDoctor + servingForDoctor),
            subtitle: 'Patients waiting',
            color: '#3b82f6',
          },
          {
            title: 'Assigned Patients',
            value: String(todayAppointments.length),
            subtitle: 'Today\'s appointments',
            color: '#10b981',
          },
          {
            title: "Today's Appointments",
            value: String(todayAppointments.length),
            subtitle: 'Scheduled for today',
            color: '#f59e0b',
          },
          {
            title: 'Completed Consultations',
            value: String(thisWeekCompleted.length),
            subtitle: 'This week',
            color: '#8b5cf6',
          },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setCards([
          {
            title: 'Current Queue',
            value: '0',
            subtitle: 'Patients waiting',
            color: '#3b82f6',
          },
          {
            title: 'Assigned Patients',
            value: '0',
            subtitle: 'Under your care',
            color: '#10b981',
          },
          {
            title: "Today's Appointments",
            value: '0',
            subtitle: 'Scheduled',
            color: '#f59e0b',
          },
          {
            title: 'Completed Consultations',
            value: '0',
            subtitle: 'This week',
            color: '#8b5cf6',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [doctorId]);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '28px', fontWeight: '600' }}>Doctor Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: '4px solid #e5e7eb',
              }}
            >
              <div style={{ height: '16px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '16px', width: '60%' }} />
              <div style={{ height: '36px', background: '#f3f4f6', borderRadius: '4px', width: '40%' }} />
              <div style={{ height: '14px', background: '#f3f4f6', borderRadius: '4px', marginTop: '8px', width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>Doctor Dashboard</h1>
        <button
          onClick={() => {
            const firstPatient = todayAppointments[0];
            if (firstPatient?.patientId) {
              fetchPatientNotes(firstPatient.patientId);
            }
          }}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          View Notes
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {cards.map((card, index) => (
          <div
            key={index}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${card.color}`
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '500', color: '#6b7280' }}>{card.title}</h3>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#111827' }}>{card.value}</div>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#9ca3af' }}>{card.subtitle}</p>
          </div>
        ))}
      </div>

      {selectedPatientNotes && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>Consultation Notes</h2>
          {notesLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading notes...</div>
          ) : selectedPatientNotes.notes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No consultation notes found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedPatientNotes.notes.map((note, index) => (
                <div
                  key={index}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderLeft: '4px solid #8b5cf6',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Date not available'}
                  </div>
                  <div style={{ fontSize: '16px', color: '#111827', whiteSpace: 'pre-wrap' }}>
                    {note.notes || note.content || 'No notes available'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;