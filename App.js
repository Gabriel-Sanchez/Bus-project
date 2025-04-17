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

function HomeScreen() {
  const [origin, setOrigin] = React.useState(
    {
      latitude: 33.640411,
      longitude: -84.419853,
    }
  );
  const [destination, setDestination] = React.useState(
    {
      latitude: 33.753746,
      longitude: -84.386330,
    }
  );

  React.useEffect(()=>{
    getLocationPermission();
  }, [])

  async function getLocationPermission(){
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted' ){
      alert('permission denied')
      return;
    }
    let location = await Location.getCurrentPositionAsync({})
    const current = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    }
    setOrigin(current)
  }

 
  return (
    <View style={styles.container}>
      <Text>Mapas Geo</Text>
      <StatusBar style="auto" />
      <MapView style={styles.map} 
      initialRegion={{latitude: origin.latitude, 
      longitude: origin.longitude, 
    latitudeDelta: 0.09,
  longitudeDelta: 0.04}}
      
      >
        <Marker draggable
        coordinate={origin}
        onDragEnd={(direction) => setOrigin(direction.nativeEvent.coordinate)  } />

        <Marker draggable
        coordinate={destination}
        onDragEnd={(direction) => setDestination(direction.nativeEvent.coordinate)  } />

        <MapViewDirections origin={origin}
        destination={destination}
        apikey={GOOGLE_MAPS_KEY}/>

        <Polyline coordinates={[origin, destination]}
        strokeColor='green'
        strokeWidth={8}
        >

        </Polyline>
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
            title: 'Mis Datos',
            headerBackVisible: false
          }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 
            headerShown: true,
            title: 'Mapa'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: "100%",
    height: "90%"
  }
});
