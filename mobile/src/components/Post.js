import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const Post = ({ post, onLikeToggle }) => {
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleLike = async () => {
    try {
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
      await api.post(`/posts/${post.id}/like`);
    } catch (error) {
      console.error('Error liking post', error);
      setLiked(liked); // revert
      setLikesCount(liked ? likesCount : likesCount - 1); // revert
    }
  };

  const author = post.author || {};
  const avatarUrl = author.avatar ? `${BASE_URL}${author.avatar}` : 'https://via.placeholder.com/50';
  const imageUrl = post.image ? `${BASE_URL}${post.image}` : null;

  return (
    <View style={styles.postContainer}>
      <View style={styles.header}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{author.display_name || author.username}</Text>
          <Text style={styles.username}>@{author.username}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name={
              post.visibility === 'onlyme'   ? 'lock-closed' :
              post.visibility === 'followers' ? 'people'      : 'globe'
            }
            size={12}
            color="#555"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.timeAgo}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {imageUrl && (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.postImage} 
          resizeMode="cover"
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={22} color="#888" />
          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="repeat-outline" size={24} color="#888" />
          <Text style={styles.actionText}>{post.reposts_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons 
            name={liked ? "heart" : "heart-outline"} 
            size={24} 
            color={liked ? "#f91880" : "#888"} 
          />
          <Text style={[styles.actionText, liked && { color: "#f91880" }]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={24} color="#888" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  username: {
    color: '#888',
    fontSize: 14,
  },
  timeAgo: {
    color: '#888',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 50,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: '#888',
    marginLeft: 5,
    fontSize: 14,
  },
});

export default Post;
