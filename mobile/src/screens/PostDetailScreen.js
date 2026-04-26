import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import api from '../utils/api';
import Post from '../components/Post';
import { Ionicons } from '@expo/vector-icons';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const fetchPostAndReplies = async () => {
    try {
      const [postRes, repliesRes] = await Promise.all([
        api.get(`/posts/${postId}`),
        api.get(`/posts/${postId}/replies`)
      ]);
      setPost(postRes.data);
      setReplies(repliesRes.data);
    } catch (error) {
      console.error('Failed to fetch post details', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPostAndReplies();
  }, [postId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPostAndReplies();
  }, [postId]);

  const submitReply = async () => {
    if (!replyContent.trim()) return;
    try {
      const formData = new FormData();
      formData.append('content', replyContent);
      formData.append('parent_id', postId);

      const response = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReplies([...replies, response.data]);
      setReplyContent('');
    } catch (error) {
      console.error('Failed to post reply', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00e676" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Post not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Post post={item} />}
          ListHeaderComponent={
            <View>
              <Post post={post} />
              <View style={styles.divider} />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e676" />}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Post your reply"
            placeholderTextColor="#888"
            value={replyContent}
            onChangeText={setReplyContent}
            multiline
          />
          <TouchableOpacity style={styles.replyButton} onPress={submitReply} disabled={!replyContent.trim()}>
            <Text style={[styles.replyButtonText, !replyContent.trim() && { opacity: 0.5 }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  errorText: { color: '#fff', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  inputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#333', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, minHeight: 40, marginRight: 10 },
  replyButton: { backgroundColor: '#00e676', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  replyButtonText: { color: '#000', fontWeight: 'bold' },
});

export default PostDetailScreen;
