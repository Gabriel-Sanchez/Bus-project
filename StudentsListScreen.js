import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
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

  useEffect(() => {
    // Cargar cambios pendientes al iniciar
    loadPendingChanges();
    
    // Configurar listener de conexión
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected && Object.keys(attendanceChanges).length > 0) {
        setSyncStatus('pending');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
              return { ...student, attendance_status: change.status };
            }
            return student;
          })
        );
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
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
    const newStatus = currentStatus === 'pending' ? 'present' : 
                     currentStatus === 'present' ? 'absent' : 'pending';
    
    // Actualizar el estado visual de los estudiantes
    setStudents(prevStudents => 
      prevStudents.map(s => 
        s.id === student.id ? { ...s, attendance_status: newStatus } : s
      )
    );

    // Guardar el cambio localmente
    const newChanges = {
      ...attendanceChanges,
      [student.id]: {
        status: newStatus,
        route_id: selectedRoute.id,
        timestamp: new Date().toISOString()
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{selectedRoute.title}</Text>
          <Text style={styles.subtitle}>Lista de Estudiantes</Text>
          {!isOnline && (
            <Text style={styles.offlineText}>Modo sin conexión</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {Object.keys(attendanceChanges).length > 0 && (
            <View style={styles.saveContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={syncChanges}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.syncStatus, { color: getSyncStatusColor() }]}>
                {getSyncStatusText()}
              </Text>
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
  studentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
});

export default StudentsListScreen; 