import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listBranches, createBranch, deleteBranch, getGarage, type DeleteBranchPayload } from '../api/garageService';
import { useAuth } from './AuthContext';
import { DEFAULT_LOCALE } from '../utils/locale';
import { ACTIVE_GARAGE_KEY } from '../utils/constants';
import type { Garage, ResolvedLocale } from '../types/models';


// Minimum time the "switching branch" overlay stays up, so screens that
// refetch on focus (see the garage-scoped screens' useFocusEffect deps on
// activeGarageId) have a real chance to complete before it clears.
const SWITCH_SETTLE_MS = 600;

interface GarageContextValue {
  garages: Garage[];
  activeGarageId: string | null;
  garagesLoading: boolean;
  /** Active garage's server-resolved locale; DEFAULT_LOCALE until it loads. */
  locale: ResolvedLocale;
  /** The full active garage, once loaded — null for staff until fetched. */
  activeGarage: Garage | null;
  /** Re-fetch the active garage, e.g. after Settings saves a new country. */
  refreshGarage: () => Promise<void>;
  switchGarage: (garageId: string) => Promise<void>;
  addBranch: (data: Pick<Garage, 'name' | 'phone'>) => Promise<Garage>;
  removeBranch: (garageId: string, payload?: DeleteBranchPayload) => Promise<void>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

export function GarageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Only ever populated/used for owners — non-owners are always scoped to
  // their single assigned garage, derived below rather than stored.
  const [ownerGarages, setOwnerGarages] = useState<Garage[]>([]);
  const [ownerActiveGarageId, setOwnerActiveGarageId] = useState<string | null>(null);
  const [garagesLoading, setGaragesLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Depend on stable primitives, not the `user` object reference. AuthContext's
  // boot-time checkToken() calls setUser() twice — once with the cached user,
  // once with the fresh one from getMe() — which would otherwise refire this
  // effect twice and race two overlapping branch-list fetches against each other.
  const userId = user?._id;
  const userRole = user?.role;
  const userGarage = user?.garage;

  useEffect(() => {
    if (!userId || userRole !== 'owner') return;

    setGaragesLoading(true);
    listBranches().then(async ({ data }) => {
      setOwnerGarages(data);
      const stored = await AsyncStorage.getItem(ACTIVE_GARAGE_KEY);
      const resolved = stored && data.some(g => g._id === stored) ? stored : userGarage!;
      setOwnerActiveGarageId(resolved);
      await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, resolved);
    }).catch(() => {
      // Branch list failed to load — falls back to the home garage below.
    }).finally(() => setGaragesLoading(false));
  }, [userId, userRole, userGarage]);

  const garages = userRole === 'owner' ? ownerGarages : [];
  // Falls back to the home garage until the branch list resolves (or if it
  // fails) — a branch is always active from the moment of login, with no
  // synchronous setState needed in the effect above.
  const activeGarageId = user
    ? (userRole === 'owner' ? (ownerActiveGarageId ?? userGarage ?? null) : userGarage ?? null)
    : null;

  // Staff never load a branch list, so their only route to a full garage
  // document is a direct fetch. Owners get theirs from the list for free.
  const [fetchedGarage, setFetchedGarage] = useState<Garage | null>(null);
  const garageFromList = garages.find(g => g._id === activeGarageId) ?? null;

  useEffect(() => {
    if (garageFromList || !activeGarageId) return;
    getGarage().then(({ data }) => setFetchedGarage(data)).catch(() => {});
  }, [activeGarageId, garageFromList]);

  // Only trust the fetched garage while it still matches the active branch —
  // switching branches leaves the previous fetch in state for a moment.
  const activeGarage =
    garageFromList ?? (fetchedGarage?._id === activeGarageId ? fetchedGarage : null);

  const refreshGarage = async () => {
    const { data } = await getGarage();
    setFetchedGarage(data);
    setOwnerGarages(prev => prev.map(g => (g._id === data._id ? data : g)));
  };

  // Order matters: the active branch's own locale wins, then the user's home
  // garage (the only value a staff member has before their fetch lands), then
  // India — which is what every pre-existing garage resolves to anyway.
  const locale = activeGarage?.locale ?? user?.locale ?? DEFAULT_LOCALE;

  const switchGarage = async (garageId: string) => {
    if (garageId === ownerActiveGarageId) return;
    setSwitching(true);
    try {
      setOwnerActiveGarageId(garageId);
      await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, garageId);
      await new Promise(resolve => setTimeout(resolve, SWITCH_SETTLE_MS));
    } finally {
      setSwitching(false);
    }
  };

  const addBranch = async (data: Pick<Garage, 'name' | 'phone'>): Promise<Garage> => {
    const { data: garage } = await createBranch(data);
    setOwnerGarages(prev => [...prev, garage]);
    await switchGarage(garage._id);
    return garage;
  };

  const removeBranch = async (garageId: string, payload?: DeleteBranchPayload): Promise<void> => {
    const { data } = await deleteBranch(garageId, payload);
    setOwnerGarages(prev => prev.filter(g => g._id !== garageId));
    // If the deleted branch was active, follow the backend's fallback (the
    // owner's own `garage` ref was just repointed there too) so the app
    // doesn't keep sending X-Garage-Id for a branch that no longer exists.
    if (garageId === ownerActiveGarageId) {
      await switchGarage(data.fallbackGarageId);
    }
  };

  return (
    <GarageContext.Provider value={{
      garages, activeGarageId, garagesLoading, locale, activeGarage,
      refreshGarage, switchGarage, addBranch, removeBranch
    }}>
      {children}
      {switching && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.overlayText}>Switching branch…</Text>
        </View>
      )}
    </GarageContext.Provider>
  );
}

export const useGarage = (): GarageContextValue => {
  const context = useContext(GarageContext);
  if (!context) throw new Error('useGarage must be used within GarageProvider');
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
