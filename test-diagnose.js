const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const config = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length === 2) {
    config[parts[0].trim()] = parts[1].trim();
  }
});

const firebaseConfig = {
  apiKey: config.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: config.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: config.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: config.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  console.log("Authenticating...");
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, "web-tester@example.com", "password");
  } catch (signUpErr) {
    if (signUpErr.code === "auth/email-already-in-use") {
      userCredential = await signInWithEmailAndPassword(auth, "web-tester@example.com", "password");
    } else {
      throw signUpErr;
    }
  }
  const userId = userCredential.user.uid;
  console.log("Signed in successfully as:", userId);

  const recipeId = "8KtS0ocLMzl86W4l6R4B";
  const authorId = "yKCY5QoAfAhkeN67M3JIqLW1K6k1"; // Chef ID for recipe 8KtS0ocLMzl86W4l6R4B

  const tasks = [
    {
      name: "1. Read recipe document",
      run: () => getDoc(doc(db, "recipes", recipeId))
    },
    {
      name: "2. Read comments subcollection",
      run: () => getDocs(collection(db, "recipes", recipeId, "comments"))
    },
    {
      name: "3. Read user liked comments",
      run: () => getDoc(doc(db, "recipes", recipeId, "comments", "dummyComment", "likes", userId))
    },
    {
      name: "4. Read user rating",
      run: () => getDoc(doc(db, "recipeRatings", `${userId}_${recipeId}`))
    },
    {
      name: "5. Query user saved recipes",
      run: () => getDocs(query(collection(db, "savedRecipes"), where("userId", "==", userId)))
    },
    {
      name: "6. Check follow state",
      run: () => getDoc(doc(db, "following", `${userId}_${authorId}`))
    },
    {
      name: "7. Query user likes",
      run: () => getDocs(query(collection(db, "recipeLikes"), where("userId", "==", userId)))
    }
  ];

  for (const task of tasks) {
    try {
      console.log(`Running task: ${task.name}...`);
      await task.run();
      console.log(`  => SUCCESS`);
    } catch (err) {
      console.log(`  => FAILED: ${err.message}`);
      console.log(`     Code: ${err.code}`);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
