import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';

export default function DataListScreen({ route, navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { username, token } = route.params;

  const fetchData = async () => {
    try {
      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/data/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const jsonData = await response.json();
        console.log('Datos recibidos:', JSON.stringify(jsonData, null, 2));
        setData(jsonData);
      } else {
        const errorText = await response.text();
        console.error('Error fetching data:', errorText);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, cerrar sesión',
          onPress: async () => {
            try {
              const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/logout/', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error en logout:', error);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleRoutePress = (route) => {
    navigation.navigate('Home', {
      destination: route.end_location,
      routeInfo: {
        title: route.title,
        description: route.description,
        schedule: route.schedule
      }
    });
  };

  const renderRouteCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.routeCard}
      onPress={() => handleRoutePress(item)}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FFA000' }]}>
          <Text style={styles.statusText}>{item.status === 'active' ? 'Activa' : 'Inactiva'}</Text>
        </View>
      </View>
      
      <Text style={styles.routeDescription}>{item.description}</Text>
      
      <View style={styles.routeDetails}>
        <Text style={styles.scheduleText}>🕒 {item.schedule}</Text>
        
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            📍 Inicio: {item.start_location.name}
          </Text>
          <Text style={styles.locationText}>
            🏁 Fin: {item.end_location.name}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.driverText}>
          👤 {item.is_driver ? 'Conductor' : 'Pasajero'}: {item.user}
        </Text>
        <Text style={styles.viewMapText}>Ver en mapa →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Bienvenido, {username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={renderRouteCard}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay rutas disponibles</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 10,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeHeader: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  routeDetails: {
    marginTop: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  locationContainer: {
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  driverText: {
    fontSize: 14,
    color: '#666',
  },
  viewMapText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 