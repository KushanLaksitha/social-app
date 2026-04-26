import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const VISIBILITY_OPTIONS = [
  { value: 'public',    label: 'Public',    icon: 'globe-outline' },
  { value: 'followers', label: 'Followers', icon: 'people-outline' },
  { value: 'onlyme',   label: 'Only Me',  icon: 'lock-closed-outline' },
];

const CreatePostScreen = ({ navigation }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState('public');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !media) {
      Alert.alert('Error', 'Content or media is required');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content);
      formData.append('visibility', visibility);

      if (media) {
        const localUri = media.uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `${media.type}/${match[1]}` : media.type;
        formData.append('media', { uri: localUri, name: filename, type: type || 'image/jpeg' });
      }

      await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create post', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postButton, (!content.trim() && !media) && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={loading || (!content.trim() && !media)}
        >
          {loading
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={styles.postButtonText}>Post</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Text input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's your vibe today?"
            placeholderTextColor="#888"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />
        </View>

        {/* ── Visibility Selector ── */}
        <View style={styles.visibilityContainer}>
          <Text style={styles.visibilityLabel}>Who can see this?</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((opt) => {
              const isSelected = visibility === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.visibilityChip, isSelected && styles.visibilityChipSelected]}
                  onPress={() => setVisibility(opt.value)}
                >
                  <Ionicons name={opt.icon} size={15} color={isSelected ? '#000' : '#888'} style={{ marginRight: 4 }} />
                  <Text style={[styles.visibilityChipText, isSelected && styles.visibilityChipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Media preview */}
        {media && (
          <View style={styles.mediaPreviewContainer}>
            <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
            <TouchableOpacity style={styles.removeMediaButton} onPress={() => setMedia(null)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={pickImage} style={styles.toolbarButton}>
            <Ionicons name="image-outline" size={24} color="#00e676" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.toolbarButton}>
            <Ionicons name="videocam-outline" size={24} color="#00e676" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  postButton: { backgroundColor: '#00e676', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  inputContainer: { flex: 1, padding: 15 },
  input: { color: '#fff', fontSize: 18, textAlignVertical: 'top' },
  // Visibility
  visibilityContainer: { paddingHorizontal: 15, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  visibilityLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  visibilityChipSelected: { backgroundColor: '#00e676', borderColor: '#00e676' },
  visibilityChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  visibilityChipTextSelected: { color: '#000' },
  // Media
  mediaPreviewContainer: { position: 'relative', margin: 15, borderRadius: 15, overflow: 'hidden' },
  mediaPreview: { width: '100%', height: 280, resizeMode: 'cover' },
  removeMediaButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 5 },
  toolbar: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#333' },
  toolbarButton: { marginRight: 20 },
});

export default CreatePostScreen;
