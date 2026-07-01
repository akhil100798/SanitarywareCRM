import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../api/client';
import { orderService, quotationService } from '../api/services';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import { ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const QuotationDetailScreen = ({ route, navigation }) => {
  const quotationId = route.params?.id;
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadQuotation = useCallback(async () => {
    try {
      setError('');
      const data = await quotationService.getById(quotationId);
      setQuotation(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [quotationId]);

  useEffect(() => {
    loadQuotation();
  }, [loadQuotation]);

  const convertToOrder = () => {
    Alert.alert('Convert quotation?', 'This will create a pending order from this quotation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert',
        onPress: async () => {
          try {
            setConverting(true);
            setActionError('');
            const order = await orderService.createFromQuotation(quotationId);
            navigation.replace('OrderDetail', { id: order.id, refreshKey: Date.now() });
          } catch (err) {
            setActionError(getErrorMessage(err));
          } finally {
            setConverting(false);
          }
        }
      }
    ]);
  };

  if (loading) return <LoadingView label="Loading quotation..." />;
  if (error) return <ErrorView message={error} onRetry={loadQuotation} />;

  const isConverted = quotation?.status === 'CONVERTED';

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadQuotation();
            }}
          />
        }
      >
        <Text style={styles.title}>{quotation.quotationNumber || `Quotation #${quotation.id}`}</Text>
        <Text style={styles.subtitle}>{quotation.customerName}</Text>
        <FormErrorBanner message={actionError} />

        <DetailSection title="Quotation Details">
          <FieldRow label="Customer" value={quotation.customerName} />
          <FieldRow label="Quotation Date" value={formatDate(quotation.quotationDate)} />
          <FieldRow label="Valid Until" value={formatDate(quotation.validUntil)} />
          <FieldRow label="Status" value={quotation.status} />
        </DetailSection>

        <DetailSection title="Line Items">
          {(quotation.items || []).map((item) => (
            <View key={item.id || `${item.productId}-${item.productName}`} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} x {formatMoney(item.unitPrice)} | Disc {item.discountPercentage || 0}%
              </Text>
              <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </DetailSection>

        <DetailSection title="Totals">
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{formatMoney(quotation.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text>Tax</Text><Text>{formatMoney(quotation.taxAmount)}</Text></View>
          <View style={styles.totalRow}><Text>Discount</Text><Text>{formatMoney(quotation.discount)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandText}>Total</Text><Text style={styles.grandText}>{formatMoney(quotation.total)}</Text></View>
        </DetailSection>
      </ScrollView>
      {!isConverted ? (
        <PrimaryActionBar
          label="Convert To Order"
          onPress={convertToOrder}
          loading={converting}
          disabled={converting}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 14,
    marginTop: 4
  },
  itemRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: 10
  },
  itemName: {
    color: colors.text,
    fontWeight: '900'
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  itemTotal: {
    color: colors.primaryDark,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7
  },
  grandRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10
  },
  grandText: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '900'
  }
});

export default QuotationDetailScreen;
