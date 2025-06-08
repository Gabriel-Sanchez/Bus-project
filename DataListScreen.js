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
const { API_URLS } = require('./config');

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
      console.log('🚗 ========== VISTA CONDUCTOR - INICIANDO ==========');
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        
        console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
        console.log('👤 Datos de usuario encontrados:', userData ? 'Sí' : 'No');
        
        if (!token || !userData) {
          console.warn('⚠️ Token o datos de usuario faltantes, redirigiendo a Login');
          navigation.replace('Login');
          return;
        }
        
        const parsedUser = JSON.parse(userData);
        console.log('👤 Usuario parseado:', JSON.stringify(parsedUser, null, 2));
        console.log('🚗 Es conductor:', parsedUser.is_driver);
        
        setUser(parsedUser);
        
        console.log('📡 Iniciando carga de datos de conductor...');
        fetchData(token);
      } catch (err) {
        console.error('❌ Error checking auth:', err);
        navigation.replace('Login');
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    console.log('🚪 ========== CERRANDO SESIÓN CONDUCTOR ==========');
    console.log('🔓 Limpiando datos almacenados localmente...');
    
    try {
      // Limpiar datos de AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      console.log('🗑️ Token removido');
      console.log('🗑️ Datos de usuario removidos');
      
      // Limpiar estado local
      setUser(null);
      setData([]);
      setSelectedRoute(null);
      setAttendanceChanges({});
      
      console.log('🧹 Estado local limpiado');
      console.log('✅ Logout completado, navegando a Login');
      
      // Navegar a login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('❌ Error durante logout:', error);
      // Aún así navegar a login en caso de error
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const onRefresh = React.useCallback(async () => {
    console.log('🔄 ========== REFRESCANDO DATOS CONDUCTOR (PULL TO REFRESH) ==========');
    setRefreshing(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token para refresh:', token ? 'Encontrado' : 'No encontrado');
      
      if (token) {
        console.log('📡 Iniciando refresh desde pull-to-refresh...');
        await fetchData(token);
        console.log('✅ Pull-to-refresh completado exitosamente');
      } else {
        console.warn('⚠️ No se encontró token durante refresh, redirigiendo a Login');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('❌ Error durante pull-to-refresh:', error);
      setError('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
      console.log('🏁 Pull-to-refresh finalizado');
    }
  }, []);

  const fetchData = async (token) => {
    console.log('📊 ========== CARGANDO DATOS DE CONDUCTOR ==========');
    try {
      console.log('🌐 API URL:', API_URLS.DATA);
      console.log('🔑 Token usado:', token ? token.substring(0, 20) + '...' : 'null');
      
      const response = await fetch(API_URLS.DATA, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        throw new Error('Error al obtener los datos');
      }

      const result = await response.json();
      
      // ========== LOGS DETALLADOS DE DATOS DE CONDUCTOR ==========
      console.log('📊 ========== DATOS COMPLETOS DE RUTAS ==========');
      console.log('🔍 Raw response data:', JSON.stringify(result, null, 2));
      console.log('');
      
      // Extraer las rutas de la respuesta
      const routes = result.routes || result; // Manejar tanto estructura nueva como antigua
      const userInfo = result.user_info || {};
      
      console.log('📋 ========== ANÁLISIS DE RESPUESTA ==========');
      console.log('👤 Info de usuario:', JSON.stringify(userInfo, null, 2));
      console.log('📊 Total de rutas recibidas:', routes.length);
      
      routes.forEach((route, index) => {
        console.log(`\n🚌 ========== RUTA ${index + 1} ==========`);
        console.log('🆔 ID:', route.id);
        console.log('📛 Título:', route.title);
        console.log('📝 Descripción:', route.description);
        console.log('🚦 Estado:', route.status);
        console.log('⏰ Horario:', route.schedule);
        
        console.log('📍 Ubicación de inicio:');
        console.log('  - Nombre:', route.start_location?.name);
        console.log('  - Latitud:', route.start_location?.latitude);
        console.log('  - Longitud:', route.start_location?.longitude);
        
        console.log('📍 Ubicación de fin:');
        console.log('  - Nombre:', route.end_location?.name);
        console.log('  - Latitud:', route.end_location?.latitude);
        console.log('  - Longitud:', route.end_location?.longitude);
        
        console.log('📍 Ubicación actual del bus:');
        console.log('  - Latitud:', route.current_location?.latitude);
        console.log('  - Longitud:', route.current_location?.longitude);
        
        console.log('👥 Estudiantes en esta ruta:');
        console.log('  - Total:', route.students?.length || 0);
        
        if (route.students && route.students.length > 0) {
          route.students.forEach((student, studentIndex) => {
            console.log(`  👤 Estudiante ${studentIndex + 1}:`);
            console.log(`    - ID: ${student.id}`);
            console.log(`    - Nombre: ${student.first_name} ${student.last_name}`);
            console.log(`    - Identificación: ${student.identification}`);
            console.log(`    - Email: ${student.email}`);
            console.log(`    - Teléfono: ${student.phone_number}`);
            console.log(`    - Grupo: ${student.group?.name || 'Sin grupo'}`);
            console.log(`    - Hora recogida: ${student.pickup_time || 'N/A'}`);
            console.log(`    - Hora destino: ${student.dropoff_time || 'N/A'}`);
            console.log(`    - Ubicación recogida: ${student.pickup_location || 'N/A'}`);
            console.log(`    - Ubicación destino: ${student.dropoff_location || 'N/A'}`);
            console.log(`    - Estado asistencia: ${student.attendance_status || 'pending'}`);
            console.log(`    - Último registro: ${student.last_attendance_timestamp || 'N/A'}`);
          });
        }
        
        console.log('🔍 Campos adicionales de la ruta:');
        Object.keys(route).forEach(key => {
          if (!['id', 'title', 'description', 'status', 'schedule', 'start_location', 'end_location', 'current_location', 'students'].includes(key)) {
            console.log(`  📌 ${key}:`, route[key]);
          }
        });
      });
      
      console.log('\n✅ ========== PROCESANDO DATOS ==========');
      
      // Mantener los cambios de asistencia existentes
      if (selectedRoute) {
        console.log('🔄 Manteniendo cambios de asistencia existentes para ruta:', selectedRoute.id);
        const updatedResult = routes.map(route => {
          if (route.id === selectedRoute.id) {
            const updatedStudents = route.students.map(student => {
              const existingChange = attendanceChanges[student.id];
              if (existingChange) {
                console.log(`🔄 Aplicando cambio existente para estudiante ${student.id}:`, existingChange.status);
                return {
                  ...student,
                  attendance_status: existingChange.status
                };
              }
              return student;
            });
            return { ...route, students: updatedStudents };
          }
          return route;
        });
        setData(updatedResult);
        console.log('✅ Datos actualizados con cambios previos');
      } else {
        setData(routes);
        console.log('✅ Datos establecidos sin cambios previos');
      }
      
      console.log('📊 ========== DATOS CARGADOS EXITOSAMENTE ==========');
      
    } catch (err) {
      console.error('❌ ========== ERROR CARGANDO DATOS ==========');
      console.error('💥 Error type:', err.name);
      console.error('💥 Error message:', err.message);
      console.error('💥 Error stack:', err.stack);
      console.error('📊 ==========================================');
      
      setError(err.message);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      console.log('🏁 Fetch data completed');
    }
  };

  const handleRoutePress = (route) => {
    console.log('🚌 ========== NAVEGANDO A LISTA DE ESTUDIANTES ==========');
    console.log('📍 Ruta seleccionada:', route.id);
    console.log('📛 Título:', route.title);
    console.log('👥 Total estudiantes:', route.students?.length || 0);
    console.log('🚦 Estado de ruta:', route.status);
    
    const routeWithDefaults = {
      ...route,
      students: route.students.map(student => ({
        ...student,
        attendance_status: student.attendance_status || 'pending'
      }))
    };
    
    console.log('✅ Navegando a StudentsList con datos:', JSON.stringify(routeWithDefaults, null, 2));
    
    navigation.navigate('StudentsList', { 
      route: routeWithDefaults
    });
  };

  const handleMapPress = (route) => {
    console.log('🗺️ ========== NAVEGANDO AL MAPA ==========');
    console.log('📍 Ruta para mapa:', route.id);
    console.log('📛 Título:', route.title);
    console.log('📍 Destino:', route.end_location);
    
    navigation.navigate('Home', {
      destination: {
        latitude: route.end_location.latitude,
        longitude: route.end_location.longitude,
      },
      routeInfo: {
        id: route.id,
        title: route.title,
        description: route.description,
        schedule: route.schedule,
        status: route.status
      }
    });
    
    console.log('✅ Navegación al mapa iniciada');
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

      const response = await fetch(API_URLS.UPDATE_ATTENDANCE, {
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