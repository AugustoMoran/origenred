import { createApi } from '@reduxjs/toolkit/query/react';
import { createReauthBaseQuery } from './baseQueryWithReauth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const expenseApi = createApi({
  reducerPath: 'expenseApi',
  baseQuery: createReauthBaseQuery(`${API_BASE_URL}/expenses`),
  tagTypes: ['Expense'],
  endpoints: (builder) => ({
    getExpenses: builder.query<any, { from?: string; to?: string; affectsProfit?: boolean } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.from) search.set('from', params.from);
        if (params?.to) search.set('to', params.to);
        if (typeof params?.affectsProfit === 'boolean') search.set('affectsProfit', String(params.affectsProfit));
        const suffix = search.toString() ? `?${search.toString()}` : '';
        return `/${suffix}`;
      },
      providesTags: ['Expense'],
    }),
    createExpense: builder.mutation<any, any>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: ['Expense'],
    }),
    updateExpense: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Expense'],
    }),
    deleteExpense: builder.mutation<any, string>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Expense'],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = expenseApi;
