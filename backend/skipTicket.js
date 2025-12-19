const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

exports.skipTicket = onRequest(
  { region: "asia-southeast2", cors: true },
  async (req, res) => {
    try {
      const counterRef = db.collection("counters").doc("daily");

      await db.runTransaction(async (tx) => {
        const counterSnap = await tx.get(counterRef);
        if (!counterSnap.exists) {
          throw new Error("Counter not found");
        }

        const currentNumber = counterSnap.data().currentNumber;

        if (!currentNumber || currentNumber === 0) {
          throw new Error("Tidak ada nomor yang sedang dipanggil");
        }

        const callingQuery = db
          .collection("tickets")
          .where("number", "==", currentNumber)
          .where("status", "==", "called")
          .limit(1);

        const nextQuery = db
          .collection("tickets")
          .where("number", "==", currentNumber + 1)
          .limit(1);

        const [callingSnap, nextSnap] = await Promise.all([
          tx.get(callingQuery),
          tx.get(nextQuery),
        ]);

        if (callingSnap.empty) {
          throw new Error("Tidak ada nomor yang sedang dipanggil");
        }

        
        tx.update(callingSnap.docs[0].ref, {
          status: "missed",
        });

        if (!nextSnap.empty) {
          tx.update(nextSnap.docs[0].ref, {
            status: "called",
          });
        }

        tx.update(counterRef, {
          currentNumber: currentNumber + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  }
);
