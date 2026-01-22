// Test Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration from .env.local
const firebaseConfig = {
    apiKey: "AIzaSyBnxSpK2bJ8MJlKPfxhanQ6-KE79K8W-V0",
    authDomain: "smartshop-269d7.firebaseapp.com",
    projectId: "smartshop-269d7",
    storageBucket: "smartshop-269d7.firebasestorage.app",
    messagingSenderId: "978308982115",
    appId: "1:978308982115:web:74a3637f9386c7195b9f56"
};

console.log('🔥 Testing Firebase configuration...');

try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    // Initialize Auth
    const auth = getAuth(app);
    console.log('✅ Firebase Auth initialized successfully');
    
    console.log('📋 Firebase config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        appId: firebaseConfig.appId.substring(0, 10) + '...'
    });
    
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}
