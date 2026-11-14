/* ============================================================
   NOVIX — إعدادات الاتصال بـ Firebase (مشروع مجاني)
   املأ القيم من: Firebase Console → Project settings → Your apps → Web app
   اترك apiKey فارغاً لتعطيل التتبع بالكامل.
   هذه القيم ليست سرية (تظهر لأي زائر) — الحماية الفعلية في firestore.rules
   ============================================================ */
window.NX_CONFIG = {
  apiKey: "",            // مثال: "AIzaSy..."
  projectId: "",         // مثال: "novix-admin-12345"
  authDomain: "",        // مثال: "novix-admin-12345.firebaseapp.com"
  appId: "",             // مثال: "1:123456789:web:abcdef"
  heartbeatSec: 60,      // كل كم ثانية يُرسل الموقع نبضة (كلما زاد قلّت الكتابات)
  ownerEmail: ""         // بريدك (يُستخدم للتلميح فقط في صفحة الدخول)
};
