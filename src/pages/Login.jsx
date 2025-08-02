import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { FiCoffee, FiUser, FiLock } from 'react-icons/fi';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { serializeUserData } from '../utils/firebaseUtils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Giriş yapmışsa yönlendir
  const from = location.state?.from?.pathname || '/';
  
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      // Firebase Authentication ile giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firestore'dan kullanıcı bilgilerini al
      let userDoc;
      
      // Önce UID ile arama yap
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      userDoc = await getDoc(userDocRef);
      
      // Eğer UID ile bulunamazsa, email ile arama yap
      if (!userDoc.exists()) {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          userDoc = usersSnapshot.docs[0];
        }
      }
      
      if (!userDoc || !userDoc.exists()) {
        throw new Error('Kullanıcı bilgileri bulunamadı');
      }

      const userData = userDoc.data();

      // Firebase verilerini serileştir
      const serializedUserData = serializeUserData(userData);

      // LocalStorage'a kullanıcı bilgilerini kaydet
      const userInfo = {
        id: userDoc.id, // Firestore document ID'sini kullan
        uid: firebaseUser.uid, // Firebase Auth UID'sini de sakla
        email: firebaseUser.email,
        name: userData.name,
        role: userData.role,
        ...serializedUserData
      };
      
      localStorage.setItem('user', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      
      navigate(from, { replace: true });
      
          } catch (error) {
        // Firebase hata mesajlarını Türkçe'ye çevir
        let errorMessage = 'Giriş sırasında bir hata oluştu';
        
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Hatalı şifre';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Geçersiz e-posta adresi';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Bu hesap devre dışı bırakılmış';
            break;
          default:
            errorMessage = error.message || 'Giriş sırasında bir hata oluştu';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
      <div className="bg-base-100 shadow-xl rounded-lg p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary w-16 h-16 rounded-full flex items-center justify-center text-primary-content">
            <FiCoffee size={30} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">Kahve Dükkanı Admin Girişi</h1>
        
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-control mb-4">
            <label className="label ml-10 mb-2">
              <span className="label-text">E-posta</span>
            </label>
            <div className="input-group flex">
              <span className="px-3 flex items-center">
                <FiUser />
              </span>
              <input 
                type="email" 
                className="input input-bordered w-full" 
                placeholder="E-posta adresinizi girin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="form-control mb-6">
            <label className="label ml-10 mb-2">
              <span className="label-text">Şifre</span>
            </label>
            <div className="input-group flex">
              <span className="px-3 flex items-center">
                <FiLock />
              </span>
              <input 
                type="password" 
                className="input input-bordered w-full" 
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 