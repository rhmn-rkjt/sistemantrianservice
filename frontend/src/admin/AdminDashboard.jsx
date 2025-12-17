import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

// ================= API URLS (Cloud Functions v2) =================
const CALL_NEXT_URL = "https://callnext-hmyqiefrhq-et.a.run.app";
const SKIP_URL = "https://skipticket-hmyqiefrhq-et.a.run.app";
const RESET_URL = "https://asia-southeast2-sistemantrian.cloudfunctions.net/resetQueue";

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ================= REALTIME TICKETS (SINGLE SOURCE OF TRUTH) =================
  useEffect(() => {
    const q = query(
      collection(db, "tickets"),
      orderBy("number", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTickets(data);
    });

    return () => unsub();
  }, []);

  // ================= ACTION HELPER =================
  const postAction = async (url) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Aksi gagal dijalankan");
    } finally {
      setLoading(false);
    }
  };

  // ================= ACTIONS =================
  const handleCallNext = () => postAction(CALL_NEXT_URL);
  const handleSkip = () => postAction(SKIP_URL);

  const handleReset = async () => {
    if (!confirm("Reset antrian harian?")) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(RESET_URL, { method: "POST" });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Gagal reset antrian");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= STATISTIK (SINKRON CUSTOMER) =================
  const waiting = tickets.filter((t) => t.status === "waiting").length;
  const done = tickets.filter((t) => t.status === "done").length;
  const missed = tickets.filter((t) => t.status === "missed").length;

  const callingTicket = tickets.find((t) => t.status === "called");
  const callingNumber = callingTicket ? callingTicket.number : "-";

  // ================= UI =================
  return (
    <div className="admin-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h3>Admin Panel</h3>
        <button className="menu active">Dashboard</button>
        <button className="logout" onClick={handleLogout}>Logout</button>
      </aside>

      {/* MAIN */}
      <main className="dashboard">
        <h2>Admin Dashboard</h2>
        <p className="date">{new Date().toLocaleDateString()}</p>

        <div className="content">
          {/* KIRI — NOMOR DIPANGGIL */}
          <div className="queue-card">
            <div className="queue-number">{callingNumber}</div>

            <hr />
            <h3>Sedang Dipanggil</h3>

            <button
              className="btn primary"
              onClick={handleCallNext}
              disabled={loading}
            >
              Call Next → Done
            </button>

            <button
              className="btn danger"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip → Missed
            </button>

            <button
              className="btn danger outline"
              onClick={handleReset}
              disabled={loading}
            >
              Reset Antrian
            </button>

            {error && <p className="error">{error}</p>}
          </div>

          {/* KANAN — STATISTIK */}
          <div className="stats-grid">
            <StatBox title="Waiting" value={waiting} />
            <StatBox title="Calling" value={callingNumber} />
            <StatBox title="Missed" value={missed} />
            <StatBox title="Done" value={done} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ================= COMPONENT STAT =================
function StatBox({ title, value }) {
  return (
    <div className={`stat-card ${title.toLowerCase()}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  );
}


