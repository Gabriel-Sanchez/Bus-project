import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { API_URLS } = require('./config');

const LocationTracker = ({ routeId, currentLocation }) => {
  const [trackingInterval, setTrackingInterval] = useState(null);

  const sendLocationToServer = async (position) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No se encontró el token');
        return;
      }

      const { latitude, longitude } = position;
      const timestamp = new Date().toISOString();

      const locationData = {
        latitud: latitude,
        longitud: longitude,
        route_id: routeId,
        timestamp: timestamp
      };

      console.log('Enviando ubicación:', JSON.stringify(locationData, null, 2));

      const response = await fetch(API_URLS.ROUTE_LOCATION(routeId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Error al enviar la ubicación: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Ubicación enviada correctamente:', responseData);
    } catch (error) {
      console.error('Error al enviar la ubicación:', error.message);
    }
  };

  useEffect(() => {
    if (currentLocation) {
      sendLocationToServer(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    console.log('Iniciando tracking de ubicación para la ruta:', routeId);
    
    const intervalId = setInterval(() => {
      if (currentLocation) {
        sendLocationToServer(currentLocation);
      }
    }, 10000);
    
    setTrackingInterval(intervalId);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [routeId, currentLocation]);

  return null;
};

export default LocationTracker; 