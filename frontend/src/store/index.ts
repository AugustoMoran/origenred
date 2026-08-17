import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import marketplaceCartReducer from './marketplaceCartSlice';
import { authApi } from '../services/authApi';
import { inventoryApi } from '../services/inventoryApi';
import { salesApi } from '../services/salesApi';
import { branchApi } from '../services/branchApi';
import { categoryApi } from '../services/categoryApi';
import { supplierApi } from '../services/supplierApi';
import { expenseApi } from '../services/expenseApi';
import { supplierLedgerApi } from '../services/supplierLedgerApi';
import { afipApi } from '../services/afipApi';
import { ecommerceApi } from '../services/ecommerceApi';
import { settingsApi } from '../services/settingsApi';
import { analyticsApi } from '../services/analyticsApi';
import { paymentsApi } from '../services/paymentsApi';
import { marketplaceApi } from '../services/marketplaceApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    marketplaceCart: marketplaceCartReducer,
    [authApi.reducerPath]: authApi.reducer,
    [inventoryApi.reducerPath]: inventoryApi.reducer,
    [salesApi.reducerPath]: salesApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [supplierApi.reducerPath]: supplierApi.reducer,
    [expenseApi.reducerPath]: expenseApi.reducer,
    [supplierLedgerApi.reducerPath]: supplierLedgerApi.reducer,
    [afipApi.reducerPath]: afipApi.reducer,
    [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [marketplaceApi.reducerPath]: marketplaceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      inventoryApi.middleware,
      salesApi.middleware,
      branchApi.middleware,
      categoryApi.middleware,
      supplierApi.middleware,
      expenseApi.middleware,
      supplierLedgerApi.middleware,
      afipApi.middleware,
      ecommerceApi.middleware,
      settingsApi.middleware,
      analyticsApi.middleware,
      paymentsApi.middleware,
      marketplaceApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
