import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const Menu = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const tableNumber = tableId ? parseInt(tableId) : null;
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  // State'ler
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  const [currentTable, setCurrentTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const menuContainerRef = useRef(null);
  const pageRefs = useRef([]);
  
  // Firebase'den masaları çek
  useEffect(() => {
    const tablesQuery = query(collection(db, 'tables'), orderBy('number'));
    
    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(tablesData);
      setTablesLoading(false);
    }, (error) => {
      console.error('Masalar yüklenirken hata:', error);
      setTablesLoading(false);
    });

    return () => unsubscribeTables();
  }, []);

  // Firebase'den menü öğelerini çek
  useEffect(() => {
    const menuQuery = query(collection(db, 'menuItems'), orderBy('name'));
    
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(menuData);
      setMenuLoading(false);
    }, (error) => {
      console.error('Menü yüklenirken hata:', error);
      setMenuLoading(false);
    });

    return () => unsubscribeMenu();
  }, []);

  // Firebase'den kategorileri çek
  useEffect(() => {
    const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
    
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
      setCategoriesLoading(false);
    }, (error) => {
      console.error('Kategoriler yüklenirken hata:', error);
      setCategoriesLoading(false);
    });

    return () => unsubscribeCategories();
  }, []);
  
  // Mobil cihaz kontrolü
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Page refs ayarlanması
  useEffect(() => {
    pageRefs.current = Array(categories.length).fill().map((_, i) => pageRefs.current[i] || React.createRef());
  }, [categories.length]);
  
  // Masa kontrolü - Firebase'den
  useEffect(() => {
    if (tables.length > 0 && tableNumber) {
      const foundTable = tables.find(t => t.number === tableNumber);
      if (foundTable) {
        setCurrentTable(foundTable);
      }
    }
  }, [tables, tableNumber]);
  
  // Mouse tekerleği ile yatay kaydırma
  useEffect(() => {
    const handleWheel = (e) => {
      if (!menuContainerRef.current) return;
      
      // Varsayılan dikey kaydırmayı engelle
      e.preventDefault();
      
      // Yatay kaydırma yapma
      menuContainerRef.current.scrollLeft += e.deltaY;
      
      // Aktif kategoriyi güncelle
      updateActiveCategory();
    };
    
    const updateActiveCategory = () => {
      if (!menuContainerRef.current) return;
      
      const containerWidth = menuContainerRef.current.clientWidth;
      const currentScroll = menuContainerRef.current.scrollLeft;
      const currentIndex = Math.round(currentScroll / containerWidth);
      
      if (currentIndex >= 0 && currentIndex < categories.length && currentIndex !== activeCategoryIndex) {
        setActiveCategoryIndex(currentIndex);
      }
    };
    
    const container = menuContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [activeCategoryIndex, categories.length]);
  
  // Mouse ile yatay kaydırma işlevselliği
  const handleMouseDown = (e) => {
    if (!menuContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - menuContainerRef.current.offsetLeft);
    setScrollLeft(menuContainerRef.current.scrollLeft);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !menuContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - menuContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Kaydırma hızı
    menuContainerRef.current.scrollLeft = scrollLeft - walk;
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    if (!menuContainerRef.current) return;
    
    // En yakın kategori sayfasını bul
    const containerWidth = menuContainerRef.current.clientWidth;
    const currentScroll = menuContainerRef.current.scrollLeft;
    const nearestPageIndex = Math.round(currentScroll / containerWidth);
    
    // Sayfayı o kategoriye kaydır
    menuContainerRef.current.scrollTo({
      left: nearestPageIndex * containerWidth,
      behavior: 'smooth'
    });
    
    setActiveCategoryIndex(nearestPageIndex);
  };
  
  // Dokunmatik olaylar (Touch events)
  const handleTouchStart = (e) => {
    if (!menuContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX - menuContainerRef.current.offsetLeft);
    setScrollLeft(menuContainerRef.current.scrollLeft);
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging || !menuContainerRef.current) return;
    const x = e.touches[0].clientX - menuContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    menuContainerRef.current.scrollLeft = scrollLeft - walk;
  };
  
  const handleTouchEnd = () => {
    handleMouseUp(); // Aynı mantık uygulanabilir
  };
  
  // Belirli bir kategoriye kaydırma
  const scrollToCategory = (index) => {
    if (!menuContainerRef.current) return;
    const containerWidth = menuContainerRef.current.clientWidth;
    menuContainerRef.current.scrollTo({
      left: index * containerWidth,
      behavior: 'smooth'
    });
    setActiveCategoryIndex(index);
  };
  
  // Scroll olayını dinle ve ilerleme çubuğunu güncelle
  useEffect(() => {
    const handleScroll = () => {
      if (!menuContainerRef.current) return;
      
      const container = menuContainerRef.current;
      const scrollWidth = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;
      const progress = (currentScroll / scrollWidth) * 100;
      
      setScrollProgress(progress);
      
      // Aktif kategoriyi güncelle
      const containerWidth = container.clientWidth;
      const currentIndex = Math.round(currentScroll / containerWidth);
      
      if (currentIndex >= 0 && currentIndex < categories.length && currentIndex !== activeCategoryIndex) {
        setActiveCategoryIndex(currentIndex);
      }
    };
    
    const container = menuContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeCategoryIndex, categories.length]);
  
  // Sepete ürün ekle
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };
  
  // Sepetten ürün çıkar
  const removeFromCart = (itemId) => {
    const existingItem = cart.find(cartItem => cartItem.id === itemId);
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(cartItem => 
        cartItem.id === itemId 
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      ));
    } else {
      setCart(cart.filter(cartItem => cartItem.id !== itemId));
    }
  };
  
  // Toplam tutarı hesapla
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // Siparişi tamamla - Firebase ile
  const completeOrder = async () => {
    if (!currentTable || cart.length === 0) {
      alert('Sepetiniz boş veya masa seçilmedi!');
      return;
    }
    
    try {
      setCreatingOrder(true);
      
      // Sipariş numarası oluştur
      const orderNumber = `ORD-${Date.now()}`;
      
      const orderData = {
        tableId: currentTable.id,
        tableNumber: currentTable.number,
        orderNumber: orderNumber,
        items: cart.map(item => ({
          menuItemId: item.id,
          menuItemName: item.name,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: ''
        })),
        customerInfo: customerName ? {
          name: customerName
        } : undefined,
        specialRequests: notes,
        totalAmount: calculateTotal(),
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Firebase'e sipariş ekle
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Masa durumunu otomatik olarak "pending" (sipariş alındı) yap
      const tableRef = doc(db, 'tables', currentTable.id);
      await updateDoc(tableRef, {
        status: 'pending',
        updatedAt: Timestamp.now(),
        lastOrderId: orderRef.id,
        lastOrderNumber: orderNumber
      });
            
      // Başarı mesajını göster
      setOrderSuccess(true);
      
      // Sepeti temizle
      setCart([]);
      setCustomerName('');
      setNotes('');
      
      // Global event dispatch et - OrderStatus sayfalarının yenilenmesi için
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
        detail: { 
          tableId: currentTable.id, 
          newOrder: true,
          orderId: orderRef.id,
          orderNumber: orderNumber
        } 
      }));
      
      // 2 saniye sonra sipariş takip sayfasına yönlendir
      setTimeout(() => {
        navigate(`/order-status/${currentTable.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      alert('Sipariş oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  // Yükleniyor durumu
  if (tablesLoading || menuLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Menü yükleniyor...</span>
      </div>
    );
  }

  // Masa bulunamadı
  if (!currentTable && !tablesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Kahve Dükkanı Menü</h1>
          <p className="text-xl">Masa {tableNumber || '?'}</p>
          <div className="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Bu masa numarası bulunamadı. Lütfen geçerli bir masa numarası ile tekrar deneyin.</span>
          </div>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => navigate('/')}
          >
            Ana Sayfaya Dön
          </button>
        </div>
        
        {/* Örnek menü gösterimi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.slice(0, 6).map((item) => (
            <div key={item.id} className="card bg-base-100 shadow">
              {item.image && (
                <figure className="h-48">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </figure>
              )}
              <div className="card-body">
                <h3 className="card-title">{item.name}</h3>
                <p className="text-sm text-base-content/70">{item.description}</p>
                <div className="card-actions justify-between items-center">
                  <span className="font-bold text-primary">{item.price} ₺</span>
                  <span className="badge badge-outline">{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (orderSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-base-100 p-4">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-3xl font-bold text-green-600 mb-2">Siparişiniz Alındı!</h2>
          <p className="text-base-content mb-4">Siparişiniz hazırlanmaya başlayacak. Afiyet olsun!</p>
          <p className="font-medium">Masa {currentTable.number}</p>
          <p className="text-sm text-base-content mt-8">Sipariş takip sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  // Kategori isimlerini al
  const categoryNames = [...new Set(menuItems.map(item => item.category))];
  
  return (
    <div className="flex flex-col h-screen bg-base-200 overflow-hidden">
      {/* Üst Bar */}
      <div className="bg-base-100 py-4 px-6 shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kahve Dükkanı</h1>
            <p className="text-sm">Masa {currentTable.number}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              Sepet: {cart.length} ürün | {calculateTotal()} ₺
            </span>
            <label htmlFor="cart-drawer" className="btn btn-sm btn-primary">
              Sepeti Gör
            </label>
          </div>
        </div>
      </div>
      
      {/* Kategori gösterge noktaları - Sadece büyük ekranlarda */}
      <div className="hidden md:flex py-2 justify-center items-center">
        {categoryNames.map((category, index) => (
          <button 
            key={index}
            onClick={() => scrollToCategory(index)}
            className={`mx-1 px-3 py-1 text-sm rounded-full transition-all ${
              activeCategoryIndex === index 
                ? 'bg-primary text-white font-medium' 
                : 'bg-base-300 hover:bg-base-300/80'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Sayfa Kaydırma İpucu */}
      <div className="text-center text-sm text-base-content/60 pb-2 animate-pulse">
        {isMobile ? (
          <span className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8m-4-8v16" />
            </svg>
            Sayfalar arasında geçiş için parmağınızla sağa/sola kaydırın
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Sayfalar arasında geçiş için farenizin tekerleğini kullanın veya sürükleyin
          </span>
        )}
      </div>
      
      {/* Yatay Kaydırmalı Menü Sayfaları */}
      <div 
        ref={menuContainerRef}
        className="flex-1 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          cursor: isDragging ? 'grabbing' : 'grab',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <div className="flex h-full">
          {categoryNames.map((category, index) => {
            const categoryItems = menuItems.filter(item => item.category === category);
            
            return (
              <div 
                key={index}
                ref={el => pageRefs.current[index] = el}
                className="flex-shrink-0 w-full h-full p-4 md:p-6 snap-center"
                style={{ scrollSnapAlign: 'center' }}
              >
                <div 
                  className="h-full w-full bg-base-100 rounded-lg shadow-lg p-4 md:p-6 overflow-y-auto"
                  style={{
                    backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 20%)",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05), inset 0 0 10px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className="border-b border-base-300 pb-1 mb-4">
                    <div className="text-2xl md:text-3xl font-bold mb-2 border-b pb-2 border-primary inline-block">
                      {category}
                    </div>
                    
                    {/* İlerleme çubuğu */}
                    <div className="w-full bg-base-300 h-1 rounded-full">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${scrollProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Kategori öğeleri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="card bg-base-200 shadow hover:shadow-lg transition-shadow">
                        {item.image && (
                          <figure className="h-32 md:h-40">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </figure>
                        )}
                        <div className="card-body p-4">
                          <h3 className="card-title text-lg">{item.name}</h3>
                          <p className="text-sm text-base-content/70 line-clamp-2">{item.description}</p>
                          <div className="card-actions justify-between items-center mt-2">
                            <span className="font-bold text-primary text-lg">{item.price} ₺</span>
                            <button 
                              onClick={() => addToCart(item)}
                              className="btn btn-primary btn-sm"
                            >
                              Sepete Ekle
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sepet Drawer */}
      <div className="drawer drawer-end">
        <input id="cart-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-side z-50">
          <label htmlFor="cart-drawer" className="drawer-overlay"></label>
          <div className="menu p-4 w-80 min-h-full bg-base-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Sepetiniz</h3>
              <label htmlFor="cart-drawer" className="btn btn-sm btn-circle">✕</label>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-center text-base-content/60">Sepetiniz boş</p>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-base-200 rounded">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-base-content/70">{item.price} ₺</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="btn btn-xs btn-outline"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart(item)}
                          className="btn btn-xs btn-outline"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Adınız (opsiyonel)"
                    className="input input-bordered w-full"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <textarea
                    placeholder="Özel notlar (opsiyonel)"
                    className="textarea textarea-bordered w-full"
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg mb-3">
                      <span>Toplam:</span>
                      <span>{calculateTotal()} ₺</span>
                    </div>
                    <button 
                      onClick={completeOrder}
                      disabled={creatingOrder}
                      className="btn btn-primary w-full"
                    >
                      {creatingOrder ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Sipariş Veriliyor...
                        </>
                      ) : (
                        'Siparişi Tamamla'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
