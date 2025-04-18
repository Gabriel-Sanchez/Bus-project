import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const StudentsListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { route: selectedRoute } = route.params;
  const [attendanceChanges, setAttendanceChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [students, setStudents] = useState(selectedRoute.students);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'pending' | 'synced' | 'error'
  const [routeStatus, setRouteStatus] = useState(selectedRoute.status);
  const isRouteActive = routeStatus === 'active';

  useEffect(() => {
    console.log('Route Status on Mount:', selectedRoute.status);
    console.log('Route Data:', selectedRoute);
    
    // Siempre usar el estado actual de la ruta
    setRouteStatus(selectedRoute.status);
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected && Object.keys(attendanceChanges).length > 0) {
        setSyncStatus('pending');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedRoute.status]);

  const loadPendingChanges = async () => {
    try {
      const pendingChanges = await AsyncStorage.getItem(`pending_changes_${selectedRoute.id}`);
      if (pendingChanges) {
        const parsedChanges = JSON.parse(pendingChanges);
        setAttendanceChanges(parsedChanges);
        setSyncStatus('pending');
        
        // Aplicar los cambios pendientes al estado visual
        setStudents(prevStudents => 
          prevStudents.map(student => {
            const change = parsedChanges[student.id];
            if (change) {
              return { 
                ...student, 
                attendance_status: change.status,
                last_attendance_timestamp: change.timestamp
              };
            }
            return student;
          })
        );
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
  };

  const loadRouteStatus = async () => {
    try {
      // Siempre usar el estado actual de la ruta como fuente de verdad
      console.log('Setting route status to:', selectedRoute.status);
      setRouteStatus(selectedRoute.status);
      
      // Actualizar el storage con el estado actual
      console.log('Updating storage with current route status:', selectedRoute.status);
      await AsyncStorage.setItem(`route_status_${selectedRoute.id}`, selectedRoute.status);
    } catch (error) {
      console.error('Error updating route status:', error);
    }
  };

  const saveRouteStatus = async (status) => {
    try {
      console.log('Saving Route Status:', status);
      await AsyncStorage.setItem(`route_status_${selectedRoute.id}`, status);
      setRouteStatus(status);
      console.log('Route Status Updated:', status);
    } catch (error) {
      console.error('Error saving route status:', error);
    }
  };

  const saveChangesLocally = async (changes) => {
    try {
      await AsyncStorage.setItem(
        `pending_changes_${selectedRoute.id}`,
        JSON.stringify(changes)
      );
      setSyncStatus('pending');
    } catch (error) {
      console.error('Error saving changes locally:', error);
    }
  };

  const handleAttendancePress = (student, currentStatus) => {
    console.log('Current Route Status:', routeStatus);
    console.log('Attempting to change attendance for student:', student.id);
    
    if (routeStatus !== 'active') {
      console.log('Cannot edit - Route is not active. Current status:', routeStatus);
      Alert.alert(
        'Ruta no editable',
        `La lista de asistencia solo se puede editar cuando la ruta está activa. Estado actual: ${getStatusText(routeStatus)}`
      );
      return;
    }

    const newStatus = currentStatus === 'pending' ? 'present' : 
                     currentStatus === 'present' ? 'absent' : 'pending';
    
    console.log('Changing attendance status to:', newStatus);
    const timestamp = new Date().toISOString();
    
    setStudents(prevStudents => 
      prevStudents.map(s => 
        s.id === student.id ? { 
          ...s, 
          attendance_status: newStatus,
          last_attendance_timestamp: timestamp
        } : s
      )
    );

    const newChanges = {
      ...attendanceChanges,
      [student.id]: {
        status: newStatus,
        route_id: selectedRoute.id,
        timestamp: timestamp
      }
    };
    setAttendanceChanges(newChanges);
    saveChangesLocally(newChanges);
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-PA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'pending':
        return 'Pendiente por enviar';
      case 'synced':
        return 'Cambios guardados';
      case 'error':
        return 'Error al guardar';
      default:
        return '';
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'pending':
        return '#FFA000';
      case 'synced':
        return '#4CAF50';
      case 'error':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const syncChanges = async () => {
    if (Object.keys(attendanceChanges).length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/update-attendance/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: attendanceChanges
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Error al guardar los cambios');
      }

      await AsyncStorage.removeItem(`pending_changes_${selectedRoute.id}`);
      setAttendanceChanges({});
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error saving attendance:', err);
      setSyncStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateRouteStatus = async (newStatus) => {
    console.log('Updating route status to:', newStatus);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/users/update-route-status/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route_id: selectedRoute.id,
          status: newStatus
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error('Error al actualizar el estado de la ruta');
      }

      console.log('Route status updated successfully on server');
      await saveRouteStatus(newStatus);
      navigation.navigate('Home', {
        destination: {
          latitude: selectedRoute.end_location.latitude,
          longitude: selectedRoute.end_location.longitude,
        },
        routeInfo: {
          title: selectedRoute.title,
          description: selectedRoute.description,
          schedule: selectedRoute.schedule,
          status: newStatus // Agregar el estado a la información de la ruta
        }
      });
    } catch (err) {
      console.error('Error updating route status:', err);
      Alert.alert(
        'Error',
        'No se pudo actualizar el estado de la ruta. Se guardará localmente y se sincronizará cuando haya conexión.'
      );
      await saveRouteStatus(newStatus);
      navigation.navigate('Home', {
        destination: {
          latitude: selectedRoute.end_location.latitude,
          longitude: selectedRoute.end_location.longitude,
        },
        routeInfo: {
          title: selectedRoute.title,
          description: selectedRoute.description,
          schedule: selectedRoute.schedule,
          status: newStatus // Agregar el estado a la información de la ruta
        }
      });
    }
  };

  const startRoute = async () => {
    // Si hay cambios pendientes, guardarlos primero
    if (Object.keys(attendanceChanges).length > 0) {
      try {
        await syncChanges();
      } catch (error) {
        console.error('Error saving changes before starting route:', error);
        Alert.alert(
          'Error',
          'No se pudieron guardar los cambios antes de iniciar la ruta. ¿Deseas continuar?',
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Continuar',
              onPress: () => updateRouteStatus('pending')
            }
          ]
        );
        return;
      }
    }

    Alert.alert(
      'Iniciar Ruta',
      '¿Estás seguro que deseas iniciar esta ruta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Iniciar',
          onPress: () => updateRouteStatus('pending')
        }
      ]
    );
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
        return '#666666'; // Gris para estados desconocidos
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Ruta Activa';
      case 'pending':
        return 'Ruta en Progreso';
      case 'inactive':
        return 'Ruta Inactiva';
      default:
        return `Estado: ${status}`;
    }
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {item.first_name} {item.last_name}
        </Text>
        <View style={styles.studentDetailsContainer}>
          <Text style={styles.studentDetails}>
            {item.group?.name} • {item.pickup_time}
          </Text>
          {item.last_attendance_timestamp && (
            <Text style={styles.attendanceTime}>
              Último registro: {formatTimestamp(item.last_attendance_timestamp)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.attendanceButton,
          attendanceChanges[item.id] && styles.changedAttendanceButton,
          routeStatus !== 'active' && styles.disabledAttendanceButton
        ]}
        onPress={() => handleAttendancePress(item, item.attendance_status || 'pending')}
        disabled={routeStatus !== 'active'}
      >
        <Text style={styles.attendanceText}>
          {getAttendanceIcon(item.attendance_status || 'pending')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (Object.keys(attendanceChanges).length > 0) {
                Alert.alert(
                  'Cambios sin guardar',
                  'Tienes cambios sin guardar. ¿Estás seguro que deseas salir?',
                  [
                    {
                      text: 'Cancelar',
                      style: 'cancel',
                      onPress: () => null,
                    },
                    {
                      text: 'Salir sin guardar',
                      style: 'destructive',
                      onPress: () => navigation.goBack(),
                    },
                    {
                      text: 'Guardar y salir',
                      onPress: async () => {
                        await syncChanges();
                        navigation.goBack();
                      },
                    },
                  ]
                );
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedRoute.title}</Text>
          <Text style={styles.subtitle}>Lista de Estudiantes</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusBadgeColor(routeStatus) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(routeStatus)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {routeStatus === 'active' && (
            <View style={styles.buttonsContainer}>
              <View style={styles.buttonRow}>
                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (Object.keys(attendanceChanges).length === 0 || isSaving) && styles.disabledButton
                    ]}
                    onPress={syncChanges}
                    disabled={Object.keys(attendanceChanges).length === 0 || isSaving}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.startRouteButton}
                  onPress={startRoute}
                >
                  <Text style={styles.startRouteButtonText}>Iniciar Ruta</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentDetailsContainer: {
    marginTop: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  attendanceButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  changedAttendanceButton: {
    backgroundColor: '#E3F2FD',
  },
  attendanceText: {
    fontSize: 20,
  },
  saveContainer: {
    alignItems: 'flex-end',
  },
  saveButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  offlineText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  syncStatus: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledAttendanceButton: {
    opacity: 0.5,
  },
  buttonsContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  startRouteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  startRouteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
    marginBottom: 8,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#CCCCCC',
  },
});

export default StudentsListScreen; 