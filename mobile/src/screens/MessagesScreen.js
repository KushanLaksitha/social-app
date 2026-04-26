import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import api from '../utils/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const MessagesScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00e676" />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const avatarUrl = item.other.avatar ? `${BASE_URL}${item.other.avatar}` : 'https://via.placeholder.com/50';
    return (
      <TouchableOpacity 
        style={styles.convItem} 
        onPress={() => navigation.navigate('Chat', { convId: item.id, otherUser: item.other })}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.convInfo}>
          <Text style={styles.convName}>{item.other.display_name || item.other.username}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'top']}>
      <Text style={styles.headerTitle}>Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active conversations.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  convItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  convInfo: { flex: 1 },
  convName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  lastMessage: { color: '#888', fontSize: 14 },
  unreadBadge: { backgroundColor: '#00e676', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
});

export default MessagesScreen;
