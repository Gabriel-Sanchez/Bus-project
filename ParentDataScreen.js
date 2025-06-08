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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { API_URLS } = require('./config');

const ParentDataScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        
        if (!token || !userData) {
          navigation.replace('Login');
          return;
        }
        
        setUser(JSON.parse(userData));
        fetchParentData(token);
      } catch (err) {
        console.error('Error checking auth:', err);
        navigation.replace('Login');
      }
    };

    checkAuth();
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
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetchParentData(token);
      }
    } catch (err) {
      console.error('Error al recargar:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchParentData = async (token) => {
    try {
      const response = await fetch(API_URLS.PARENT_DATA, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50'; // Verde
      case 'pending':
        return '#FFA000'; // Naranja
      case 'inactive':
        return '#FF5252'; // Rojo
      default:
        return '#666666'; // Gris
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

  const renderStudentCard = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {item.name}
        </Text>
        <Text style={styles.studentId}>
          ID: {item.identification}
        </Text>
        <View style={styles.relationshipContainer}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.relationshipText}>
            {item.relationship}
          </Text>
          {item.is_primary_contact && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Contacto Principal</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderRouteCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.routeCard}
      onPress={() => handleRoutePress(item)}
      disabled={item.status !== 'active' && item.status !== 'pending'}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusBadgeColor(item.status) }
        ]}>
          <Text style={styles.statusText}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Estudiantes en esta ruta:</Text>
      {item.students.map((student, index) => (
        <View key={index} style={styles.routeStudent}>
          <Text style={styles.routeStudentName}>
            {student.first_name} {student.last_name}
          </Text>
          <Text style={styles.routeStudentRelation}>
            {student.relationship_with_user.relationship}
            {student.relationship_with_user.is_primary_contact && ' (Principal)'}
          </Text>
        </View>
      ))}

      {(item.status === 'active' || item.status === 'pending') && (
        <View style={styles.trackingHint}>
          <Ionicons name="location" size={16} color="#007AFF" />
          <Text style={styles.trackingHintText}>
            Toca para ver ubicación en tiempo real
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const handleRoutePress = (route) => {
    if (route.status === 'active' || route.status === 'pending') {
      navigation.navigate('RouteTracking', {
        routeData: route
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchParentData(user.token)}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Bienvenido, {data?.user_info?.username || user?.username || 'Usuario'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {data && (
          <>
            {/* Información del usuario */}
            <View style={styles.userInfoCard}>
              <Text style={styles.cardTitle}>Información del Usuario</Text>
              <View style={styles.userStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{data.user_info.total_routes}</Text>
                  <Text style={styles.statLabel}>Rutas Totales</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{data.user_info.total_related_students}</Text>
                  <Text style={styles.statLabel}>Estudiantes</Text>
                </View>
              </View>
            </View>

            {/* Estudiantes relacionados */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estudiantes Relacionados</Text>
              <FlatList
                data={data.user_info.related_students}
                renderItem={renderStudentCard}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            </View>

            {/* Rutas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rutas Activas</Text>
              <FlatList
                data={data.routes}
                renderItem={renderRouteCard}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

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
  scrollView: {
    flex: 1,
  },
  userInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  relationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipText: {
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  primaryBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeStudent: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  routeStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  routeStudentRelation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  trackingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  trackingHintText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ParentDataScreen; 