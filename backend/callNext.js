const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.callNext = onRequest(
  {
    region: "asia-southeast2",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const counterRef = db.collection("counters").doc("daily");
      const ticketsCol = db.collection("tickets");

      const result = await db.runTransaction(async (tx) => {
        // ================= READ PHASE =================
        const counterSnap = await tx.get(counterRef);

        let currentNumber = 0;
        if (counterSnap.exists) {
          currentNumber = counterSnap.data().currentNumber || 0;
        }

        // tiket sedang dipanggil
        const callingSnap = await tx.get(
          ticketsCol.where("status", "==", "called").limit(1)
        );

        // tiket waiting TERKECIL
        const waitingSnap = await tx.get(
          ticketsCol
            .where("status", "==", "waiting")
            .orderBy("number", "asc")
            .limit(1)
        );

        // ❌ TIDAK ADA ANTRIAN
        if (waitingSnap.empty && callingSnap.empty) {
          throw new Error("Tidak ada antrian menunggu");
        }

        // ================= WRITE PHASE =================

        // DONE tiket yang sedang dipanggil
        if (!callingSnap.empty) {
          tx.update(callingSnap.docs[0].ref, {
            status: "done",
          });
        }

        // CALL tiket waiting berikutnya
        if (!waitingSnap.empty) {
          const nextTicket = waitingSnap.docs[0];
          tx.update(nextTicket.ref, {
            status: "called",
          });

          tx.set(
            counterRef,
            {
              currentNumber: nextTicket.data().number,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return { currentNumber: nextTicket.data().number };
        }

        // Kalau tidak ada waiting tapi masih ada calling
        tx.set(
          counterRef,
          {
            currentNumber: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return { currentNumber: 0 };
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error("callNext error:", err);
      return res.status(400).json({ error: err.message });
    }
  }
);
