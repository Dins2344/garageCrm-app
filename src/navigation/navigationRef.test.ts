import { navigationRef, openChangeRequest, flushPendingNavigation } from './navigationRef';

describe('openChangeRequest', () => {
  afterEach(() => jest.restoreAllMocks());

  it('holds the id until the navigator is ready, then navigates once', () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    const isReady = jest.spyOn(navigationRef, 'isReady').mockReturnValue(false);

    openChangeRequest('cr1');
    flushPendingNavigation();
    expect(navigate).not.toHaveBeenCalled();

    isReady.mockReturnValue(true);
    flushPendingNavigation();
    flushPendingNavigation();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('ChangeRequestDetail', { id: 'cr1' });
  });

  it('navigates straight away when already ready', () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);

    openChangeRequest('cr2');
    expect(navigate).toHaveBeenCalledWith('ChangeRequestDetail', { id: 'cr2' });
  });
});
