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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataListScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [attendanceChanges, setAttendanceChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
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
        fetchData(token);
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
        await fetchData(token);
      }
    } catch (err) {
      console.error('Error al recargar:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchData = async (token) => {
    try {
      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/data/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos');
      }

      const result = await response.json();
      
      // Mantener los cambios de asistencia existentes
      if (selectedRoute) {
        const updatedResult = result.map(route => {
          if (route.id === selectedRoute.id) {
            return {
              ...route,
              students: route.students.map(student => {
                const existingChange = attendanceChanges[student.id];
                if (existingChange) {
                  return {
                    ...student,
                    attendance_status: existingChange.status
                  };
                }
                return student;
              })
            };
          }
          return route;
        });
        setData(updatedResult);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRoutePress = (route) => {
    navigation.navigate('StudentsList', { route });
  };

  const handleMapPress = (route) => {
    navigation.navigate('Home', {
      destination: {
        latitude: route.end_location.latitude,
        longitude: route.end_location.longitude,
      },
      routeInfo: {
        title: route.title,
        description: route.description,
        schedule: route.schedule,
      }
    });
  };

  const saveAttendanceChanges = async () => {
    if (Object.keys(attendanceChanges).length === 0) {
      Alert.alert('Información', 'No hay cambios para guardar');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/update-attendance/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: attendanceChanges
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar los cambios');
      }

      // Limpiar los cambios guardados
      setAttendanceChanges({});
      Alert.alert('Éxito', 'Los cambios se han guardado correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los cambios');
      console.error('Error saving attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttendancePress = (student, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'present' : 
                     currentStatus === 'present' ? 'absent' : 'pending';
    
    // Actualizar el estado local
    setSelectedRoute(prevRoute => ({
      ...prevRoute,
      students: prevRoute.students.map(s => 
        s.id === student.id ? { ...s, attendance_status: newStatus } : s
      )
    }));

    // Guardar el cambio para enviar a la API
    setAttendanceChanges(prev => ({
      ...prev,
      [student.id]: {
        status: newStatus,
        route_id: selectedRoute.id,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present':
        return '✅';
      case 'absent':
        return '❌';
      default:
        return '🟡';
    }
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {item.first_name} {item.last_name}
        </Text>
        <Text style={styles.studentDetails}>
          {item.group?.name} • {item.pickup_time}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.attendanceButton,
          attendanceChanges[item.id] && styles.changedAttendanceButton
        ]}
        onPress={() => handleAttendancePress(item, item.attendance_status || 'pending')}
      >
        <Text style={styles.attendanceText}>
          {getAttendanceIcon(item.attendance_status || 'pending')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRouteCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.routeCard,
        selectedRoute?.id === item.id && styles.selectedRouteCard
      ]}
      onPress={() => handleRoutePress(item)}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF5252' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.routeDescription}>{item.description}</Text>
      
      <View style={styles.routeDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.schedule}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.start_location.name} → {item.end_location.name}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => handleMapPress(item)}
      >
        <Ionicons name="map-outline" size={20} color="#007AFF" />
        <Text style={styles.mapButtonText}>Ver en mapa</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(user.token)}>
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
            Bienvenido, {user?.first_name || 'Usuario'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={renderRouteCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />
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
  listContainer: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRouteCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
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
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeDescription: {
    color: '#666',
    marginBottom: 12,
  },
  routeDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  mapButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  studentsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  studentsList: {
    paddingBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  attendanceButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  attendanceText: {
    fontSize: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  changedAttendanceButton: {
    backgroundColor: '#E3F2FD',
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
});

export default DataListScreen; 