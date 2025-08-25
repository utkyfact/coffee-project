import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiClock, FiCalendar, FiDollarSign, FiTrendingUp, FiUser, FiPhone, FiMail, FiMapPin, FiToggleLeft, FiToggleRight, FiKey, FiSave, FiX } from 'react-icons/fi';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  where
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updatePassword, deleteUser } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import DeleteConfirmModal from './DeleteConfirmModal';

// Çalışan Yönetimi bileşeni
const UserManagement = () => {
  // State'ler
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Computed values
  const employees = users; // Firebase'den gelen users verisi
  const onShiftEmployees = employees.filter(emp => emp.onShift);
  
  // UI States
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeView, setActiveView] = useState('list');
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    userId: null,
    userName: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: '',
    position: '',
    salary: 15000,
    startDate: new Date().toISOString().split('T')[0],
    workingHours: 0,
    maxHours: 45,
    performanceScore: 0,
    onShift: false,
    shiftStart: '09:00',
    shiftEnd: '17:00',
    leaveDays: 14,
    usedLeave: 0,
    totalSales: 0,
    customerRating: 0,
    isActive: true
  });

  // Firebase'den kullanıcıları çek
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('name'));
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setError(error.message);
      setIsLoading(false);
    });

    return () => unsubscribeUsers();
  }, []);

  // Firebase'den kullanıcı istatistiklerini hesapla
  useEffect(() => {
    if (users.length > 0) {
      const userStats = {
        totalUsers: users.length,
        activeUsers: users.filter(user => user.isActive).length,
        onShiftUsers: users.filter(user => user.onShift).length,
        totalSalary: users.reduce((sum, user) => sum + (user.salary || 0), 0),
        avgPerformance: users.length > 0 ? 
          (users.reduce((sum, user) => sum + (user.performanceScore || 0), 0) / users.length).toFixed(1) : 0,
        totalSales: users.reduce((sum, user) => sum + (user.totalSales || 0), 0)
      };
      setStats(userStats);
    }
  }, [users]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open modal for new user
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      phone: '',
      position: '',
      salary: 15000,
      startDate: new Date().toISOString().split('T')[0],
      workingHours: 0,
      maxHours: 45,
      performanceScore: 0,
      onShift: false,
      shiftStart: '09:00',
      shiftEnd: '17:00',
      leaveDays: 14,
      usedLeave: 0,
      totalSales: 0,
      customerRating: 0,
      isActive: true
    });
    setShowModal(true);
  };

  // Open modal for editing user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Şifre düzenlemede boş bırakılır
      role: user.role || 'staff',
      phone: user.phone || '',
      position: user.position || '',
      salary: user.salary || 15000,
      startDate: user.startDate || new Date().toISOString().split('T')[0],
      workingHours: user.workingHours || 0,
      maxHours: user.maxHours || 45,
      performanceScore: user.performanceScore || 0,
      onShift: user.onShift || false,
      shiftStart: user.shiftStart || '09:00',
      shiftEnd: user.shiftEnd || '17:00',
      leaveDays: user.leaveDays || 14,
      usedLeave: user.usedLeave || 0,
      totalSales: user.totalSales || 0,
      customerRating: user.customerRating || 0,
      isActive: user.isActive !== false
    });
    setShowModal(true);
  };

  // Save user (create or update)
  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        setIsUpdating(true);
        
        // Update existing user
        const userRef = doc(db, 'users', editingUser.id);
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          position: formData.position,
          salary: parseFloat(formData.salary) || 0,
          startDate: formData.startDate,
          workingHours: parseFloat(formData.workingHours) || 0,
          maxHours: parseFloat(formData.maxHours) || 45,
          performanceScore: parseFloat(formData.performanceScore) || 0,
          onShift: formData.onShift,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          leaveDays: parseInt(formData.leaveDays) || 14,
          usedLeave: parseInt(formData.usedLeave) || 0,
          totalSales: parseFloat(formData.totalSales) || 0,
          customerRating: parseFloat(formData.customerRating) || 0,
          isActive: formData.isActive,
          updatedAt: new Date()
        };
        
        // Şifre sadece değiştirilmişse ekle
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }
        
        await updateDoc(userRef, updateData);
      } else {
        setIsCreating(true);
        
        // Önce Firebase Authentication'da kullanıcı hesabı oluştur
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        const firebaseUser = userCredential.user;
        
        // Sonra Firestore'a kullanıcı bilgilerini kaydet
        await addDoc(collection(db, 'users'), {
          uid: firebaseUser.uid, // Firebase Auth UID'sini sakla
          name: formData.name,
          email: formData.email,
          password: formData.password, // Şifreyi de sakla (güvenlik için hash'lenebilir)
          role: formData.role,
          phone: formData.phone,
          position: formData.position,
          salary: parseFloat(formData.salary) || 0,
          startDate: formData.startDate,
          workingHours: parseFloat(formData.workingHours) || 0,
          maxHours: parseFloat(formData.maxHours) || 45,
          performanceScore: parseFloat(formData.performanceScore) || 0,
          onShift: formData.onShift,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          leaveDays: parseInt(formData.leaveDays) || 14,
          usedLeave: parseInt(formData.usedLeave) || 0,
          totalSales: parseFloat(formData.totalSales) || 0,
          customerRating: parseFloat(formData.customerRating) || 0,
          isActive: formData.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Kullanıcı kaydedilirken hata:', error);
      alert('Kullanıcı kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsCreating(false);
      setIsUpdating(false);
    }
  };

  // Delete user
  const handleDeleteUser = (user) => {
    setDeleteModalConfig({
      isOpen: true,
      userId: user.id,
      userName: user.name
    });
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      
      // Önce kullanıcı bilgilerini al
      const userRef = doc(db, 'users', deleteModalConfig.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Firebase Authentication'dan kullanıcıyı sil (eğer uid varsa)
        if (userData.uid) {
          try {
            // Bu işlem için Firebase Admin SDK gerekebilir
            console.log('Firebase Auth kullanıcı silme için Admin SDK gerekli');
          } catch (authError) {
            console.error('Firebase Auth kullanıcı silme hatası:', authError);
          }
        }
      }
      
      // Firestore'dan kullanıcıyı sil
      await deleteDoc(userRef);
      
      setDeleteModalConfig({ isOpen: false, userId: null, userName: '' });
    } catch (error) {
      console.error('Kullanıcı silinirken hata:', error);
      alert('Kullanıcı silinirken bir hata oluştu: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isActive: !user.isActive,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      alert('Durum güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Reset password
  const handleResetPassword = (user) => {
    setSelectedUserId(user.id);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    try {
      setIsResettingPassword(true);
      
      // Önce kullanıcı bilgilerini al
      const userRef = doc(db, 'users', selectedUserId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Kullanıcı bulunamadı');
      }
      
      const userData = userDoc.data();
      
      // Firebase Authentication'da şifreyi güncelle
      if (userData.uid) {
        // Admin olarak giriş yapmış kullanıcının kimlik bilgilerini kullanarak şifre güncelle
        // Bu işlem için Firebase Admin SDK gerekebilir, şimdilik sadece Firestore'da güncelleyelim
        console.log('Firebase Auth şifre güncelleme için Admin SDK gerekli');
      }
      
      // Firestore'da şifreyi güncelle
      await updateDoc(userRef, {
        password: newPassword,
        updatedAt: new Date()
      });
      
      setShowPasswordModal(false);
      setSelectedUserId(null);
      setNewPassword('');
      alert('Şifre başarıyla güncellendi!');
    } catch (error) {
      console.error('Şifre güncellenirken hata:', error);
      alert('Şifre güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Toggle shift status
  const toggleShift = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        onShift: !user.onShift,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Vardiya durumu güncellenirken hata:', error);
      alert('Vardiya durumu güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      phone: '',
      position: '',
      salary: 15000,
      startDate: new Date().toISOString().split('T')[0],
      workingHours: 0,
      maxHours: 45,
      performanceScore: 0,
      onShift: false,
      shiftStart: '09:00',
      shiftEnd: '17:00',
      leaveDays: 14,
      usedLeave: 0,
      totalSales: 0,
      customerRating: 0,
      isActive: true
    });
  };

  // Utility functions
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'badge-error';
      case 'manager': return 'badge-warning';
      case 'staff': return 'badge-info';
      default: return 'badge-outline';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'badge-success' : 'badge-error';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Aktif' : 'Pasif';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Hata: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Çalışan Yönetimi</h2>
          <p className="text-base-content/70">Çalışanları ve vardiyaları yönetin</p>
        </div>
        <button 
          className="btn btn-primary w-full sm:w-auto"
          onClick={handleAddUser}
        >
          <FiPlus className="mr-2" />
          Yeni Çalışan
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-lg shadow-md">
            <div className="stat-figure text-primary">
              <FiUser size={24} />
            </div>
            <div className="stat-title">Toplam Çalışan</div>
            <div className="stat-value text-primary">{stats.totalUsers}</div>
            <div className="stat-desc">{stats.activeUsers} aktif</div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow-md">
            <div className="stat-figure text-secondary">
              <FiClock size={24} />
            </div>
            <div className="stat-title">Vardiyada</div>
            <div className="stat-value text-secondary">{stats.onShiftUsers}</div>
            <div className="stat-desc">Şu anda çalışıyor</div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow-md">
            <div className="stat-figure text-accent">
              <FiDollarSign size={24} />
            </div>
            <div className="stat-title">Toplam Maaş</div>
            <div className="stat-value text-accent">{stats.totalSalary?.toLocaleString()}₺</div>
            <div className="stat-desc">Aylık toplam</div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow-md">
            <div className="stat-figure text-success">
              <FiTrendingUp size={24} />
            </div>
            <div className="stat-title">Ortalama Performans</div>
            <div className="stat-value text-success">{stats.avgPerformance}</div>
            <div className="stat-desc">10 üzerinden</div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="btn-group">
          <button 
            className={`btn btn-sm ${activeView === 'list' ? 'btn-active' : 'btn-outline'}`}
            onClick={() => setActiveView('list')}
          >
            Liste
          </button>
          <button 
            className={`btn btn-sm ${activeView === 'grid' ? 'btn-active' : 'btn-outline'}`}
            onClick={() => setActiveView('grid')}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Users Display */}
      {activeView === 'list' ? (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th className="min-w-[200px]">Çalışan</th>
                <th className="hidden sm:table-cell">Pozisyon</th>
                <th className="hidden md:table-cell">Vardiya</th>
                <th className="hidden lg:table-cell">Performans</th>
                <th className="hidden sm:table-cell">Durum</th>
                <th className="min-w-[120px]">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral rounded-full w-12 h-12 flex items-center justify-center text-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{user.name}</div>
                        <div className="text-sm opacity-50">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <div>
                      <div className="font-bold">{user.position}</div>
                      <span className={`badge ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${user.onShift ? 'badge-success' : 'badge-outline'}`}>
                        {user.onShift ? 'Vardiyada' : 'Vardiya Dışı'}
                      </span>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => toggleShift(user.id)}
                      >
                        {user.onShift ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="rating rating-sm">
                        {[1, 2, 3, 4, 5].map(star => (
                          <input
                            key={star}
                            type="radio"
                            name={`rating-${user.id}`}
                            className="mask mask-star-2 bg-orange-400"
                            checked={star <= (user.performanceScore || 0)}
                            readOnly
                          />
                        ))}
                      </div>
                      <span className="text-sm">{user.performanceScore || 0}/5</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={`badge ${getStatusColor(user.isActive)}`}>
                      {getStatusText(user.isActive)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => handleEditUser(user)}
                      >
                        <FiEdit3 />
                      </button>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => handleResetPassword(user)}
                      >
                        <FiKey />
                      </button>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      <button 
                        className="btn btn-xs btn-error"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(user => (
            <div key={user.id} className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-12">
                      <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  </div>
                  <span className={`badge ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                
                <h3 className="card-title text-lg">{user.name}</h3>
                <p className="text-sm text-base-content/70">{user.position}</p>
                <p className="text-sm text-base-content/70">{user.email}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${user.onShift ? 'badge-success' : 'badge-outline'}`}>
                    {user.onShift ? 'Vardiyada' : 'Vardiya Dışı'}
                  </span>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => toggleShift(user.id)}
                  >
                    {user.onShift ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="rating rating-sm">
                    {[1, 2, 3, 4, 5].map(star => (
                      <input
                        key={star}
                        type="radio"
                        name={`rating-${user.id}`}
                        className="mask mask-star-2 bg-orange-400"
                        checked={star <= (user.performanceScore || 0)}
                        readOnly
                      />
                    ))}
                  </div>
                  <span className="text-sm">{user.performanceScore || 0}/5</span>
                </div>
                
                <div className="card-actions justify-end mt-3">
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleEditUser(user)}
                  >
                    <FiEdit3 />
                  </button>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleResetPassword(user)}
                  >
                    <FiKey />
                  </button>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleToggleStatus(user)}
                  >
                    {user.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                  <button 
                    className="btn btn-xs btn-error"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingUser ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Ad Soyad *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">E-posta *</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className="input input-bordered w-full"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Şifre {editingUser ? '(Boş bırakın değiştirmek istemiyorsanız)' : '*'}</span>
                </label>
                <input
                  type="password"
                  name="password"
                  className="input input-bordered w-full"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Görev</span>
                </label>
                <select
                  name="role"
                  className="select select-bordered w-full"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="staff">Personel</option>
                  <option value="manager">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Telefon</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="input input-bordered w-full"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Pozisyon</span>
                </label>
                <input
                  type="text"
                  name="position"
                  className="input input-bordered w-full"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Maaş (₺)</span>
                </label>
                <input
                  type="number"
                  name="salary"
                  className="input input-bordered w-full"
                  value={formData.salary}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">İşe Başlama Tarihi</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  className="input input-bordered w-full"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Vardiya Başlangıcı</span>
                </label>
                <input
                  type="time"
                  name="shiftStart"
                  className="input input-bordered w-full"
                  value={formData.shiftStart}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Vardiya Bitişi</span>
                </label>
                <input
                  type="time"
                  name="shiftEnd"
                  className="input input-bordered w-full"
                  value={formData.shiftEnd}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Performans Puanı</span>
                </label>
                <input
                  type="number"
                  name="performanceScore"
                  className="input input-bordered w-full"
                  value={formData.performanceScore}
                  onChange={handleInputChange}
                  min="0"
                  max="5"
                  step="0.1"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Maksimum Çalışma Saati</span>
                </label>
                <input
                  type="number"
                  name="maxHours"
                  className="input input-bordered w-full"
                  value={formData.maxHours}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">İzin Günü</span>
                </label>
                <input
                  type="number"
                  name="leaveDays"
                  className="input input-bordered w-full"
                  value={formData.leaveDays}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Kullanılan İzin</span>
                </label>
                <input
                  type="number"
                  name="usedLeave"
                  className="input input-bordered w-full"
                  value={formData.usedLeave}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Toplam Satış</span>
                </label>
                <input
                  type="number"
                  name="totalSales"
                  className="input input-bordered w-full"
                  value={formData.totalSales}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Müşteri Puanı</span>
                </label>
                <input
                  type="number"
                  name="customerRating"
                  className="input input-bordered w-full"
                  value={formData.customerRating}
                  onChange={handleInputChange}
                  min="0"
                  max="5"
                  step="0.1"
                />
              </div>
              
              <div className="form-control flex flex-col lg:col-span-2">
                <label className="label cursor-pointer">
                  <span className="label-text">Aktif</span>
                  <input
                    type="checkbox"
                    name="isActive"
                    className="toggle toggle-primary"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                </label>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={handleCloseModal}
              >
                <FiX className="mr-1" />
                İptal
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveUser}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-1" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Şifre Sıfırla</h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Yeni Şifre</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifre girin"
              />
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUserId(null);
                  setNewPassword('');
                }}
              >
                <FiX className="mr-1" />
                İptal
              </button>
              <button 
                className="btn btn-primary"
                onClick={handlePasswordReset}
                disabled={isResettingPassword || !newPassword.trim()}
              >
                {isResettingPassword ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <FiKey className="mr-1" />
                    Güncelle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Çalışanı Sil"
        message={`"${deleteModalConfig.userName}" çalışanını silmek istediğinizden emin misiniz?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalConfig({ isOpen: false, userId: null, userName: '' })}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default UserManagement; 