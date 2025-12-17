const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.generateTicket = onRequest(
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

      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);

        let lastNumber = 0;

        // Init Counter
        if (!snap.exists) {
          tx.set(counterRef, {
            currentNumber: 0,
            lastNumber: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          lastNumber = snap.data().lastNumber || 0;
        }

        // Generate nomor baru
        lastNumber += 1;

        tx.update(counterRef, {
          lastNumber,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Buat tiket
        const ticketRef = db.collection("tickets").doc();
        tx.set(ticketRef, {
          number: lastNumber,
          status: "waiting",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { ticketId: ticketRef.id };
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error("generateTicket error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);
