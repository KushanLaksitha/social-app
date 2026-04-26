import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import Post from '../components/Post';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const ProfileScreen = ({ route }) => {
  const { user: currentUser, logout } = useContext(AuthContext);
  // If a username is passed in params, show that user's profile, else show current user
  const username = route?.params?.username || currentUser?.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    try {
      // Fetch user profile info
      const profileRes = await api.get(`/users/${username}`);
      setProfile(profileRes.data);

      // Fetch user's posts
      if (profileRes.data && profileRes.data.id) {
        const postsRes = await api.get(`/posts/user/${profileRes.data.id}`);
        setPosts(postsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
  }, [username]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00e676" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#fff' }}>Profile not found.</Text>
      </View>
    );
  }

  const isOwnProfile = currentUser && currentUser.username === profile.username;
  const avatarUrl = profile.avatar ? `${BASE_URL}${profile.avatar}` : 'https://via.placeholder.com/100';

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.coverPhoto} />
      <View style={styles.profileInfoContainer}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        
        {isOwnProfile ? (
          <TouchableOpacity style={styles.editButton} onPress={logout}>
            <Text style={styles.editButtonText}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bioContainer}>
        <Text style={styles.displayName}>{profile.display_name || profile.username}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile.followers_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabHeader}>
        <Text style={styles.tabActive}>Posts</Text>
        <Text style={styles.tabInactive}>Replies</Text>
        <Text style={styles.tabInactive}>Likes</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Post post={item} />}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#00e676" 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  coverPhoto: {
    height: 120,
    backgroundColor: '#1a1a1a',
  },
  profileInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#0a0a0a',
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignSelf: 'center',
    marginTop: 40,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#00e676',
    alignSelf: 'center',
    marginTop: 40,
  },
  followButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  bioContainer: {
    padding: 15,
  },
  displayName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  username: {
    color: '#888',
    fontSize: 16,
    marginBottom: 10,
  },
  bio: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 10,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  stat: {
    flexDirection: 'row',
    marginRight: 20,
  },
  statNumber: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  statLabel: {
    color: '#888',
  },
  tabHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tabActive: {
    flex: 1,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 15,
    fontWeight: 'bold',
    borderBottomWidth: 3,
    borderBottomColor: '#00e676',
  },
  tabInactive: {
    flex: 1,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 15,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});

export default ProfileScreen;
