import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Filter } from 'lucide-react-native';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'lost' | 'found'>('all');

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'lost', label: 'Lost Items' },
    { key: 'found', label: 'Found Items' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search lost & found items..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === item.key ? colors.primary : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedCategory(item.key as any)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedCategory === item.key ? colors.card : colors.text,
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Filter size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            Start Searching
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            Search for lost or found items by typing keywords above
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  categoriesContainer: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});