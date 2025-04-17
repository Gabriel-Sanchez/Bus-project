import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen';
import DataListScreen from './DataListScreen';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import * as React from 'react';
import { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {GOOGLE_MAPS_KEY} from '@env'
import ContadorVelocidad from './componets/ContadorVelocidad';

const Stack = createNativeStackNavigator();

function HomeScreen({ route, navigation }) {
  const [origin, setOrigin] = React.useState({
    latitude: 33.640411,
    longitude: -84.419853,
  });

  const destination = route.params?.destination || {
    latitude: 33.753746,
    longitude: -84.386330,
  };

  const routeInfo = route.params?.routeInfo;

  React.useEffect(() => {
    let locationSubscription;

    const setupLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Se requiere permiso para acceder a la ubicación');
        return;
      }

      // Obtener la ubicación inicial
      let location = await Location.getCurrentPositionAsync({});
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Suscribirse a actualizaciones de ubicación
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10
        },
        (newLocation) => {
          setOrigin({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          });
        }
      );
    };

    setupLocation();

    // Limpiar la suscripción cuando el componente se desmonte
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {routeInfo && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeTitle}>{routeInfo.title}</Text>
          <Text style={styles.routeSchedule}>🕒 {routeInfo.schedule}</Text>
        </View>
      )}
      <StatusBar style="auto" />
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.04
        }}
      >
        <Marker
          coordinate={origin}
          title="Mi Ubicación"
          description="Ubicación actual"
        />
        <Marker
          coordinate={destination}
          title="Destino"
          description={routeInfo?.description || "Punto de destino"}
          pinColor="#FF3B30"
        />

        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_KEY}
          strokeWidth={4}
          strokeColor="#007AFF"
        />
      </MapView>

      <ContadorVelocidad />
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
  }
});
