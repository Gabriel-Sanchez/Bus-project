import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { API_URLS } = require('./config');

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Limpiar errores previos
    
    try {
      const response = await fetch(API_URLS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar error específico para credenciales incorrectas
        if (response.status === 401 || response.status === 400) {
          setErrorMessage('Usuario o contraseña incorrecta');
        } else {
          setErrorMessage(data.detail || 'Error al iniciar sesión');
        }
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Login exitoso, usuario:', data.user);
      console.log('is_driver:', data.user.is_driver);
      
      // Limpiar campos y errores al tener éxito
      setUsername('');
      setPassword('');
      setErrorMessage('');
      
      // Redirigir según el tipo de usuario
      if (data.user.is_driver) {
        console.log('Navegando a DataList (Conductor)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'DataList' }],
        });
      } else {
        console.log('Navegando a ParentData (Padre/Madre)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'ParentData' }],
        });
      }
    } catch (error) {
      console.error('Error en login:', error);
      setErrorMessage('Error de conexión. Verifique su internet e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        
        <TextInput
          style={[styles.input, errorMessage ? styles.inputError : null]}
          placeholder="Nombre de usuario"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (errorMessage) setErrorMessage(''); // Limpiar error al escribir
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errorMessage ? styles.inputError : null]}
            placeholder="Contraseña"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(''); // Limpiar error al escribir
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={togglePasswordVisibility}
          >
            <Ionicons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    paddingRight: 50, // Espacio para el botón del ojo
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 