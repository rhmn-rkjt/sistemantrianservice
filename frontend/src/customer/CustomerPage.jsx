import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

//Cloud Function v2 (HTTP)
const GENERATE_TICKET_URL =
  "https://asia-southeast2-sistemantrian.cloudfunctions.net/generateTicket";

export default function CustomerPage() {
  const [ticketId, setTicketId] = useState(() =>
    localStorage.getItem("ticketId")
  );
  const [myTicket, setMyTicket] = useState(null);

  const [stats, setStats] = useState({
    waiting: 0,
    calling: "-",
    done: 0,
    missed: 0,
  });

  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]); // ← State baru untuk toast

  // Fungsi untuk menambah toast
  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Hilang otomatis setelah 4 detik
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // AMBIL NOMOR ANTRIAN
  const handleTakeTicket = async () => {
    try {
      setLoading(true);

      const res = await fetch(GENERATE_TICKET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gagal terhubung ke server");
      }

      const data = await res.json();

      if (!data.ticketId) {
        throw new Error("Respons tidak valid dari server");
      }

      // Simpan ke localStorage & state
      localStorage.setItem("ticketId", data.ticketId);
      setTicketId(data.ticketId);

      addToast(`berhasil diambil!`);
    } catch (err) {
      console.error(err);
      addToast(err.message || "Gagal mengambil nomor antrian", "error");
    } finally {
      setLoading(false);
    }
  };

  // REALTIME TIKET CUSTOMER
  useEffect(() => {
    if (!ticketId) {
      setMyTicket(null);
      return;
    }

    const ref = doc(db, "tickets", ticketId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const ticketData = snap.data();
          setMyTicket(ticketData);

          // Notifikasi jika status berubah (misal dipanggil)
          if (ticketData.status === "called") {
            addToast(`Nomor Anda (${ticketData.number}) sedang DIPANGGIL!`, "info");
          } else if (ticketData.status === "missed") {
            addToast(`Nomor Anda (${ticketData.number}) terlewat. Silakan ambil nomor baru.`, "error");
          }
        } else {
          setMyTicket(null);
        }
      },
      (err) => {
        console.error(err);
        addToast("Gagal membaca status tiket", "error");
      }
    );

    return () => unsub();
  }, [ticketId]);

  // REALTIME STATISTIK GLOBAL
  useEffect(() => {
    const unsubWaiting = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "waiting")),
      (snap) => setStats((s) => ({ ...s, waiting: snap.size }))
    );

    const unsubDone = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "done")),
      (snap) => setStats((s) => ({ ...s, done: snap.size }))
    );

    const unsubMissed = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "missed")),
      (snap) => setStats((s) => ({ ...s, missed: snap.size }))
    );

    const unsubCalling = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "called")),
      (snap) => {
        const callingNumber = snap.docs[0]?.data()?.number ?? "-";
        setStats((s) => ({ ...s, calling: callingNumber }));
      }
    );

    return () => {
      unsubWaiting();
      unsubDone();
      unsubMissed();
      unsubCalling();
    };
  }, []);

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

      <div className="customer-layout">
        {/* KIRI — NOMOR CUSTOMER */}
        <div className="queue-card">
          <h2>Nomor Antrian Anda</h2>

          <div className="queue-number">
            {myTicket ? myTicket.number : "--"}
          </div>

          <hr />

          <button
            className="btn primary"
            onClick={handleTakeTicket}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Ambil Nomor Antrian"}
          </button>

          {myTicket && (
            <p className="my-status">
              Status: <strong>{myTicket.status}</strong>
            </p>
          )}
        </div>

        {/* KANAN — STATISTIK */}
        <div className="stats-grid">
          <StatBox title="Waiting" value={stats.waiting} />
          <StatBox title="Calling" value={stats.calling} />
          <StatBox title="Missed" value={stats.missed} />
          <StatBox title="Done" value={stats.done} />
        </div>
      </div>
    </>
  );
}

// COMPONENT STAT 
function StatBox({ title, value }) {
  return (
    <div className={`stat-card ${title.toLowerCase()}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  );
}