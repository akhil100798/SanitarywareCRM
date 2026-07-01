import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Grid3X3,
  Home,
  Package,
  ShoppingCart,
  Users
} from 'lucide-react-native';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ListScreen from '../screens/ListScreen';
import LoginScreen from '../screens/LoginScreen';
import ModuleMenuScreen from '../screens/ModuleMenuScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import ProductPickerScreen from '../screens/ProductPickerScreen';
import QuotationDetailScreen from '../screens/QuotationDetailScreen';
import QuotationFormScreen from '../screens/QuotationFormScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

const tabIcon = (Icon) =>
  function IconRenderer({ color, size }) {
    return <Icon color={color} size={size} />;
  };

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ tabBarIcon: tabIcon(Home) }}
    />
    <Tab.Screen
      name="Customers"
      component={ListScreen}
      initialParams={{ resource: 'customers' }}
      options={{ tabBarIcon: tabIcon(Users) }}
    />
    <Tab.Screen
      name="Products"
      component={ListScreen}
      initialParams={{ resource: 'products' }}
      options={{ tabBarIcon: tabIcon(Package) }}
    />
    <Tab.Screen
      name="Orders"
      component={ListScreen}
      initialParams={{ resource: 'orders' }}
      options={{ tabBarIcon: tabIcon(ShoppingCart) }}
    />
    <Tab.Screen
      name="More"
      component={MoreNavigator}
      options={{ tabBarIcon: tabIcon(Grid3X3) }}
      listeners={({ navigation }) => ({
        tabPress: () => {
          navigation.navigate('More', { screen: 'MoreMenu' });
        }
      })}
    />
  </Tab.Navigator>
);

const MoreNavigator = () => (
  <MoreStack.Navigator
    screenOptions={{
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: '800' }
    }}
  >
    <MoreStack.Screen name="MoreMenu" component={ModuleMenuScreen} options={{ headerShown: false }} />
    <MoreStack.Screen name="ModuleList" component={ListScreen} options={{ title: '' }} />
  </MoreStack.Navigator>
);

const AppNavigator = () => {
  const { bootstrapping, isAuthenticated } = useAuth();

  if (bootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
          <Stack.Screen name="QuotationForm" component={QuotationFormScreen} />
          <Stack.Screen name="ProductPicker" component={ProductPickerScreen} />
          <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="PaymentForm" component={PaymentFormScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center'
  },
  tabBar: {
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700'
  }
});

export default AppNavigator;