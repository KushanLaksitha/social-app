import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read');
      setNotifications(notifications.map(n => ({ ...n, read: 1 })));
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00e676" />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const avatarUrl = item.actor_avatar ? `${BASE_URL}${item.actor_avatar}` : 'https://via.placeholder.com/40';
    let icon, text;

    switch (item.type) {
      case 'like':
        icon = <Ionicons name="heart" size={24} color="#f91880" />;
        text = 'liked your post';
        break;
      case 'repost':
        icon = <Ionicons name="repeat" size={24} color="#00e676" />;
        text = 'reposted your post';
        break;
      case 'reply':
        icon = <Ionicons name="chatbubble" size={24} color="#1d9bf0" />;
        text = 'replied to your post';
        break;
      case 'follow':
        icon = <Ionicons name="person" size={24} color="#a594f9" />;
        text = 'followed you';
        break;
      default:
        icon = <Ionicons name="notifications" size={24} color="#888" />;
        text = 'interacted with you';
    }

    return (
      <TouchableOpacity 
        style={[styles.notifItem, item.read === 0 && styles.unreadItem]}
        onPress={() => {
          if (item.post_id) {
            navigation.navigate('PostDetail', { postId: item.post_id });
          } else if (item.type === 'follow') {
            navigation.navigate('Profile', { username: item.actor_username });
          }
        }}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.boldText}>{item.actor_display || item.actor_username}</Text> {text}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color="#00e676" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e676" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  notifItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', alignItems: 'center' },
  unreadItem: { backgroundColor: 'rgba(0, 230, 118, 0.05)' },
  iconContainer: { width: 30, alignItems: 'center', marginRight: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  notifContent: { flex: 1 },
  notifText: { color: '#888', fontSize: 15 },
  boldText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
});

export default NotificationsScreen;
