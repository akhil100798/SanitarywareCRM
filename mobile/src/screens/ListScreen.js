import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { fetchList, listServices } from '../api/services';
import ListCard from '../components/ListCard';
import Screen from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { usePagedItems } from '../utils/usePagedItems';

const detailRoutes = {
  customers: 'CustomerDetail',
  quotations: 'QuotationDetail',
  orders: 'OrderDetail'
};

const ListScreen = ({ route, navigation }) => {
  const resource = route.params.resource;
  const config = useMemo(() => listServices[resource], [resource]);
  const [query, setQuery] = useState('');
  const fetchPage = useCallback((nextQuery, page) => fetchList(resource, nextQuery, page), [resource]);
  const { items, total, hasNext, loading, loadingMore, error, reload, loadMore } = usePagedItems(fetchPage, query);

  const handleSearch = (value) => {
    setQuery(value);
  };

  if (loading) {
    return <LoadingView label={`Loading ${config.title.toLowerCase()}...`} />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={reload} />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.count}>{items.length} of {total} records</Text>
        {config.searchEndpoint ? (
          <View style={styles.searchBox}>
            <Search color={colors.muted} size={18} />
            <TextInput
              autoCapitalize="none"
              onChangeText={handleSearch}
              placeholder={`Search ${config.title.toLowerCase()}`}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={query}
            />
          </View>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListFooterComponent={hasNext ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Load more" accessibilityState={{ disabled: loadingMore }}
            disabled={loadingMore} onPress={loadMore} style={styles.more}>
            <Text>{loadingMore ? 'Loading more...' : 'Load more'}</Text>
          </Pressable>
        ) : null}
        ListEmptyComponent={
          <EmptyView title={`No ${config.title.toLowerCase()} found`} message="Pull to refresh or try again later." />
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
          />
        }
        renderItem={({ item }) => {
          const detailRoute = detailRoutes[resource];
          return (
            <ListCard
              item={item}
              onPress={detailRoute ? () => navigation.navigate(detailRoute, { id: item.id }) : undefined}
            />
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  more: { alignItems: 'center', padding: 16 },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 16
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 12
  },
  list: {
    padding: 16,
    paddingBottom: 28
  }
});

export default ListScreen;
