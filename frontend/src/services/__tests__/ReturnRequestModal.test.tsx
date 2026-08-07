import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReturnRequestModal } from '../../components/marketplace/ReturnRequestModal';
import { marketplaceApi } from '../marketplaceApi';

const createStore = () =>
  configureStore({
    reducer: { [marketplaceApi.reducerPath]: marketplaceApi.reducer },
    middleware: (gDM) => gDM().concat(marketplaceApi.middleware),
  });

describe('ReturnRequestModal', () => {
  it('renders return form title and order number', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ReturnRequestModal orderNumber="OR-TEST-123" onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByText('Solicitar devolución')).toBeInTheDocument();
    expect(screen.getByText('Pedido OR-TEST-123')).toBeInTheDocument();
    expect(screen.getByText('Producto defectuoso o dañado')).toBeInTheDocument();
  });
});
