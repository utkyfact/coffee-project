import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FiEye, FiSquare, FiClock, FiPlus, FiMinus, FiShoppingCart } from 'react-icons/fi';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { showSuccessNotification, showErrorNotification } from '../utils/dashboardNotifications';

const TableModal = ({ table, onClose, onUpdateStatus, isUpdating = false }) => {
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  // State'ler
  const [menuItems, setMenuItems] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);

  // Firebase'den menü öğelerini çek
  useEffect(() => {
    const menuQuery = query(collection(db, 'menuItems'), orderBy('name'));
    
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(menuData);
      setLoadingMenu(false);
    }, (error) => {
      console.error('Menü yüklenirken hata:', error);
      setLoadingMenu(false);
    });

    return () => unsubscribeMenu();
  }, []);

  // Firebase'den masa siparişlerini çek
  useEffect(() => {
    if (!table?.id) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('tableId', '==', table.id)
    );
    
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Client-side'da tarihe göre sırala
      const sortedOrders = ordersData.sort((a, b) => {
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
      
      // Masa durumuna göre siparişleri filtrele
      let filteredOrders;
      if (table.status === 'available') {
        // Masa boşsa hiç sipariş gösterme
        filteredOrders = [];
      } else {
        // Masa doluysa sadece aktif siparişleri göster (son 5 sipariş)
        filteredOrders = sortedOrders.filter(order => 
          order.status !== 'served' && 
          order.status !== 'cancelled' && 
          order.status !== 'completed'
        ).slice(0, 5);
      }
      
      setTableOrders(filteredOrders);
      setLoadingOrders(false);
    }, (error) => {
      console.error('Siparişler yüklenirken hata:', error);
      setLoadingOrders(false);
    });

    return () => unsubscribeOrders();
  }, [table?.id]);

  // Kategorileri al
  const categories = [...new Set(menuItems.map(item => item.category))];
  
  // Filtrelenmiş menü öğeleri
  const filteredMenuItems = selectedCategory 
    ? menuItems.filter(item => item.category === selectedCategory)
    : menuItems;

  // Sepete ürün ekle
  const addToCart = (menuItem) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menuItemId === menuItem.id);
      if (existingItem) {
        return prev.map(item =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          image: menuItem.image
        }];
      }
    });
  };

  // Sepetten ürün çıkar
  const removeFromCart = (menuItemId) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menuItemId === menuItemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter(item => item.menuItemId !== menuItemId);
      }
    });
  };

  // Sepet toplamı
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Sipariş oluştur
  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      showErrorNotification('Sepetiniz boş!');
      return;
    }
    
    try {
      setCreatingOrder(true);
      
      // Sipariş numarası oluştur
      const orderNumber = `ORD-${Date.now()}`;
      
      const orderData = {
        tableId: table.id,
        tableNumber: table.number,
        orderNumber: orderNumber,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          menuItemName: item.name,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: ''
        })),
        customerInfo: customerInfo.name ? {
          name: customerInfo.name,
          phone: customerInfo.phone
        } : undefined,
        specialRequests: customerInfo.notes,
        totalAmount: cartTotal,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Firebase'e sipariş ekle
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Sipariş başarılı, modalı kapat
      setCart([]);
      setCustomerInfo({ name: '', phone: '', notes: '' });
      setShowOrderForm(false);
      
      // Başarı mesajı
      showSuccessNotification('Sipariş başarıyla oluşturuldu!');
      
      // Dashboard için yeni sipariş bildirimi event'i dispatch et
      window.dispatchEvent(new CustomEvent('newOrderCreated', { 
        detail: { 
          tableId: table.id,
          tableNumber: table.number,
          orderNumber: orderNumber,
          items: cart
        } 
      }));
      
      // OrderStatus sayfalarının da yenilenmesi için global bir event dispatch et
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
        detail: { tableId: table.id, newOrder: true } 
      }));
      
    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      showErrorNotification('Sipariş oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  // Sipariş tarihini formatlama
  const formatOrderTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ödeme QR kodu için URL
  const getPaymentQRCode = () => {
    return "https://example.com/payment/" + table.id;
  };

  // Sipariş durumunu güncelle
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingOrderStatus(true);
      

      
      // Masa durumunu güncelle
      onUpdateStatus(table.id, newStatus);
      
      // Eğer aktif sipariş varsa, sipariş durumunu da güncelle
      if (tableOrders.length > 0) {
        // Masa boş yapılıyorsa tüm aktif siparişleri tamamla
        if (newStatus === 'available') {
          for (const order of tableOrders) {
            if (order.status !== 'completed' && order.status !== 'cancelled') {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'completed',
                updatedAt: Timestamp.now()
              });
              
              // Global event dispatch et
              window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
                detail: { orderId: order.id, newStatus: 'completed', tableId: table.id } 
              }));
            }
          }
        }
        // Teslim edildi durumu için sipariş durumunu da güncelle
        else if (newStatus === 'delivered') {
          // Teslim edildi durumu için aktif siparişleri delivered yap
          const activeOrder = tableOrders.find(order => 
            order.status !== 'completed' && order.status !== 'cancelled'
          );
          
          if (activeOrder) {
            const orderRef = doc(db, 'orders', activeOrder.id);
            await updateDoc(orderRef, {
              status: 'delivered',
              updatedAt: Timestamp.now()
            });
                        
            // Global event dispatch et
            window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
              detail: { orderId: activeOrder.id, newStatus: 'delivered', tableId: table.id } 
            }));
          }
        }
        else {
          // Diğer durumlarda sadece aktif siparişin durumunu güncelle
          const activeOrder = tableOrders.find(order => 
            order.status !== 'completed' && order.status !== 'cancelled'
          );
          
          if (activeOrder) {
            let orderStatus = null;
            
            // Masa durumuna göre sipariş durumunu belirle
            if (newStatus === 'ordered') {
              orderStatus = 'confirmed'; // Sipariş onaylandı
            } else if (newStatus === 'preparing') {
              orderStatus = 'preparing'; // Hazırlanıyor
            }
            
            // Sipariş durumunu güncelle
            if (orderStatus) {
              const orderRef = doc(db, 'orders', activeOrder.id);
              await updateDoc(orderRef, {
                status: orderStatus,
                updatedAt: Timestamp.now()
              });
                          
              // Global event dispatch et
              window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
                detail: { orderId: activeOrder.id, newStatus: orderStatus, tableId: table.id } 
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      showErrorNotification('Durum güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Sipariş durumunu güncelle
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingOrderStatus(true);
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
            
      // Masa durumunu da güncelle
      if (newStatus === 'served') {
        onUpdateStatus(table.id, 'delivered');
      } else if (newStatus === 'preparing') {
        onUpdateStatus(table.id, 'preparing');
      } else if (newStatus === 'ready') {
        onUpdateStatus(table.id, 'delivered');
      } else if (newStatus === 'ordered') {
        onUpdateStatus(table.id, 'ordered');
      }
      
      // OrderStatus sayfalarının da yenilenmesi için global bir event dispatch et
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
        detail: { orderId, newStatus, tableId: table.id } 
      }));
      
      // Eğer sipariş tamamlandıysa, kısa bir gecikme ile modal'ı kapat
      if (newStatus === 'completed') {
        setTimeout(() => {
          onClose();
        }, 3000); // 3 saniye bekle
      }
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata:', error);
      showErrorNotification('Sipariş durumu güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Masa kalktı - siparişi temizle
  const handleTableCleared = async () => {
    try {
      // Önce aktif siparişleri 'completed' olarak işaretle
      if (tableOrders.length > 0) {
        for (const order of tableOrders) {
          if (order.status !== 'completed' && order.status !== 'cancelled') {
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
              status: 'completed',
              updatedAt: Timestamp.now()
            });
                        
            // Global event dispatch et
            window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
              detail: { orderId: order.id, newStatus: 'completed', tableId: table.id } 
            }));
          }
        }
      }
      
      // Masanın durumunu 'available' olarak güncelle
      await onUpdateStatus(table.id, 'available');
      
      setShowConfirmDialog(false);
      
      // Kısa bir gecikme ile modal'ı kapat (Firebase güncellemesinin yansıması için)
      setTimeout(() => {
        onClose(); // Modalı kapat
      }, 1000); // 1 saniye bekle
    } catch (error) {
      console.error('Masa temizlenirken hata:', error);
      showErrorNotification('Masa temizlenirken bir hata oluştu: ' + error.message);
    }
  };

  // Masa durumu renklendirme
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-base-300';
      case 'pending': return 'bg-primary';
      case 'ordered': return 'bg-primary';
      case 'preparing': return 'bg-warning';
      case 'delivered': return 'bg-success';
      case 'served': return 'bg-success';
      case 'completed': return 'bg-success';
      default: return 'bg-base-300';
    }
  };

  // Masa durumu metni
  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Boş';
      case 'pending': return 'Sipariş Alındı';
      case 'ordered': return 'Sipariş Alındı';
      case 'preparing': return 'Hazırlanıyor';
      case 'delivered': return 'Teslim Edildi';
      case 'served': return 'Tamamlandı';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmeyen';
    }
  };

  // Sipariş durumu rengi
  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-info text-info-content';
      case 'confirmed': return 'bg-primary text-primary-content';
      case 'preparing': return 'bg-warning text-warning-content';
      case 'ready': return 'bg-success text-success-content';
      case 'delivered': return 'bg-success text-success-content';
      case 'served': return 'bg-neutral text-neutral-content';
      case 'completed': return 'bg-neutral text-neutral-content';
      case 'cancelled': return 'bg-error text-error-content';
      default: return 'bg-base-300 text-base-content';
    }
  };

  // Sipariş durumu metni
  const getOrderStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Sipariş Alındı';
      case 'confirmed': return 'Onaylandı';
      case 'preparing': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'delivered': return 'Teslim Edildi';
      case 'served': return 'Tamamlandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmeyen';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        
        {/* Onay Diyaloğu */}
        {showConfirmDialog && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10">
            <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md mx-4">
              <h3 className="text-lg font-bold mb-4">Masa Kalktı</h3>
              <p className="mb-6">Bu masayı temizlemek istiyor musunuz?</p>
              <div className="flex justify-end gap-2">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Vazgeç
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleTableCleared}
                >
                  Evet, Temizle
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Masa {table.number}</h2>
            <button 
              className="btn btn-sm btn-circle"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {showPaymentQR ? (
            // QR Kod Ekranı
            <div className="text-center py-4">
              <h3 className="text-xl font-semibold mb-4">QR Kod ile Ödeme</h3>
              <div className="bg-base-100 p-4 inline-block rounded-md mb-4 border">
                <QRCodeSVG
                  value={getPaymentQRCode()}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"L"}
                  includeMargin={false}
                />
              </div>
              <p className="mb-2">Ödeme yapmak için QR kodu taratın</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowPaymentQR(false)}
              >
                Geri Dön
              </button>
            </div>
          ) : showOrderForm ? (
            // Sipariş Verme Formu
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Sipariş Ver</h3>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowOrderForm(false)}
                >
                  Geri Dön
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Menü */}
                <div className="lg:col-span-2">
                  {/* Kategori Filtreleri */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      className={`btn btn-sm ${selectedCategory === '' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedCategory('')}
                    >
                      Tümü
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        className={`btn btn-sm ${selectedCategory === category ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Menü Öğeleri */}
                  <div className="grid sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {loadingMenu ? (
                      <div className="col-span-2 text-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                      </div>
                    ) : (
                      filteredMenuItems.map(item => (
                        <div key={item.id} className="card card-compact bg-base-200 shadow">
                          {item.image && (
                            <figure className="h-32">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </figure>
                          )}
                          <div className="card-body">
                            <h3 className="card-title text-sm">{item.name}</h3>
                            <p className="text-xs text-base-content/70">{item.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="font-bold text-primary">{item.price} ₺</span>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => addToCart(item)}
                              >
                                <FiPlus />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sepet */}
                <div className="space-y-4">
                  <div className="card bg-base-200">
                    <div className="card-body p-4">
                      <h3 className="card-title text-lg flex items-center gap-2">
                        <FiShoppingCart />
                        Sepet ({cart.length})
                      </h3>
                      
                      {cart.length === 0 ? (
                        <p className="text-base-content/60 text-center py-4">Sepetiniz boş</p>
                      ) : (
                        <div className="space-y-2">
                          {cart.map(item => (
                            <div key={item.menuItemId} className="flex justify-between items-center p-2 bg-base-100 rounded">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-base-content/70">{item.price} ₺</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => removeFromCart(item.menuItemId)}
                                >
                                  <FiMinus />
                                </button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, image: item.image })}
                                >
                                  <FiPlus />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between font-bold">
                              <span>Toplam:</span>
                              <span>{cartTotal} ₺</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Müşteri Bilgileri */}
                  <div className="card bg-base-200">
                    <div className="card-body p-4">
                      <h4 className="font-semibold mb-3">Müşteri Bilgileri (Opsiyonel)</h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Müşteri Adı"
                          className="input input-sm w-full"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                          type="tel"
                          placeholder="Telefon"
                          className="input input-sm w-full"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        />
                        <textarea
                          placeholder="Özel Notlar"
                          className="textarea textarea-sm w-full"
                          rows="2"
                          value={customerInfo.notes}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sipariş Ver Butonu */}
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleCreateOrder}
                    disabled={cart.length === 0 || creatingOrder}
                  >
                    {creatingOrder ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Sipariş Veriliyor...
                      </>
                    ) : (
                      `Sipariş Ver (${cartTotal} ₺)`
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Ana Ekran
            <>
              <div className="mb-6">
                {/* Masa Durumu */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(table.status)}`}></div>
                    <span className="font-medium">{getStatusText(table.status)}</span>
                  </div>
                </div>
                
                {/* Eylem Butonları */}
                <div className="flex flex-wrap gap-2">
                  {table.status === 'available' ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowOrderForm(true)}
                    >
                      <FiPlus className="mr-1" />
                      Sipariş Ver
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowPaymentQR(true)}
                    >
                      <FiSquare className="mr-1" />
                      QR ile Öde
                    </button>
                  )}
                </div>
              </div>
              
              {/* Siparişler */}
              <div className="bg-base-200 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-bold border-b pb-2 mb-4">
                  {table.status === 'available' ? 'Aktif Siparişler' : 'Tüm Siparişler'}
                </h3>
                
                {loadingOrders ? (
                  <div className="text-center py-4">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-2">Siparişler yükleniyor...</p>
                  </div>
                ) : tableOrders.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-base-content/70">
                      {table.status === 'available' 
                        ? 'Bu masada aktif sipariş bulunmuyor' 
                        : 'Bu masada henüz sipariş bulunmuyor'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {Array.isArray(tableOrders) ? tableOrders.map(order => (
                    <div key={order.id} className="bg-base-100 p-4 rounded-lg mb-4 border">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">Sipariş #{order.orderNumber}</span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusText(order.status)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Sipariş Öğeleri */}
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-base-200 rounded">
                            <div>
                              <span className="font-medium">{item.menuItemName || item.name}</span>
                              {item.specialInstructions && (
                                <p className="text-xs text-base-content/60 italic">
                                  Not: {item.specialInstructions}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{item.quantity}x {item.price}₺</div>
                              <div className="text-sm text-base-content/70">
                                = {item.quantity * item.price}₺
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Müşteri Bilgileri */}
                      {order.customerInfo && (order.customerInfo.name || order.customerInfo.phone) && (
                        <div className="bg-base-200 p-2 rounded mb-3">
                          <p className="text-sm font-medium">Müşteri Bilgileri:</p>
                          {order.customerInfo.name && (
                            <p className="text-sm">İsim: {order.customerInfo.name}</p>
                          )}
                          {order.customerInfo.phone && (
                            <p className="text-sm">Telefon: {order.customerInfo.phone}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Özel İstekler */}
                      {order.specialRequests && (
                        <div className="bg-base-200 p-2 rounded mb-3">
                          <p className="text-sm font-medium">Özel İstekler:</p>
                          <p className="text-sm">{order.specialRequests}</p>
                        </div>
                      )}
                      
                      {/* Sipariş Özeti */}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-base-content/70">
                              Sipariş Zamanı: {formatOrderTime(order.createdAt)}
                            </p>
                            <p className="text-sm text-base-content/70">
                              {order.items?.length || 0} öğe
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              Toplam: {order.totalAmount}₺
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4">
                      <p className="text-error">Sipariş verileri yüklenemedi</p>
                    </div>
                  )}
                  </>
                )}
              </div>
              
              {/* Durum Değiştirme Butonları (Admin için) */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Masa Durumunu Değiştir</h3>
                {(isUpdating || updatingOrderStatus) && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-base-content/70">
                    <span className="loading loading-spinner loading-sm"></span>
                    Güncelleniyor...
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button 
                    className={`btn btn-sm ${table.status === 'ordered' ? 'btn-disabled' : 'btn-primary'}`}
                    onClick={() => handleStatusChange('ordered')}
                    disabled={isUpdating || updatingOrderStatus || table.status === 'ordered'}
                  >
                    Sipariş Alındı
                  </button>
                  <button 
                    className={`btn btn-sm ${table.status === 'preparing' ? 'btn-disabled' : 'btn-warning'}`}
                    onClick={() => handleStatusChange('preparing')}
                    disabled={isUpdating || updatingOrderStatus || table.status === 'preparing'}
                  >
                    Hazırlanıyor
                  </button>
                  <button 
                    className={`btn btn-sm ${table.status === 'delivered' ? 'btn-disabled' : 'btn-success'}`}
                    onClick={() => handleStatusChange('delivered')}
                    disabled={isUpdating || updatingOrderStatus || table.status === 'delivered'}
                  >
                    Teslim Edildi
                  </button>
                  <button 
                    className="btn btn-sm btn-error"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isUpdating || updatingOrderStatus}
                  >
                    Masa Kalktı
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableModal; 