import React, { useState } from 'react';
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

const StudentsListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { route: selectedRoute } = route.params;
  const [attendanceChanges, setAttendanceChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [students, setStudents] = useState(selectedRoute.students);

  const handleAttendancePress = (student, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'present' : 
                     currentStatus === 'present' ? 'absent' : 'pending';
    
    // Actualizar el estado visual de los estudiantes
    setStudents(prevStudents => 
      prevStudents.map(s => 
        s.id === student.id ? { ...s, attendance_status: newStatus } : s
      )
    );

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

  const saveAttendanceChanges = async () => {
    if (Object.keys(attendanceChanges).length === 0) {
      Alert.alert('Información', 'No hay cambios para guardar');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch('https://6sqzxskf-9000.use2.devtunnels.ms/api/update-attendance/', {
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
        throw new Error('Error al guardar los cambios');
      }

      setAttendanceChanges({});
      Alert.alert('Éxito', 'Los cambios se han guardado correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los cambios');
      console.error('Error saving attendance:', err);
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
        </View>
        <View style={styles.headerRight}>
          {Object.keys(attendanceChanges).length > 0 && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAttendanceChanges}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
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
});

export default StudentsListScreen; 