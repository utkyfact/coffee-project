import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import TableLayout from '../components/TableLayout';
import TableModal from '../components/TableModal';
import { showOrderNotificationWithSound, showOrderStatusNotificationWithSound, showTableStatusNotificationWithSound, showErrorNotification } from '../utils/dashboardNotifications';
import { FiSettings, FiLogOut, FiUser, FiCoffee } from 'react-icons/fi';

function Dashboard() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // State'ler
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Ref'ler - sonsuz döngüyü önlemek için
  const lastOrderIdsRef = useRef(new Set());
  const isInitializedRef = useRef(false);
  
  // Sayfa yüklendiğinde localStorage'dan mevcut sipariş ID'lerini kontrol et
  useEffect(() => {
    const storedOrderIds = JSON.parse(localStorage.getItem('lastOrderIds') || '[]');
    const lastNotificationDate = localStorage.getItem('lastNotificationDate');
    const todayDateString = new Date().toDateString();
    
    // Eğer aynı günse ve localStorage'da sipariş ID'leri varsa, initialized olarak işaretle
    if (lastNotificationDate === todayDateString && storedOrderIds.length > 0) {
      isInitializedRef.current = true;
    } else {
      // Farklı günse veya localStorage boşsa, temizle ve yeni başlat
      localStorage.removeItem('lastOrderIds');
      localStorage.setItem('lastNotificationDate', todayDateString);
      isInitializedRef.current = false;
    }
  }, []);

  // En başta authentication kontrolü yap - eğer giriş yapılmamışsa hiçbir şey yükleme
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Firebase'den masa verilerini çek
  useEffect(() => {
    if (!isAuthenticated) return;

    const tablesQuery = query(collection(db, 'tables'), orderBy('number'));
    
    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTables(tablesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Masalar yüklenirken hata:', error);
      setIsLoading(false);
    });

    return () => unsubscribeTables();
  }, [isAuthenticated]);

  // Firebase'den sipariş verilerini çek
  useEffect(() => {
    if (!isAuthenticated) return;

    // Bugünün başlangıcını hesapla
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(today)),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sadece aktif siparişleri filtrele (completed ve cancelled olmayanlar)
      const activeOrders = ordersData.filter(order => 
        order.status !== 'completed' && 
        order.status !== 'cancelled'
      );
      
      setOrders(activeOrders);
    }, (error) => {
      console.error('Siparişler yüklenirken hata:', error);
    });

    return () => unsubscribeOrders();
  }, [isAuthenticated]);

  // Yeni siparişleri kontrol et ve bildirim göster
  useEffect(() => {
    if (!orders || !Array.isArray(orders)) return;
    
    const currentOrderIds = new Set(orders.map(order => order.id));
    
    // Tarih kontrolü zaten başlangıçta yapıldı, burada sadece sipariş kontrolü yapılacak
    
    // localStorage'dan önceki sipariş ID'lerini al
    const storedOrderIds = JSON.parse(localStorage.getItem('lastOrderIds') || '[]');
    const lastOrderIdsSet = new Set(storedOrderIds);
    
    // İlk yüklemede veya localStorage boşsa bildirimleri gösterme
    if (!isInitializedRef.current || storedOrderIds.length === 0) {
      // Mevcut siparişleri localStorage'a kaydet ama bildirim gösterme
      localStorage.setItem('lastOrderIds', JSON.stringify(Array.from(currentOrderIds)));
      isInitializedRef.current = true;
      return;
    }
    
    // Sadece bugünün siparişlerini kontrol et
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Yeni siparişleri kontrol et
    let newOrderCount = 0;
    orders.forEach(order => {
      if (!lastOrderIdsSet.has(order.id)) {
        // Sadece bugün oluşturulan siparişler için bildirim göster
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        if (orderDate >= today) {
          newOrderCount++;
          const table = tables.find(t => t.id === order.tableId);
          const tableNumber = table?.number || 'Bilinmeyen';
                    
          // Sadece gerçekten yeni siparişler için bildirim göster
          if (newOrderCount <= 3) { // Maksimum 3 bildirim
            showOrderNotificationWithSound(tableNumber, order.orderNumber, order.items);
          }
        }
      }
    });
    
    // Son sipariş ID'lerini localStorage'a kaydet
    localStorage.setItem('lastOrderIds', JSON.stringify(Array.from(currentOrderIds)));
  }, [orders, tables]);

  // Yeni sipariş oluşturulduğunda anında bildirim göster
  useEffect(() => {
    const handleNewOrderCreated = (event) => {
      const { tableNumber, orderNumber, items } = event.detail;
      
      // Anında bildirim göster
      showOrderNotificationWithSound(tableNumber, orderNumber, items);
    };

    window.addEventListener('newOrderCreated', handleNewOrderCreated);
    return () => window.removeEventListener('newOrderCreated', handleNewOrderCreated);
  }, []);

  // Sipariş durumu değişikliklerini dinle
  useEffect(() => {
    const handleOrderStatusUpdate = (event) => {
      const { orderId, newStatus, tableId } = event.detail;
      
      // Masa bilgisini bul
      const table = tables.find(t => t.id === tableId);
      const tableNumber = table?.number || 'Bilinmeyen';
      
      // Sipariş bilgisini bul
      const order = orders.find(o => o.id === orderId);
      const orderNumber = order?.orderNumber || `#${orderId?.slice(-6) || 'Bilinmeyen'}`;
      
      // Durum değişikliği bildirimi göster
      showOrderStatusNotificationWithSound(tableNumber, orderNumber, newStatus);
    };

    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    return () => window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate);
  }, [tables, orders]); // tables ve orders dependency'lerini geri ekledik

  // Masa durumunu güncelle
  const handleUpdateTableStatus = async (tableId, newStatus, orderDetails = null) => {
    try {
      setIsUpdating(true);
      
      const tableRef = doc(db, 'tables', tableId);
      await updateDoc(tableRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Başarılı güncelleme sonrası modalı kapat
      if (modalOpen) {
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Masa durumu güncellenirken hata oluştu:', error);
      // Hata mesajı göster
      showErrorNotification('Masa durumu güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Masa'ya tıklandığında modal'ı aç
  const handleTableClick = (table) => {
    setSelectedTable(table);
    setModalOpen(true);
  };

  // Çıkış yap
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="navbar bg-base-100 rounded-lg shadow-md mb-6">
        <div className="navbar-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary w-10 h-10 rounded-full flex items-center justify-center text-primary-content">
              <FiCoffee size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Kahve Dükkanı</h1>
              <p className="text-sm opacity-70">Masa Düzeni</p>
            </div>
          </div>
        </div>
        
        <div className="navbar-end">
          <div className="flex items-center gap-3">
            {/* Kullanıcı Bilgisi */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <FiUser className="text-primary" />
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                <li>
                  <div className="justify-between">
                    <span>{user?.name}</span>
                    <span className={`badge badge-xs ${user?.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {user?.role === 'admin' ? 'Admin' : 'Personel'}
                    </span>
                  </div>
                </li>
                <li><a className="text-xs opacity-70">{user?.email}</a></li>
                <li><hr className="my-1" /></li>
                {user?.role === 'admin' && (
                  <li>
                    <Link to="/admin">
                      <FiSettings className="mr-2" /> Admin Paneli
                    </Link>
                  </li>
                )}
                <li>
                  <button onClick={handleLogout} className="text-error">
                    <FiLogOut className="mr-2" /> Çıkış Yap
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Masa durumu göstergeleri */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-base-300"></div>
          <span className="text-sm">Boş</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary"></div>
          <span className="text-sm">Sipariş Alındı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-warning"></div>
          <span className="text-sm">Hazırlanıyor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-success"></div>
          <span className="text-sm">Teslim Edildi</span>
        </div>
      </div>
      
      <TableLayout 
        tables={tables} 
        onTableClick={handleTableClick} 
      />
      
      {modalOpen && selectedTable && (
        <TableModal
          table={selectedTable}
          onClose={() => setModalOpen(false)}
          onUpdateStatus={handleUpdateTableStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}

export default Dashboard; 