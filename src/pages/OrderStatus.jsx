import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  FiClock, 
  FiStar, 
  FiRefreshCw,
  FiUser,
  FiMapPin,
  FiMessageSquare,
  FiCoffee
} from 'react-icons/fi';

const OrderStatus = () => {
  const { tableId } = useParams();
  
  // State'ler
  const [tables, setTables] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase'den masaları çek
  useEffect(() => {
    const tablesQuery = query(collection(db, 'tables'), orderBy('number'));
    
    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(tablesData);
      
      // Mevcut masayı bul
      const foundTable = tablesData.find(t => t.id === tableId);
      setCurrentTable(foundTable);
      setIsLoading(false);
    }, (error) => {
      console.error('Masalar yüklenirken hata:', error);
      setIsLoading(false);
    });

    return () => unsubscribeTables();
  }, [tableId]);

  // Firebase'den masa siparişlerini çek
  useEffect(() => {
    if (!tableId) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('tableId', '==', tableId),
      limit(10)
    );
    
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side'da tarihe göre sırala ve sadece aktif siparişleri filtrele
      const sortedOrders = ordersData
        .filter(order => 
          order.status !== 'completed' && 
          order.status !== 'cancelled'
        )
        .sort((a, b) => {
          let dateA, dateB;
          
          if (a.createdAt?.toDate) {
            dateA = a.createdAt.toDate();
          } else if (a.createdAt?.seconds) {
            dateA = new Date(a.createdAt.seconds * 1000);
          } else {
            dateA = new Date(a.createdAt);
          }
          
          if (b.createdAt?.toDate) {
            dateB = b.createdAt.toDate();
          } else if (b.createdAt?.seconds) {
            dateB = new Date(b.createdAt.seconds * 1000);
          } else {
            dateB = new Date(b.createdAt);
          }
          
          return dateB - dateA; // En son sipariş önce
        });

      setTableOrders(sortedOrders);
    }, (error) => {
      console.error('Siparişler yüklenirken hata:', error);
    });

    return () => unsubscribeOrders();
  }, [tableId]);

  // Sipariş durumu belirleme fonksiyonu
  const getOrderStatus = () => {
    const status = currentOrder?.status;
    
    if (status === 'pending') {
      return { key: 'received', label: 'Sipariş Alındı', color: 'text-info', bgColor: 'bg-info/10' };
    }
    if (status === 'confirmed' || status === 'preparing') {
      return { key: 'preparing', label: 'Hazırlanıyor', color: 'text-warning', bgColor: 'bg-warning/10' };
    }
    if (status === 'ready') {
      return { key: 'ready', label: 'Hazır', color: 'text-success', bgColor: 'bg-success/10' };
    }
    if (status === 'delivered') {
      return { key: 'delivered', label: 'Teslim Edildi', color: 'text-success', bgColor: 'bg-success/10' };
    }
    // served ve completed durumları artık kullanılmıyor, sadece delivered kullanılıyor
    if (status === 'cancelled') {
      return { key: 'cancelled', label: 'İptal Edildi', color: 'text-error', bgColor: 'bg-error/10' };
    }
    
    // Varsayılan olarak pending kabul et
    return { key: 'received', label: 'Sipariş Alındı', color: 'text-info', bgColor: 'bg-info/10' };
  };

  // En son aktif siparişi al (tamamlanmamış olanlar)
  const currentOrder = tableOrders.find(order => 
    order.status !== 'served' && 
    order.status !== 'cancelled' && 
    order.status !== 'completed'
  ) || null;
  


  // Sipariş zamanını hesapla
  useEffect(() => {
    if (!currentOrder?.createdAt) return;

    const updateTime = () => {
      let orderTime;
      if (currentOrder.createdAt?.toDate) {
        orderTime = currentOrder.createdAt.toDate();
      } else if (currentOrder.createdAt?.seconds) {
        orderTime = new Date(currentOrder.createdAt.seconds * 1000);
      } else {
        orderTime = new Date(currentOrder.createdAt);
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
      setTimeElapsed(diffInMinutes);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Her dakika güncelle

    return () => clearInterval(interval);
  }, [currentOrder]);

  // Durum yenileme
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };



  // Global sipariş durumu güncellemelerini dinle
  useEffect(() => {
    const handleOrderUpdate = (event) => {
      const { tableId: updatedTableId, orderId, newStatus, newOrder } = event.detail;
      
      if (updatedTableId === tableId) {
        // Yeni sipariş oluşturulduysa veya durum güncellendiyse
        if (newOrder || newStatus) {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 1000);
        }
      }
    };

    window.addEventListener('orderStatusUpdated', handleOrderUpdate);
    return () => {
      window.removeEventListener('orderStatusUpdated', handleOrderUpdate);
    };
  }, [tableId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!currentTable) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <FiMapPin size={48} className="mx-auto mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-4">Masa Bulunamadı</h2>
          <p className="text-base-content/70">
            {tableId ? `Masa bulunamadı. Lütfen QR kodu tekrar okutun.` : 'Geçersiz masa numarası. Lütfen QR kodu tekrar okutun.'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentOrder) {
    // Son siparişin durumunu kontrol et
    const lastOrder = tableOrders[0];
    const isCompleted = lastOrder && lastOrder.status === 'delivered';
    
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          {isCompleted ? (
            <>
              <FiStar size={48} className="mx-auto mb-4 text-success" />
              <h2 className="text-2xl font-bold mb-4 text-success">Sipariş Tamamlandı!</h2>
              <p className="text-base-content/70 mb-6">
                Siparişiniz başarıyla tamamlandı. Yeni bir sipariş verebilirsiniz.
              </p>
            </>
          ) : (
            <>
              <FiCoffee size={48} className="mx-auto mb-4 text-warning" />
              <h2 className="text-2xl font-bold mb-4">Sipariş Bulunamadı</h2>
              <p className="text-base-content/70 mb-6">
                Bu masada henüz bir sipariş bulunmuyor.
              </p>
            </>
          )}
          <div className="space-y-3">
            <Link to={`/menu/${currentTable?.number || tableId}`} className="btn btn-primary w-full">
              <FiCoffee className="mr-2" /> Sipariş Ver
            </Link>
            <button 
              onClick={handleRefresh}
              className="btn btn-outline w-full"
            >
              <FiRefreshCw className="mr-2" /> Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }



  const orderStatus = getOrderStatus();

  // İlerleme çubuğu hesaplama
  const getProgress = () => {
    switch (orderStatus.key) {
      case 'received': return 25;
      case 'preparing': return 50;
      case 'ready': return 75;
      case 'delivered': return 100; // delivered = tamamlandı
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  // Sipariş zamanını formatla
  const formatOrderTime = (timestamp) => {
    if (!timestamp) return 'Bilinmiyor';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('tr-TR');
  };

  return (
    <div className="min-h-screen bg-base-200 pb-20">
      {/* Header */}
      <div className="bg-base-100 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary w-10 h-10 rounded-full flex items-center justify-center text-primary-content">
                <FiCoffee size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Sipariş Takip</h1>
                <p className="text-sm opacity-70">Masa {currentTable?.number}</p>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              className="btn btn-ghost btn-sm"
              title="Durumu Yenile"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Durum Kartı */}
        <div className={`${orderStatus.bgColor} rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {orderStatus.key === 'received' && <FiClock size={24} className={orderStatus.color} />}
              {orderStatus.key === 'preparing' && <FiRefreshCw size={24} className={`${orderStatus.color} animate-spin`} />}
              {orderStatus.key === 'ready' && <FiStar size={24} className={orderStatus.color} />}
              {orderStatus.key === 'delivered' && <FiStar size={24} className={orderStatus.color} />}
              {orderStatus.key === 'cancelled' && <FiClock size={24} className={orderStatus.color} />}
              
              <div>
                <h2 className={`text-2xl font-bold ${orderStatus.color}`}>
                  {orderStatus.label}
                </h2>
                <p className="text-sm opacity-70">
                  {timeElapsed} dakika önce sipariş verildi
                </p>
              </div>
            </div>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="w-full bg-base-300 rounded-full h-3 mb-2">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-1000"
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs opacity-70">
            <span>Sipariş Alındı</span>
            <span>Hazırlanıyor</span>
            <span>Hazır</span>
            <span>Teslim Edildi</span>
          </div>
        </div>

        {/* Sipariş Detayları */}
        <div className="bg-base-100 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCoffee className="text-primary" />
            Sipariş Detayları
          </h3>
          
          <div className="space-y-3">
            {currentOrder.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-base-200 last:border-b-0">
                <div className="flex-1">
                  <span className="font-medium">{item.menuItemName || item.name}</span>
                  <span className="text-sm opacity-70 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} ₺</span>
              </div>
            ))}
          </div>

          <div className="border-t border-base-200 pt-3 mt-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Toplam:</span>
              <span className="text-primary">{currentOrder.totalAmount?.toFixed(2) || '0.00'} ₺</span>
            </div>
          </div>
        </div>

        {/* Müşteri Bilgileri */}
        {currentOrder.customerInfo?.name && (
          <div className="bg-base-100 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FiUser className="text-primary" />
              Sipariş Bilgileri
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FiUser size={16} className="opacity-70" />
                <span>Müşteri: {currentOrder.customerInfo.name}</span>
              </div>
              {currentOrder.specialRequests && (
                <div className="flex items-start gap-2">
                  <FiMessageSquare size={16} className="opacity-70 mt-0.5" />
                  <span>Not: {currentOrder.specialRequests}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FiClock size={16} className="opacity-70" />
                <span>Sipariş Zamanı: {formatOrderTime(currentOrder.createdAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tahmini Süre Kartı */}
        {orderStatus.key !== 'delivered' && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 text-center">
            <FiClock size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-sm opacity-70 mt-1">
              {orderStatus.key === 'ready' 
                ? 'Siparişiniz hazır, personel masanıza getirecek.' 
                : 'Siparişiniz en kısa sürede hazırlanacak.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Alt Eylem Çubuğu - Sadece Müşteri İçin */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 p-4">
        <div className="container mx-auto">
          {orderStatus.key === 'delivered' && (
            <Link 
              to={`/menu/${currentTable?.number || tableId}`} 
              className="btn btn-primary w-full"
            >
              <FiCoffee className="mr-2" />
              Yeni Sipariş Ver
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderStatus; 