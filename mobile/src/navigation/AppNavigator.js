import React, { useContext } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatScreen from '../screens/ChatScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CreatePostScreen from '../screens/CreatePostScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      headerStyle: {
        backgroundColor: '#0a0a0a',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
      },
      headerTintColor: '#fff',
      tabBarStyle: {
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#333',
      },
      tabBarActiveTintColor: '#00e676',
      tabBarInactiveTintColor: '#888',
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'ExploreTab') iconName = focused ? 'search' : 'search-outline';
        else if (route.name === 'NotificationsTab') iconName = focused ? 'notifications' : 'notifications-outline';
        else if (route.name === 'MessagesTab') iconName = focused ? 'mail' : 'mail-outline';
        else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Vibe Feed' }} />
    <Tab.Screen name="ExploreTab" component={ExploreScreen} options={{ title: 'Explore' }} />
    <Tab.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages' }} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Chat" component={ChatScreen} options={{ headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ presentation: 'fullScreenModal', headerShown: false }} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
