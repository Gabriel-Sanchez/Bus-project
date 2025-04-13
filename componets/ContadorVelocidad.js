import * as Location from 'expo-location';
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

const ContadorVelocidad = () => {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          setSpeed(location.coords.speed);
        }
      );
    })();
  }, []);

  return <Text>Velocidad: {speed} m/s</Text>;
};

export default ContadorVelocidad;
