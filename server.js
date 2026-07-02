const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
} catch (e) {
  console.error('Firebase service account load failed:', e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'M41NUL Push', time: Date.now() });
});

app.post('/register-app', async (req, res) => {
  try {
    const { appId, password } = req.body;

    if (!appId || !password) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'password_too_short' });
    }

    const appRef = db.collection('apps').doc(appId);
    const appDoc = await appRef.get();

    if (appDoc.exists) {
      const existing = appDoc.data();
      if (existing.password !== password) {
        return res.status(409).json({ success: false, error: 'app_already_registered' });
      }
      return res.json({ success: true, message: 'already_registered_same_password' });
    }

    await appRef.set({
      appId,
      password,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (e) {
    console.error('register-app error:', e);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.post('/register-token', async (req, res) => {
  try {
    const { appId, token, userAgent } = req.body;

    if (!appId || !token) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }

    const appDoc = await db.collection('apps').doc(appId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ success: false, error: 'app_not_registered' });
    }

    const tokenId = Buffer.from(token).toString('base64').substring(0, 200);
    await db
      .collection('apps')
      .doc(appId)
      .collection('tokens')
      .doc(tokenId)
      .set(
        {
          token,
          userAgent: userAgent || 'Android Device',
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.json({ success: true });
  } catch (e) {
    console.error('register-token error:', e);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.get('/tokens', async (req, res) => {
  try {
    const { appId, password } = req.query;

    if (!appId || !password) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }

    const appDoc = await db.collection('apps').doc(appId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ success: false, error: 'app_not_found' });
    }
    if (appDoc.data().password !== password) {
      return res.status(401).json({ success: false, error: 'invalid_password' });
    }

    const tokensSnap = await db
      .collection('apps')
      .doc(appId)
      .collection('tokens')
      .orderBy('registeredAt', 'desc')
      .get();

    const tokens = tokensSnap.docs.map((d) => {
      const data = d.data();
      return {
        token: data.token,
        userAgent: data.userAgent || 'Android Device',
        registeredAt: data.registeredAt ? data.registeredAt.toMillis() : Date.now(),
      };
    });

    return res.json({ success: true, count: tokens.length, tokens });
  } catch (e) {
    console.error('tokens error:', e);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.post('/send-notification', async (req, res) => {
  try {
    const { appId, password, token, title, body, imageUrl } = req.body;

    if (!appId || !password || !token || !title || !body) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }

    const appDoc = await db.collection('apps').doc(appId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ success: false, error: 'app_not_found' });
    }
    if (appDoc.data().password !== password) {
      return res.status(401).json({ success: false, error: 'invalid_password' });
    }

    const message = {
      token,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      android: {
        priority: 'high',
        notification: {
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
    };

    await admin.messaging().send(message);
    return res.json({ success: true });
  } catch (e) {
    console.error('send-notification error:', e);
    const code = e.errorInfo?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
      return res.status(400).json({ success: false, error: 'invalid_or_expired_token' });
    }
    return res.status(500).json({ success: false, error: e.message || 'server_error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`M41NUL Push server running on port ${PORT}`);
});
