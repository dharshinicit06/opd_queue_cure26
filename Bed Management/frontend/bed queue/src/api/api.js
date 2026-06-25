import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

let authStore = null;

export function setAuthStore(store) {
  authStore = store;
}

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (authStore) {
        authStore.clearAuth();
        authStore.setSessionExpired(true);
        authStore.navigate('/login', { replace: true, state: { message: 'Session expired. Please login again.' } });
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("username");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const doctorAPI = {
  getMyAppointments: () => API.get("/appointments/all"),
  getMyQueue: () => API.get("/waiting-room/overview"),
  getCurrentServing: () => API.get("/waiting-room/current"),
  completeAppointment: (appointmentId) => API.put(`/appointments/complete/${appointmentId}`),
  completeQueueToken: (queueId) => API.put(`/receptionist/complete/${queueId}`),
};

export const consultationNotesAPI = {
  createNote: (data) => API.post("/consultation-notes/notes", data),
  getMyNotes: () => API.get("/consultation-notes/notes/my-notes"),
  getNotesForPatient: (patientId) => API.get(`/consultation-notes/notes/patient/${patientId}`),
  getNotesForAppointment: (appointmentId) => API.get(`/consultation-notes/notes/appointment/${appointmentId}`),
  updateNote: (noteId, data) => API.put(`/consultation-notes/notes/${noteId}`, data),
  deleteNote: (noteId) => API.delete(`/consultation-notes/notes/${noteId}`),
};

export default API;
