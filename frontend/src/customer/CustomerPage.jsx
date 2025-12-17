import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import "./customer.css";

// 🔥 Cloud Function v2 (HTTP)
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
  const [error, setError] = useState(null);

  // AMBIL NOMOR ANTRIAN 
  const handleTakeTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(GENERATE_TICKET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "HTTP error");
      }

      const data = await res.json();

      if (!data.ticketId) {
        throw new Error("ticketId tidak ditemukan");
      }

      // SELALU SIMPAN ticket TERAKHIR
      localStorage.setItem("ticketId", data.ticketId);
      setTicketId(data.ticketId);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil nomor antrian");
    } finally {
      setLoading(false);
    }
  };

  // REALTIME TIKET TERAKHIR CUSTOMER
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
          setMyTicket(snap.data());
        } else {
          setMyTicket(null);
        }
      },
      () => {
        setError("Gagal membaca tiket");
      }
    );

    return () => unsub();
  }, [ticketId]);

  // REALTIME STATISTIK GLOBAL
  useEffect(() => {
    const unsubWaiting = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "waiting")),
      (snap) =>
        setStats((s) => ({ ...s, waiting: snap.size }))
    );

    const unsubDone = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "done")),
      (snap) =>
        setStats((s) => ({ ...s, done: snap.size }))
    );

    const unsubMissed = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "missed")),
      (snap) =>
        setStats((s) => ({ ...s, missed: snap.size }))
    );

    const unsubCalling = onSnapshot(
      query(collection(db, "tickets"), where("status", "==", "called")),
      (snap) => {
        const callingNumber =
          snap.docs[0]?.data()?.number ?? "-";
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

        {error && <p className="error">{error}</p>}
      </div>

      {/* KANAN — STATISTIK */}
      <div className="stats-grid">
        <StatBox title="Waiting" value={stats.waiting} />
        <StatBox title="Calling" value={stats.calling} />
        <StatBox title="Missed" value={stats.missed} />
        <StatBox title="Done" value={stats.done} />
      </div>
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
