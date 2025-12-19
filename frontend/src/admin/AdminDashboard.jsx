import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

//API URLS 
const CALL_NEXT_URL = "https://callnext-hmyqiefrhq-et.a.run.app";
const SKIP_URL = "https://skipticket-hmyqiefrhq-et.a.run.app";
const RESET_URL = "https://asia-southeast2-sistemantrian.cloudfunctions.net/resetQueue";

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Fungsi tambah toast
  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  //REALTIME TICKETS 
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

  //ACTION HELPER (untuk Call Next & Skip)
  const postAction = async (url, successMsg = "Berhasil!") => {
    try {
      setLoading(true);
      const res = await fetch(url, { method: "POST" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gagal melakukan aksi");
      }

      addToast(successMsg, "success");
    } catch (err) {
      console.error(err);
      addToast(err.message || "Aksi gagal dijalankan", "error");
    } finally {
      setLoading(false);
    }
  };

  //ACTIONS
  const handleCallNext = () => postAction(CALL_NEXT_URL, "Nomor berikutnya dipanggil!");
  const handleSkip = () => postAction(SKIP_URL, "Nomor saat ini dilewati.");

  // Reset
  const handleReset = async () => {
    if (!confirm("Yakin reset antrian harian? Semua data hari ini akan hilang.")) {
      return;
    }

    setLoading(true);

    await fetch(RESET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    addToast("Antrian direset!", "success");
    setLoading(false);
  };

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addToast("Logout berhasil", "info");
      navigate("/login");
    } catch (err) {
      console.error(err);
      addToast("Gagal logout", "error");
    }
  };

  //STATISTIK
  const waiting = tickets.filter((t) => t.status === "waiting").length;
  const done = tickets.filter((t) => t.status === "done").length;
  const missed = tickets.filter((t) => t.status === "missed").length;

  const callingTicket = tickets.find((t) => t.status === "called");
  const callingNumber = callingTicket ? callingTicket.number : "-";

  return (
    <>
      {/* Toast Notifications */}
      <div className="notification-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <div className="admin-dashboard">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <h3>Admin Panel</h3>
          <button className="logout" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        {/* MAIN */}
        <main className="dashboard">
          <h2>Admin Dashboard</h2>
          <p className="date">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

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
                {loading ? "Memproses..." : "Panggil Berikutnya"}
              </button>

              <button
                className="btn danger"
                onClick={handleSkip}
                disabled={loading}
              >
                Lewati
              </button>

              <button
                className="btn danger outline"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? "Sedang mereset..." : "Reset Antrian Harian"}
              </button>
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
    </>
  );
}

//COMPONENT STAT
function StatBox({ title, value }) {
  return (
    <div className={`stat-card ${title.toLowerCase()}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  );
}