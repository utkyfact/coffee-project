// Firebase Timestamp'leri normal Date objelerine çeviren utility fonksiyonları

/**
 * Firebase Timestamp'i normal Date objesine çevirir
 * @param {any} timestamp - Firebase Timestamp veya normal değer
 * @returns {Date|any} - Date objesi veya orijinal değer
 */
export const convertTimestamp = (timestamp) => {
  if (!timestamp) return timestamp;
  
  // Firebase Timestamp objesi ise Date'e çevir
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Zaten Date objesi ise olduğu gibi döndür
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // String ise Date'e çevirmeyi dene
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Number ise timestamp olarak kabul et
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // Diğer durumlarda olduğu gibi döndür
  return timestamp;
};

/**
 * Obje içindeki tüm Timestamp'leri Date objelerine çevirir
 * @param {Object} obj - Çevrilecek obje
 * @returns {Object} - Timestamp'leri Date'e çevrilmiş obje
 */
export const serializeFirebaseData = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Array ise her elemanı işle
  if (Array.isArray(obj)) {
    return obj.map(item => serializeFirebaseData(item));
  }
  
  // Obje ise her property'yi işle
  const serialized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      // Timestamp kontrolü
      if (value && typeof value.toDate === 'function') {
        serialized[key] = value.toDate();
      } else {
        // Nested obje ise recursive olarak işle
        serialized[key] = serializeFirebaseData(value);
      }
    } else {
      serialized[key] = value;
    }
  }
  
  return serialized;
};

/**
 * Kullanıcı verilerini serileştirir
 * @param {Object} userData - Firebase'den gelen kullanıcı verisi
 * @returns {Object} - Serileştirilmiş kullanıcı verisi
 */
export const serializeUserData = (userData) => {
  if (!userData) return userData;
  
  return serializeFirebaseData(userData);
};

/**
 * Sipariş verilerini serileştirir
 * @param {Object} orderData - Firebase'den gelen sipariş verisi
 * @returns {Object} - Serileştirilmiş sipariş verisi
 */
export const serializeOrderData = (orderData) => {
  if (!orderData) return orderData;
  
  return serializeFirebaseData(orderData);
};

/**
 * Tarih formatını Türkçe'ye çevirir
 * @param {Date|any} date - Tarih objesi
 * @param {Object} options - Format seçenekleri
 * @returns {string} - Formatlanmış tarih
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = convertTimestamp(date);
  if (!dateObj || !(dateObj instanceof Date)) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return dateObj.toLocaleDateString('tr-TR', { ...defaultOptions, ...options });
};

/**
 * Tarih arasındaki farkı hesaplar
 * @param {Date|any} startDate - Başlangıç tarihi
 * @param {Date|any} endDate - Bitiş tarihi (opsiyonel, şu an varsayılan)
 * @returns {Object} - Fark bilgileri
 */
export const getTimeDifference = (startDate, endDate = new Date()) => {
  const start = convertTimestamp(startDate);
  const end = convertTimestamp(endDate);
  
  if (!start || !end) return null;
  
  const diff = end.getTime() - start.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    totalMinutes: minutes,
    totalHours: hours,
    totalDays: days,
    formatted: `${hours} saat ${minutes % 60} dakika`
  };
}; 