import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MarketplaceReportModal } from '../../components/marketplace/MarketplaceReportModal';
import { marketplaceApi } from '../marketplaceApi';

const createStore = () =>
  configureStore({
    reducer: { [marketplaceApi.reducerPath]: marketplaceApi.reducer },
    middleware: (gDM) => gDM().concat(marketplaceApi.middleware),
  });

describe('MarketplaceReportModal', () => {
  it('renders report form for listing', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <MarketplaceReportModal
          title="Denunciar producto"
          subtitle="Zapatillas Nike"
          listingId="listing-1"
          onClose={() => {}}
        />
      </Provider>
    );
    expect(screen.getByText('Denunciar producto')).toBeInTheDocument();
    expect(screen.getByText('Zapatillas Nike')).toBeInTheDocument();
    expect(screen.getByText('Enviar denuncia')).toBeInTheDocument();
  });
});
