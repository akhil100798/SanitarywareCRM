import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MessageSquare, Share2 } from 'lucide-react-native';
import { API_BASE_URL } from '../api/config';
import { getErrorMessage } from '../api/client';
import { orderService, quotationService } from '../api/services';
import AppHeader from '../components/AppHeader';
import DetailSection from '../components/DetailSection';
import FieldRow from '../components/FieldRow';
import FormErrorBanner from '../components/FormErrorBanner';
import PrimaryActionBar from '../components/PrimaryActionBar';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import { ErrorView, LoadingView } from '../components/StateViews';
import { colors } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/formatters';

const QuotationDetailScreen = ({ route, navigation }) => {
  const quotationId = route.params?.id;
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
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

  const getPortalUrl = () => {
    if (!quotation?.shareToken) return '';
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}/portal/quotations/${quotation.shareToken}`;
  };

  const handleSharePortal = async () => {
    const portalUrl = getPortalUrl();
    if (!portalUrl) {
      Alert.alert('Notice', 'Portal link is being prepared. Please pull to refresh.');
      return;
    }
    try {
      await Share.share({
        title: `Quotation ${quotation.quotationNumber || `#${quotation.id}`}`,
        message: `View your Sanitaryware quotation ${quotation.quotationNumber || `#${quotation.id}`} online:\n${portalUrl}`,
        url: portalUrl
      });
    } catch (err) {
      Alert.alert('Share Error', getErrorMessage(err));
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      setSendingWhatsApp(true);
      setActionError('');
      const res = await quotationService.sendWhatsApp(quotationId);
      Alert.alert(
        res.status === 'SENT' ? 'WhatsApp Sent' : 'WhatsApp Notification',
        res.detail || 'Quotation notification dispatched via WhatsApp.'
      );
    } catch (err) {
      Alert.alert('WhatsApp Error', getErrorMessage(err));
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleDeviceWhatsApp = () => {
    const portalUrl = getPortalUrl();
    const text = encodeURIComponent(
      `Hello ${quotation.customerName || 'Customer'}, here is your quotation ${quotation.quotationNumber || `#${quotation.id}`} for ${formatMoney(quotation.total)}.\n${portalUrl ? `View online: ${portalUrl}` : ''}`
    );
    const deepLink = `whatsapp://send?text=${text}`;
    Linking.canOpenURL(deepLink).then((supported) => {
      if (supported) {
        return Linking.openURL(deepLink);
      }
      return Linking.openURL(`https://api.whatsapp.com/send?text=${text}`);
    }).catch(() => {
      Alert.alert('Notice', 'WhatsApp is not installed on this device.');
    });
  };

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
      <AppHeader
        title={quotation.quotationNumber || `Quotation #${quotation.id}`}
        subtitle={quotation.customerName}
        onBack={() => navigation.goBack()}
        rightIcon={Share2}
        onRightPress={handleSharePortal}
      />

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
        <FormErrorBanner message={actionError} />

        {/* Status & Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.quoteTitle}>{quotation.quotationNumber || `Quotation #${quotation.id}`}</Text>
              <Text style={styles.customerName}>{quotation.customerName}</Text>
            </View>
            <StatusPill status={quotation.status} size="sm" />
          </View>
          <View style={styles.grandTotalWrap}>
            <Text style={styles.grandTotalLabel}>Quotation Grand Total</Text>
            <Text style={styles.grandTotalAmount}>{formatMoney(quotation.total)}</Text>
          </View>
        </View>

        <DetailSection title="Quotation Details">
          <FieldRow label="Customer" value={quotation.customerName} />
          <FieldRow label="Quotation Date" value={formatDate(quotation.quotationDate)} />
          <FieldRow label="Valid Until" value={formatDate(quotation.validUntil)} />
        </DetailSection>

        <DetailSection title="Customer Portal & WhatsApp">
          <View style={styles.shareCard}>
            <Text style={styles.shareDescription}>
              Share this quotation directly with the customer via secure online portal link or WhatsApp notification.
            </Text>
            {quotation.shareToken ? (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Share Portal Token:</Text>
                <Text style={styles.tokenValue} numberOfLines={1} ellipsizeMode="middle">
                  {quotation.shareToken}
                </Text>
              </View>
            ) : null}
            <View style={styles.actionRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Share portal link"
                style={styles.shareButton}
                onPress={handleSharePortal}
              >
                <Share2 color={colors.white} size={15} />
                <Text style={styles.shareButtonText}>Share Portal Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Send WhatsApp notification"
                style={[styles.whatsappButton, sendingWhatsApp && styles.buttonDisabled]}
                onPress={handleSendWhatsApp}
                disabled={sendingWhatsApp}
              >
                {sendingWhatsApp ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <MessageSquare color={colors.white} size={15} />
                    <Text style={styles.whatsappButtonText}>Send WhatsApp</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open WhatsApp app"
              style={styles.directWhatsAppButton}
              onPress={handleDeviceWhatsApp}
            >
              <Text style={styles.directWhatsAppText}>Open in Device WhatsApp</Text>
            </TouchableOpacity>
          </View>
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

        <DetailSection title="Price Breakdown">
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Subtotal</Text><Text style={styles.breakdownVal}>{formatMoney(quotation.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Tax</Text><Text style={styles.breakdownVal}>{formatMoney(quotation.taxAmount)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.breakdownLabel}>Discount</Text><Text style={styles.breakdownVal}>{formatMoney(quotation.discount)}</Text></View>
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
    padding: 14,
    paddingBottom: 28
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  quoteTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  customerName: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  grandTotalWrap: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10
  },
  grandTotalLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  grandTotalAmount: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2
  },
  shareCard: {
    gap: 10
  },
  shareDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  tokenBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8
  },
  tokenLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  tokenValue: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  whatsappButton: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12
  },
  whatsappButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  directWhatsAppButton: {
    alignItems: 'center',
    borderColor: '#059669',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12
  },
  directWhatsAppText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  itemRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingVertical: 10
  },
  itemName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3
  },
  itemTotal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  breakdownLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  breakdownVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  grandRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8
  },
  grandText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900'
  }
});

export default QuotationDetailScreen;
