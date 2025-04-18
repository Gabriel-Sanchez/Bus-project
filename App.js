import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen';
import DataListScreen from './DataListScreen';
import StudentsListScreen from './StudentsListScreen';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as React from 'react';
import { Marker, Polyline, Callout } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {GOOGLE_MAPS_KEY} from '@env'
import ContadorVelocidad from './componets/ContadorVelocidad';
import LocationTracker from './LocationTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const Stack = createNativeStackNavigator();
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

function HomeScreen({ route, navigation }) {
  const mapRef = React.useRef(null);
  const [origin, setOrigin] = React.useState(null);
  const [routeDetails, setRouteDetails] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState(null);
  const [routeStatus, setRouteStatus] = React.useState(route.params?.routeInfo?.status || 'inactive');

  const destination = route.params?.destination || {
    latitude: 33.753746,
    longitude: -84.386330,
  };

  const routeInfo = route.params?.routeInfo;

  const handleEndRoute = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No se encontró el token');
        Alert.alert('Error', 'No se encontró el token de autenticación');
        return;
      }

      if (!routeInfo?.id) {
        console.error('No se encontró el ID de la ruta');
        Alert.alert('Error', 'No se encontró la información de la ruta');
        return;
      }

      console.log('Enviando actualización de estado:', {
        routeId: routeInfo.id,
        status: 'inactive'
      });

      const response = await fetch(`https://6sqzxskf-9000.use2.devtunnels.ms/api/users/update-route-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          route_id: routeInfo.id,
          status: 'inactive' 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Error al actualizar el estado: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Estado actualizado correctamente:', responseData);

      setRouteStatus('inactive');
      await AsyncStorage.setItem('routeStatus', 'inactive');
      navigation.navigate('DataList');
    } catch (error) {
      console.error('Error al terminar la ruta:', error);
      Alert.alert(
        'Error', 
        'No se pudo terminar la ruta. Por favor, intente nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  // Función para centrar el mapa en la ubicación actual
  const centerMap = (location) => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }, 1000);
    }
  };

  // Función para ajustar el zoom para mostrar toda la ruta
  const fitToRoute = (originLoc, destinationLoc) => {
    if (mapRef.current && originLoc && destinationLoc) {
      mapRef.current.fitToCoordinates(
        [originLoc, destinationLoc],
        {
          edgePadding: {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50,
          },
          animated: true,
        }
      );
    }
  };

  React.useEffect(() => {
    let locationSubscription;

    const setupLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Se requiere permiso para acceder a la ubicación');
          return;
        }

        // Obtener la ubicación inicial
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        setOrigin(currentLocation);
        centerMap(currentLocation);

        // Suscribirse a actualizaciones de ubicación
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5
          },
          (newLocation) => {
            const updatedLocation = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude
            };
            setOrigin(updatedLocation);
          }
        );
      } catch (error) {
        setErrorMsg('Error al obtener la ubicación');
        console.error(error);
      }
    };

    setupLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Efecto para ajustar el mapa cuando cambia el origen o destino
  React.useEffect(() => {
    if (origin && destination) {
      fitToRoute(origin, destination);
    }
  }, [origin, destination]);

  if (!origin) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {routeInfo && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeTitle}>{routeInfo.title}</Text>
          <Text style={styles.routeSchedule}>🕒 {routeInfo.schedule}</Text>
          {routeDetails && (
            <View style={styles.etaContainer}>
              <Text style={styles.etaText}>
                ⏱️ Tiempo estimado: {Math.round(routeDetails.duration)} min
              </Text>
              <Text style={styles.distanceText}>
                📍 Distancia: {(routeDetails.distance).toFixed(1)} km
              </Text>
            </View>
          )}
          {routeStatus === 'pending' && (
            <TouchableOpacity 
              style={styles.endRouteButton}
              onPress={handleEndRoute}
            >
              <Text style={styles.endRouteButtonText}>Terminar Ruta</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        followsUserLocation={true}
      >
        <Marker
          coordinate={origin}
          title="Mi Ubicación"
          description="Ubicación actual"
        >
          <Callout>
            <View>
              <Text>Mi Ubicación Actual</Text>
              {routeDetails && (
                <Text>ETA: {Math.round(routeDetails.duration)} min</Text>
              )}
            </View>
          </Callout>
        </Marker>
        
        <Marker
          coordinate={destination}
          title="Destino"
          description={routeInfo?.description || "Punto de destino"}
          pinColor="#FF3B30"
        >
          <Callout>
            <View>
              <Text>{routeInfo?.title || "Destino"}</Text>
              <Text>{routeInfo?.description}</Text>
            </View>
          </Callout>
        </Marker>

        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_KEY}
          strokeWidth={5}
          strokeColor="#007AFF"
          optimizeWaypoints={true}
          onStart={(params) => {
            console.log(`Iniciando navegación: ${params}`);
          }}
          onReady={result => {
            setRouteDetails({
              distance: result.distance,
              duration: result.duration
            });
          }}
          onError={(errorMessage) => {
            console.error('Error en la ruta:', errorMessage);
          }}
        />
      </MapView>

      <ContadorVelocidad />

      {routeStatus === 'pending' && origin && (
        <LocationTracker 
          routeId={routeInfo.id} 
          currentLocation={origin}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="DataList" 
          component={DataListScreen}
          options={{ 
            title: 'Rutas Disponibles',
            headerBackVisible: false
          }}
        />
        <Stack.Screen 
          name="StudentsList" 
          component={StudentsListScreen}
          options={({ route }) => ({ 
            title: route.params?.route?.title || 'Lista de Estudiantes',
            headerBackTitle: 'Rutas'
          })}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={({ route }) => ({ 
            title: route.params?.routeInfo?.title || 'Mapa',
            headerBackTitle: 'Rutas'
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  routeInfoContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  routeSchedule: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  etaContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  etaText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  endRouteButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  endRouteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
