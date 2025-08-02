import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FiUsers, FiMenu, FiBarChart2, FiSettings, FiLogOut, FiHome, FiUser, FiCoffee } from 'react-icons/fi';

// Admin componentlerini import et
import MenuManagement from '../components/admin/MenuManagement';
import UserManagement from '../components/admin/UserManagement';
import Reports from '../components/admin/Reports';
import Settings from '../components/admin/Settings';
import TableManagement from '../components/admin/TableManagement';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('tables');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Firebase'den çıkış yap
      await signOut(auth);

      // LocalStorage'ı temizle
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');

      // Login sayfasına yönlendir
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
      alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Sidebar toggle - sadece mobil için
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Mobil cihazlarda sekme değiştirdikten sonra sidebar'ı kapat
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Mobil Header */}
      <div className="md:hidden bg-base-300 p-4 shadow-md flex items-center justify-between z-30 fixed top-0 left-0 right-0">
        <div>
          <h1 className="text-xl font-bold">Kahve Dükkanı</h1>
          <p className="text-sm opacity-75">Admin Paneli</p>
        </div>
        <button
          className="btn btn-square btn-ghost"
          onClick={toggleSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar - Sol tarafı yukarıdan aşağıya komple kaplar */}
      <div className={`
        fixed top-0 left-0 z-50 w-80 h-screen bg-base-300 text-base-content shadow-lg transition-transform duration-300 ease-in-out
        md:relative md:z-0 md:translate-x-0 md:transition-none md:w-80 md:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-base-content/10">
          <h1 className="text-2xl font-bold mb-2">Kahve Dükkanı</h1>
          <p className="text-base opacity-75 mb-4">Admin Paneli</p>
          {user && (
            <div className="p-4 bg-base-200 rounded-lg flex flex-col">
              <div className='flex gap-2'>
                <div className="flex items-center gap-3 mb-2">
                  <FiUser className="text-primary text-lg" />
                  <span className="font-semibold text-lg">{user.name}</span>
                </div>
                <div className="text-sm opacity-70 mb-2">{user.email}</div>
              </div>
              <div>
                <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                  {user.role === 'admin' ? 'Admin' : 'Personel'}
                </span>
              </div>
            </div>
          )}
        </div>

        <ul className="menu p-4 gap-3 text-base flex-1">
          <li>
            <Link to="/" className="flex items-center py-3 px-4 rounded-lg hover:bg-base-200 transition-colors">
              <FiHome className="mr-3 text-lg" />
              <span className="font-medium">Ana Sayfa</span>
            </Link>
          </li>
          <li>
            <button
              className={`flex items-center py-3 px-4 rounded-lg w-full text-left transition-colors ${activeTab === 'menu' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              onClick={() => handleTabChange('menu')}
            >
              <FiMenu className="mr-3 text-lg" />
              <span className="font-medium">Menü Yönetimi</span>
            </button>
          </li>
          <li>
            <button
              className={`flex items-center py-3 px-4 rounded-lg w-full text-left transition-colors ${activeTab === 'tables' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              onClick={() => handleTabChange('tables')}
            >
              <FiCoffee className="mr-3 text-lg" />
              <span className="font-medium">Masa Yönetimi</span>
            </button>
          </li>
          <li>
            <button
              className={`flex items-center py-3 px-4 rounded-lg w-full text-left transition-colors ${activeTab === 'users' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              onClick={() => handleTabChange('users')}
            >
              <FiUsers className="mr-3 text-lg" />
              <span className="font-medium">Kullanıcı Yönetimi</span>
            </button>
          </li>
          <li>
            <button
              className={`flex items-center py-3 px-4 rounded-lg w-full text-left transition-colors ${activeTab === 'reports' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              onClick={() => handleTabChange('reports')}
            >
              <FiBarChart2 className="mr-3 text-lg" />
              <span className="font-medium">Raporlar</span>
            </button>
          </li>
          <li>
            <button
              className={`flex items-center py-3 px-4 rounded-lg w-full text-left transition-colors ${activeTab === 'settings' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              onClick={() => handleTabChange('settings')}
            >
              <FiSettings className="mr-3 text-lg" />
              <span className="font-medium">Ayarlar</span>
            </button>
          </li>
        </ul>

        <div className="p-4 border-t border-base-content/10 mt-auto">
          <button
            className={`btn btn-outline w-full py-3 ${isLoggingOut ? 'loading' : ''}`}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {!isLoggingOut && <FiLogOut className="mr-2" />}
            {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
          </button>
        </div>
      </div>

      {/* Ana içerik - Sidebar'ın yanında */}
      <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="md:pt-0 pt-16">
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
};

export default Admin; 