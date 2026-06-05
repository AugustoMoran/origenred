import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { authApi } from '../services/authApi';
import { inventoryApi } from '../services/inventoryApi';
import { salesApi } from '../services/salesApi';
import { branchApi } from '../services/branchApi';
import { categoryApi } from '../services/categoryApi';
import { supplierApi } from '../services/supplierApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [inventoryApi.reducerPath]: inventoryApi.reducer,
    [salesApi.reducerPath]: salesApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [supplierApi.reducerPath]: supplierApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      inventoryApi.middleware,
      salesApi.middleware,
      branchApi.middleware,
      categoryApi.middleware,
      supplierApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
