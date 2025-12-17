const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.resetQueue = onRequest(
  { region: "asia-southeast2" }, 
  (req, res) => {
    cors(req, res, async () => {
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      try {
        const counterRef = db.collection("counters").doc("daily");
        await counterRef.set({
          currentNumber: 0,
          lastNumber: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const snap = await db.collection("tickets").get();
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        return res.status(200).json({
          success: true,
          message: "Queue has been reset",
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          error: err.message,
        });
      }
    });
  }
);
