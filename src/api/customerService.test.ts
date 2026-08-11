import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from './customerService';
import api from './apiInterceptor';

jest.mock('./apiInterceptor', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

/**
 * Locks in the service-layer contract every screen relies on: each function
 * calls the shared axios instance with the right verb/URL and unwraps
 * `res.data` (the API response envelope) before returning.
 */
describe('customerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCustomers calls GET /customers with params and unwraps the envelope', async () => {
    const envelope = { success: true, count: 1, total: 1, pages: 1, currentPage: 1, data: [{ _id: 'c1', name: 'Rahul', phone: '9000000001' }] };
    jest.mocked(api.get).mockResolvedValue({ data: envelope });

    const result = await getCustomers({ search: 'rahul', page: 1, limit: 15 });

    expect(api.get).toHaveBeenCalledWith('/customers', { params: { search: 'rahul', page: 1, limit: 15 } });
    expect(result).toEqual(envelope);
  });

  it('getCustomer calls GET /customers/:id', async () => {
    const envelope = { success: true, data: { _id: 'c1', name: 'Rahul', phone: '9000000001' } };
    jest.mocked(api.get).mockResolvedValue({ data: envelope });

    const result = await getCustomer('c1');

    expect(api.get).toHaveBeenCalledWith('/customers/c1');
    expect(result).toEqual(envelope);
  });

  it('createCustomer calls POST /customers with the form payload', async () => {
    const envelope = { success: true, data: { _id: 'c2', name: 'New Customer', phone: '9000000002' } };
    jest.mocked(api.post).mockResolvedValue({ data: envelope });

    const payload = { name: 'New Customer', phone: '9000000002' };
    const result = await createCustomer(payload);

    expect(api.post).toHaveBeenCalledWith('/customers', payload);
    expect(result).toEqual(envelope);
  });

  it('updateCustomer calls PUT /customers/:id', async () => {
    const envelope = { success: true, data: { _id: 'c1', name: 'Updated', phone: '9000000001' } };
    jest.mocked(api.put).mockResolvedValue({ data: envelope });

    const result = await updateCustomer('c1', { name: 'Updated' });

    expect(api.put).toHaveBeenCalledWith('/customers/c1', { name: 'Updated' });
    expect(result).toEqual(envelope);
  });

  it('deleteCustomer calls DELETE /customers/:id', async () => {
    const envelope = { success: true, message: 'Customer deleted successfully' };
    jest.mocked(api.delete).mockResolvedValue({ data: envelope });

    const result = await deleteCustomer('c1');

    expect(api.delete).toHaveBeenCalledWith('/customers/c1');
    expect(result).toEqual(envelope);
  });
});
