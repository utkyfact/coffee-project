import React, { useState, useEffect } from 'react';
import { 
  collection,
  query,
  onSnapshot,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiUsers, 
  FiClock, 
  FiCalendar, 
  FiBarChart2, 
  FiPieChart, 
  FiDownload, 
  FiFilter,
  FiCoffee,
  FiShoppingCart,
  FiStar,
  FiMapPin
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

// Raporlar bileşeni
const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // today, week, month, year
  const [selectedReport, setSelectedReport] = useState('overview'); // overview, sales, products, employees, customers
  
  // State'ler
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Firebase'den verileri çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Firebase'den siparişleri çek
        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const ordersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setOrders(ordersData);
        });

        // Firebase'den menü öğelerini çek
        const menuQuery = query(collection(db, 'menuItems'), orderBy('name'));
        const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
          const menuData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMenuItems(menuData);
        });

        // Firebase'den kullanıcıları çek
        const usersQuery = query(collection(db, 'users'), orderBy('name'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(usersData);
        });

        setIsLoading(false);

        return () => {
          unsubscribeOrders();
          unsubscribeMenu();
          unsubscribeUsers();
        };
      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Seçilen periyoda göre siparişleri filtrele
  const getFilteredOrders = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let startDate;
    switch (selectedPeriod) {
      case 'today':
        startDate = startOfDay;
        break;
      case 'week':
        startDate = startOfWeek;
        break;
      case 'month':
        startDate = startOfMonth;
        break;
      case 'year':
        startDate = startOfYear;
        break;
      default:
        startDate = startOfDay;
    }

    return orders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      return orderDate >= startDate;
    });
  };

  // Satış verilerini hesapla
  const calculateSalesData = () => {
    const filteredOrders = getFilteredOrders();
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Büyüme hesaplama (basit karşılaştırma)
    const previousPeriodOrders = orders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const now = new Date();
      const startOfCurrentPeriod = new Date();
      const startOfPreviousPeriod = new Date();

      switch (selectedPeriod) {
        case 'today':
          startOfCurrentPeriod.setHours(0, 0, 0, 0);
          startOfPreviousPeriod.setDate(startOfPreviousPeriod.getDate() - 1);
          startOfPreviousPeriod.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startOfCurrentPeriod.setDate(startOfCurrentPeriod.getDate() - startOfCurrentPeriod.getDay());
          startOfPreviousPeriod.setDate(startOfPreviousPeriod.getDate() - startOfPreviousPeriod.getDay() - 7);
          break;
        case 'month':
          startOfCurrentPeriod.setDate(1);
          startOfPreviousPeriod.setMonth(startOfPreviousPeriod.getMonth() - 1);
          startOfPreviousPeriod.setDate(1);
          break;
        case 'year':
          startOfCurrentPeriod.setMonth(0, 1);
          startOfPreviousPeriod.setFullYear(startOfPreviousPeriod.getFullYear() - 1);
          startOfPreviousPeriod.setMonth(0, 1);
          break;
      }

      return orderDate >= startOfPreviousPeriod && orderDate < startOfCurrentPeriod;
    });

    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrder: avgOrder,
      growth: growth
    };
  };

  // En çok satan ürünleri hesapla
  const calculateTopProducts = () => {
    const filteredOrders = getFilteredOrders();
    const productSales = {};

    filteredOrders.forEach(order => {
      // Siparişteki her ürünü işle
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.menuItemName || item.name || 'Bilinmeyen Ürün';
          if (!productSales[productName]) {
            productSales[productName] = { sales: 0, revenue: 0 };
          }
          productSales[productName].sales += item.quantity || 1;
          productSales[productName].revenue += (item.price || 0) * (item.quantity || 1);
        });
      } else {
        // Eski format için fallback
        const productName = order.menuItemName || 'Bilinmeyen Ürün';
        if (!productSales[productName]) {
          productSales[productName] = { sales: 0, revenue: 0 };
        }
        productSales[productName].sales += 1;
        productSales[productName].revenue += order.totalAmount || 0;
      }
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue,
        trend: 'up' // Basit trend hesaplama
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6);
  };



  // Saatlik verileri hesapla
  const calculateHourlyData = () => {
    const filteredOrders = getFilteredOrders();
    const hourlySales = {};

    filteredOrders.forEach(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const hour = orderDate.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;

      if (!hourlySales[hourKey]) {
        hourlySales[hourKey] = { sales: 0, orders: 0 };
      }
      hourlySales[hourKey].sales += order.totalAmount || 0;
      hourlySales[hourKey].orders += 1;
    });

    // 8:00-19:00 arası saatleri doldur
    const result = [];
    for (let hour = 8; hour <= 19; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      result.push({
        hour: hourKey,
        sales: hourlySales[hourKey]?.sales || 0,
        orders: hourlySales[hourKey]?.orders || 0
      });
    }

    return result;
  };

  // Kategori verilerini hesapla
  const calculateCategoryData = () => {
    const filteredOrders = getFilteredOrders();
    const categorySales = {};

    filteredOrders.forEach(order => {
      // Siparişteki her ürünü işle
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          // Menü öğelerinden kategori bilgisini bul
          const menuItem = menuItems.find(mi => mi.id === item.menuItemId || mi.name === item.menuItemName);
          const category = menuItem?.category || 'Diğer';
          
          if (!categorySales[category]) {
            categorySales[category] = 0;
          }
          categorySales[category] += (item.price || 0) * (item.quantity || 1);
        });
      } else {
        // Eski format için fallback
        const category = order.category || 'Diğer';
        if (!categorySales[category]) {
          categorySales[category] = 0;
        }
        categorySales[category] += order.totalAmount || 0;
      }
    });

    const totalSales = Object.values(categorySales).reduce((sum, sales) => sum + sales, 0);
    const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-success', 'bg-warning', 'bg-error'];

    return Object.entries(categorySales)
      .map(([category, sales], index) => ({
        category,
        sales,
        percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.sales - a.sales);
  };

  const currentData = calculateSalesData();
  const topProducts = calculateTopProducts();
  const hourlyData = calculateHourlyData();
  const categoryData = calculateCategoryData();

  const getPeriodText = (period) => {
    switch(period) {
      case 'today': return 'Bugün';
      case 'week': return 'Bu Hafta';
      case 'month': return 'Bu Ay';
      case 'year': return 'Bu Yıl';
      default: return 'Bugün';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Excel raporu indir
  const downloadReport = () => {
    try {
      const filteredOrders = getFilteredOrders();
      const periodText = getPeriodText(selectedPeriod);
      const currentDate = new Date().toLocaleDateString('tr-TR');
      
      // Ürün satış verilerini hazırla
      const productSales = {};
      
      filteredOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const productName = item.menuItemName || item.name || 'Bilinmeyen Ürün';
            if (!productSales[productName]) {
              productSales[productName] = { 
                quantity: 0, 
                totalPrice: 0,
                unitPrice: item.price || 0
              };
            }
            productSales[productName].quantity += item.quantity || 1;
            productSales[productName].totalPrice += (item.price || 0) * (item.quantity || 1);
          });
        }
      });

      // Excel için veri hazırla
      const reportData = [
        // Başlık satırı
        ['KAHVE DÜKKANI SATIŞ RAPORU'],
        [''],
        [`Rapor Tarihi: ${currentDate}`],
        [`Dönem: ${periodText}`],
        [''],
        
        // Özet bilgiler
        ['ÖZET BİLGİLER'],
        ['Toplam Gelir', formatCurrency(currentData.revenue)],
        ['Toplam Sipariş', currentData.orders],
        ['Ortalama Sipariş Tutarı', formatCurrency(currentData.avgOrder)],
        ['Büyüme Oranı', `${currentData.growth.toFixed(1)}%`],
        [''],
        
        // Ürün detayları başlığı
        ['ÜRÜN DETAYLARI'],
        ['Ürün Adı', 'Adet', 'Birim Fiyat', 'Toplam Fiyat'],
        
        // Ürün verileri
        ...Object.entries(productSales).map(([productName, data]) => [
          productName,
          data.quantity,
          formatCurrency(data.unitPrice),
          formatCurrency(data.totalPrice)
        ]),
        
        [''],
        ['TOPLAM'],
        ['', 
         Object.values(productSales).reduce((sum, data) => sum + data.quantity, 0),
         '',
         formatCurrency(Object.values(productSales).reduce((sum, data) => sum + data.totalPrice, 0))
        ]
      ];

      // Excel dosyası oluştur
      const ws = XLSX.utils.aoa_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Satış Raporu');

      // Sütun genişliklerini ayarla
      ws['!cols'] = [
        { width: 30 }, // Ürün Adı
        { width: 10 }, // Adet
        { width: 15 }, // Birim Fiyat
        { width: 15 }  // Toplam Fiyat
      ];

      // Dosya adı oluştur
      const fileName = `Kahve_Dukkani_Satis_Raporu_${periodText.replace(/\s+/g, '_')}_${currentDate.replace(/\//g, '-')}.xlsx`;

      // Dosyayı indir
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Raporlar yükleniyor...</span>
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
          <h2 className="text-2xl font-bold">Raporlar ve Analizler</h2>
          <p className="text-base-content/70">İşletme performansını takip edin</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="dropdown w-full sm:w-auto">
            <label tabIndex={0} className="btn btn-outline btn-sm w-full sm:w-auto">
              <FiFilter className="mr-2" />
              {getPeriodText(selectedPeriod)}
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><button onClick={() => setSelectedPeriod('today')}>Bugün</button></li>
              <li><button onClick={() => setSelectedPeriod('week')}>Bu Hafta</button></li>
              <li><button onClick={() => setSelectedPeriod('month')}>Bu Ay</button></li>
              <li><button onClick={() => setSelectedPeriod('year')}>Bu Yıl</button></li>
            </ul>
          </div>
          
          <button 
            className="btn btn-primary btn-sm w-full sm:w-auto"
            onClick={downloadReport}
          >
            <FiDownload className="mr-2" />
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-primary">
            <FiDollarSign size={24} />
          </div>
          <div className="stat-title">Toplam Gelir</div>
          <div className="stat-value text-primary">{formatCurrency(currentData.revenue)}</div>
          <div className="stat-desc flex items-center">
            {currentData.growth >= 0 ? (
              <FiTrendingUp className="text-success mr-1" />
            ) : (
              <FiTrendingDown className="text-error mr-1" />
            )}
            {Math.abs(currentData.growth).toFixed(1)}% {currentData.growth >= 0 ? 'artış' : 'azalış'}
          </div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-secondary">
            <FiShoppingCart size={24} />
          </div>
          <div className="stat-title">Toplam Sipariş</div>
          <div className="stat-value text-secondary">{currentData.orders}</div>
          <div className="stat-desc">Ortalama {formatCurrency(currentData.avgOrder)}</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-accent">
            <FiUsers size={24} />
          </div>
          <div className="stat-title">Aktif Çalışan</div>
          <div className="stat-value text-accent">{users.filter(u => u.onShift).length}</div>
          <div className="stat-desc">Vardiyada</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-success">
            <FiStar size={24} />
          </div>
          <div className="stat-title">Ortalama Puan</div>
          <div className="stat-value text-success">
            {users.length > 0 ? (users.reduce((sum, u) => sum + (u.customerRating || 0), 0) / users.length).toFixed(1) : 0}
          </div>
          <div className="stat-desc">5 üzerinden</div>
        </div>
      </div>

      {/* Top Products Chart */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">
            <FiCoffee className="mr-2" />
            Satılan Ürünler
          </h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-sm opacity-70">
                      <span className="badge badge-primary badge-sm mr-2">{product.sales} adet</span>
                      satıldı
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatCurrency(product.revenue)}</div>
                  <div className="text-sm opacity-70">
                    {product.trend === 'up' ? (
                      <div className="flex items-center gap-1">
                        <FiTrendingUp className="text-success" />
                        <span>Yükseliş</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <FiTrendingDown className="text-error" />
                        <span>Düşüş</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Sales Chart */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">
            <FiClock className="mr-2" />
            Saatlik Satış Grafiği
          </h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-64 p-4">
              {hourlyData.map((data, index) => {
                const maxSales = Math.max(...hourlyData.map(d => d.sales));
                const height = maxSales > 0 ? (data.sales / maxSales) * 100 : 0;
                
                return (
                  <div key={data.hour} className="flex flex-col items-center flex-1">
                    <div className="text-xs mb-2">{data.orders}</div>
                    <div 
                      className="bg-primary rounded-t w-full transition-all duration-300 hover:bg-primary-focus"
                      style={{ height: `${height}%` }}
                      title={`${data.hour}: ${formatCurrency(data.sales)} (${data.orders} sipariş)`}
                    ></div>
                    <div className="text-xs mt-2">{data.hour}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">
            <FiPieChart className="mr-2" />
            Kategori Dağılımı
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {categoryData.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${category.color}`}></div>
                    <div>
                      <div className="font-semibold">{category.category}</div>
                      <div className="text-sm opacity-70">{category.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="font-bold">{formatCurrency(category.sales)}</div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {categoryData.map((category, index) => {
                    const total = categoryData.reduce((sum, cat) => sum + cat.percentage, 0);
                    const startAngle = categoryData.slice(0, index).reduce((sum, cat) => sum + (cat.percentage / total) * 360, 0);
                    const endAngle = startAngle + (category.percentage / total) * 360;
                    
                    const x1 = 50 + 40 * Math.cos(startAngle * Math.PI / 180);
                    const y1 = 50 + 40 * Math.sin(startAngle * Math.PI / 180);
                    const x2 = 50 + 40 * Math.cos(endAngle * Math.PI / 180);
                    const y2 = 50 + 40 * Math.sin(endAngle * Math.PI / 180);
                    
                    const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;
                    
                    return (
                      <path
                        key={category.category}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        className={category.color.replace('bg-', 'fill-')}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 