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

  useEffect(() => {
    fetchRouteLocation();
    
    // Configurar actualización automática cada 60 segundos
    const interval = setInterval(() => {
      fetchRouteLocation(true); // true indica que es una actualización automática
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Ajustar el mapa cuando cambian las ubicaciones
  useEffect(() => {
    if (trackingData && mapRef.current) {
      const currentLocation = {
        latitude: parseFloat(trackingData.current_latitude),
        longitude: parseFloat(trackingData.current_longitude),
      };
      const endLocation = {
        latitude: parseFloat(trackingData.end_latitude),
        longitude: parseFloat(trackingData.end_longitude),
      };

      // Ajustar el mapa para mostrar ambas ubicaciones
      mapRef.current.fitToCoordinates([currentLocation, endLocation], {
        edgePadding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  }, [trackingData]);

  const fetchRouteLocation = async (isAutoUpdate = false) => {
    if (isAutoUpdate) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch(API_URLS.ROUTE_TRACKING(routeData.id), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener la ubicación de la ruta');
      }

      const result = await response.json();
      setTrackingData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching route location:', err);
      if (!isAutoUpdate) {
        setError(err.message);
        Alert.alert('Error', 'No se pudo obtener la ubicación de la ruta');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    fetchRouteLocation();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando ubicación de la ruta...</Text>
      </View>
    );
  }

  if (error && !trackingData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trackingData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontraron datos de la ruta</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
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
      </View>

      {/* Mapa */}
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
  errorText: {
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
});

export default RouteTrackingScreen; 