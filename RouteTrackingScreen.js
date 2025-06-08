import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GOOGLE_MAPS_KEY } from '@env';
const { API_URLS } = require('./config');

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const RouteTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { routeData } = route.params;
  const mapRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasValidData, setHasValidData] = useState(false);

  useEffect(() => {
    fetchRouteLocation();
    
    // Configurar actualización automática cada 60 segundos
    const interval = setInterval(() => {
      if (hasValidData) { // Solo actualizar si tenemos datos válidos
        fetchRouteLocation(true); // true indica que es una actualización automática
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [hasValidData]);

  // Solo ajustar el mapa en la carga inicial o cuando el usuario hace refresh manual
  useEffect(() => {
    if (trackingData && mapRef.current && isInitialLoad) {
      const currentLocation = {
        latitude: parseFloat(trackingData.current_latitude),
        longitude: parseFloat(trackingData.current_longitude),
      };
      const endLocation = {
        latitude: parseFloat(trackingData.end_latitude),
        longitude: parseFloat(trackingData.end_longitude),
      };

      // Solo ajustar el mapa en la primera carga
      mapRef.current.fitToCoordinates([currentLocation, endLocation], {
        edgePadding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
      
      setIsInitialLoad(false);
    }
  }, [trackingData, isInitialLoad]);

  const validateLocationData = (data) => {
    console.log('🔍 ========== INICIANDO VALIDACIÓN ==========');
    
    if (!data) {
      console.error('❌ No se recibieron datos para validar');
      return { isValid: false, message: 'No se recibieron datos de la ruta' };
    }
    
    console.log('📊 Validando datos recibidos...');
    const missingFields = [];
    
    // Validar ubicación actual del bus
    console.log('🚌 Validando ubicación actual del bus...');
    if (!data.current_latitude || isNaN(parseFloat(data.current_latitude))) {
      console.warn('⚠️ current_latitude faltante o inválida:', data.current_latitude);
      missingFields.push('current_latitude');
    } else {
      console.log('✅ current_latitude válida:', data.current_latitude);
    }
    
    if (!data.current_longitude || isNaN(parseFloat(data.current_longitude))) {
      console.warn('⚠️ current_longitude faltante o inválida:', data.current_longitude);
      missingFields.push('current_longitude');
    } else {
      console.log('✅ current_longitude válida:', data.current_longitude);
    }
    
    // Validar ubicación de destino
    console.log('🏫 Validando ubicación de destino...');
    if (!data.end_latitude || isNaN(parseFloat(data.end_latitude))) {
      console.warn('⚠️ end_latitude faltante o inválida:', data.end_latitude);
      missingFields.push('end_latitude');
    } else {
      console.log('✅ end_latitude válida:', data.end_latitude);
    }
    
    if (!data.end_longitude || isNaN(parseFloat(data.end_longitude))) {
      console.warn('⚠️ end_longitude faltante o inválida:', data.end_longitude);
      missingFields.push('end_longitude');
    } else {
      console.log('✅ end_longitude válida:', data.end_longitude);
    }
    
    console.log('📋 Campos faltantes o inválidos:', missingFields);
    
    if (missingFields.length === 0) {
      console.log('✅ Todos los campos de ubicación son válidos');
      return { isValid: true, message: null };
    }
    
    // Generar mensajes específicos según qué falte
    let message = '';
    const hasCurrentIssues = missingFields.some(field => field.includes('current_'));
    const hasEndIssues = missingFields.some(field => field.includes('end_'));
    
    console.log('🔍 Análisis de problemas:');
    console.log('🚌 Problemas con ubicación actual:', hasCurrentIssues);
    console.log('🏫 Problemas con ubicación destino:', hasEndIssues);
    
    if (hasCurrentIssues && hasEndIssues) {
      message = 'No se tienen datos de ubicación actual del bus ni del destino';
      console.warn('❌ Error: Faltan ambas ubicaciones');
    } else if (hasCurrentIssues) {
      message = 'Aún no se tienen datos de la ubicación actual del bus';
      console.warn('❌ Error: Falta ubicación actual del bus');
    } else if (hasEndIssues) {
      message = 'No se tienen datos de la ubicación de destino';
      console.warn('❌ Error: Falta ubicación de destino');
    }
    
    console.log('📝 Mensaje de error generado:', message);
    console.log('🔍 ========== FIN VALIDACIÓN ==========');
    
    return { isValid: false, message };
  };

  const fetchRouteLocation = async (isAutoUpdate = false) => {
    if (isAutoUpdate) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setIsInitialLoad(!hasValidData); // Si es manual y no teníamos datos válidos, es como inicial
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      console.log('🔄 Fetching route location data...');
      console.log('📍 Route ID:', routeData.id);
      console.log('🌐 API URL:', API_URLS.ROUTE_TRACKING(routeData.id));
      console.log('🔄 Is auto update:', isAutoUpdate);

      const response = await fetch(API_URLS.ROUTE_TRACKING(routeData.id), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        throw new Error(`Error ${response.status}: No se pudo obtener la ubicación de la ruta`);
      }

      const result = await response.json();
      
      // ========== LOGS DETALLADOS DE TODOS LOS DATOS ==========
      console.log('📊 ========== DATOS COMPLETOS RECIBIDOS ==========');
      console.log('🔍 Raw response data:', JSON.stringify(result, null, 2));
      console.log('');
      
      console.log('📋 ========== ANÁLISIS DE CAMPOS ==========');
      console.log('🆔 ID de ruta:', result.id);
      console.log('📛 Título de ruta:', result.title);
      console.log('🚦 Estado de ruta:', result.status);
      console.log('');
      
      console.log('🚌 ========== UBICACIÓN ACTUAL DEL BUS ==========');
      console.log('🌐 Latitud actual:', result.current_latitude);
      console.log('🌐 Longitud actual:', result.current_longitude);
      console.log('📍 Coordenadas actuales válidas:', 
        result.current_latitude && !isNaN(parseFloat(result.current_latitude)) &&
        result.current_longitude && !isNaN(parseFloat(result.current_longitude))
      );
      console.log('');
      
      console.log('🏫 ========== UBICACIÓN DE DESTINO ==========');
      console.log('📍 Nombre destino:', result.end_location_name);
      console.log('🌐 Latitud destino:', result.end_latitude);
      console.log('🌐 Longitud destino:', result.end_longitude);
      console.log('📍 Coordenadas destino válidas:', 
        result.end_latitude && !isNaN(parseFloat(result.end_latitude)) &&
        result.end_longitude && !isNaN(parseFloat(result.end_longitude))
      );
      console.log('');
      
      console.log('⏰ ========== INFORMACIÓN TEMPORAL ==========');
      console.log('🕒 Actualizado en servidor:', result.updated_at);
      console.log('🕒 Timestamp local:', new Date().toISOString());
      console.log('');
      
      console.log('🔍 ========== CAMPOS ADICIONALES ==========');
      Object.keys(result).forEach(key => {
        if (!['id', 'title', 'status', 'current_latitude', 'current_longitude', 
              'end_location_name', 'end_latitude', 'end_longitude', 'updated_at'].includes(key)) {
          console.log(`📌 ${key}:`, result[key]);
        }
      });
      console.log('');
      
      // Validar que los datos de ubicación sean válidos
      const validation = validateLocationData(result);
      console.log('✅ ========== VALIDACIÓN DE DATOS ==========');
      console.log('🔍 Validación exitosa:', validation.isValid);
      if (!validation.isValid) {
        console.error('❌ Error de validación:', validation.message);
        console.log('');
      }
      
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      console.log('✅ Datos válidos - Actualizando estado...');
      setTrackingData(result);
      setLastUpdated(new Date());
      setError(null);
      setHasValidData(true);
      
      console.log('✅ Estado actualizado exitosamente');
      console.log('📊 ========================================');
      
    } catch (err) {
      console.error('❌ ========== ERROR EN TRACKING ==========');
      console.error('💥 Error type:', err.name);
      console.error('💥 Error message:', err.message);
      console.error('💥 Error stack:', err.stack);
      console.error('🔄 Is auto update:', isAutoUpdate);
      console.error('📊 =====================================');
      
      if (!isAutoUpdate) {
        // Solo mostrar error en actualizaciones manuales
        setError(err.message);
        Alert.alert(
          'Datos Incompletos', 
          err.message,
          [{ text: 'OK' }]
        );
      } else {
        // En actualizaciones automáticas, solo loguear el error
        console.warn('⚠️ Actualización automática falló:', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 Fetch route location completed');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'pending':
        return '#FFA000';
      case 'inactive':
        return '#FF5252';
      default:
        return '#666666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'pending':
        return 'En progreso';
      case 'inactive':
        return 'Inactiva';
      default:
        return status;
    }
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-PA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleRefresh = () => {
    setIsInitialLoad(false); // No reajustar el zoom en refresh manual
    fetchRouteLocation();
  };

  // Loading inicial
  if (loading && !trackingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando ubicación de la ruta...</Text>
      </View>
    );
  }

  // Error sin datos previos
  if (error && !trackingData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorTitle}>Sin Conexión</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback si no hay datos válidos
  if (!trackingData || !validateLocationData(trackingData).isValid) {
    const validation = validateLocationData(trackingData);
    const errorMessage = validation.message || 'No se pueden mostrar los datos de ubicación de esta ruta en este momento.';
    
    // Determinar ícono y color según el tipo de error
    let iconName = "location-outline";
    let iconColor = "#FFA000";
    let titleText = "Datos No Disponibles";
    
    if (errorMessage.includes('Aún no se tienen datos de la ubicación actual')) {
      iconName = "bus-outline";
      iconColor = "#007AFF";
      titleText = "Esperando Ubicación del Bus";
    } else if (errorMessage.includes('destino')) {
      iconName = "flag-outline";
      iconColor = "#FF3B30";
      titleText = "Error en Datos de Destino";
    } else if (errorMessage.includes('No se recibieron datos')) {
      iconName = "cloud-offline-outline";
      iconColor = "#666666";
      titleText = "Sin Datos del Servidor";
    }
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name={iconName} size={48} color={iconColor} />
        <Text style={[styles.errorTitle, { color: iconColor }]}>{titleText}</Text>
        <Text style={styles.errorText}>
          {errorMessage}
        </Text>
        {errorMessage.includes('Aún no se tienen datos de la ubicación actual') ? (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.waitingText}>
              El conductor debe iniciar la ruta para comenzar el tracking
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Intentar Nuevamente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const currentLocation = {
    latitude: parseFloat(trackingData.current_latitude),
    longitude: parseFloat(trackingData.current_longitude),
  };

  const endLocation = {
    latitude: parseFloat(trackingData.end_latitude),
    longitude: parseFloat(trackingData.end_longitude),
  };

  return (
    <View style={styles.container}>
      {/* Header con información de la ruta */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.routeTitle}>{trackingData.title}</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusBadgeColor(trackingData.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(trackingData.status)}
              </Text>
            </View>
            {refreshing && (
              <ActivityIndicator 
                size="small" 
                color="#007AFF" 
                style={styles.refreshIndicator}
              />
            )}
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.destinationText}>
            📍 Destino: {trackingData.end_location_name}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Última actualización: {formatLastUpdated(lastUpdated)}
          </Text>
        )}
        
        {error && trackingData && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#FFA000" />
            <Text style={styles.warningText}>
              Problema de conexión - Mostrando última ubicación conocida
            </Text>
          </View>
        )}
      </View>

      {/* Mapa - Solo se re-renderiza cuando cambian las coordenadas */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsCompass={true}
        showsScale={true}
        showsUserLocation={false}
        followsUserLocation={false}
        key={`${currentLocation.latitude}-${currentLocation.longitude}`} // Forzar re-render solo cuando cambian las coordenadas
      >
        {/* Marcador de ubicación actual del bus */}
        <Marker
          coordinate={currentLocation}
          title="Ubicación del Bus"
          description={`Ruta: ${trackingData.title}`}
          pinColor="#007AFF"
        >
          <View style={styles.busMarker}>
            <Ionicons name="bus" size={24} color="white" />
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>🚌 Bus en Ruta</Text>
              <Text style={styles.calloutText}>{trackingData.title}</Text>
              <Text style={styles.calloutStatus}>
                Estado: {getStatusText(trackingData.status)}
              </Text>
              {lastUpdated && (
                <Text style={styles.calloutTime}>
                  Actualizado: {formatLastUpdated(lastUpdated)}
                </Text>
              )}
            </View>
          </Callout>
        </Marker>

        {/* Marcador de destino */}
        <Marker
          coordinate={endLocation}
          title="Destino"
          description={trackingData.end_location_name}
          pinColor="#FF3B30"
        >
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>🏫 Destino</Text>
              <Text style={styles.calloutText}>{trackingData.end_location_name}</Text>
            </View>
          </Callout>
        </Marker>

        {/* Ruta desde ubicación actual hasta destino */}
        <MapViewDirections
          origin={currentLocation}
          destination={endLocation}
          apikey={GOOGLE_MAPS_KEY}
          strokeWidth={4}
          strokeColor="#007AFF"
          optimizeWaypoints={true}
          onError={(errorMessage) => {
            console.error('Error en la ruta:', errorMessage);
          }}
        />
      </MapView>

      {/* Footer con información adicional */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔄 Actualizando automáticamente cada 60 segundos
        </Text>
        {hasValidData && (
          <Text style={styles.footerSubText}>
            💡 Pellizca para hacer zoom • Arrastra para moverte
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshIndicator: {
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  destinationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 6,
    flex: 1,
  },
  map: {
    flex: 1,
  },
  busMarker: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutContainer: {
    padding: 10,
    minWidth: 150,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  calloutTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerSubText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  waitingText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});

export default RouteTrackingScreen; 