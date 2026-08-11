import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listBranches, createBranch } from '../api/garageService';
import { useAuth } from './AuthContext';
import type { Garage } from '../types/models';

const ACTIVE_GARAGE_KEY = 'garagepulse_active_garage';

interface GarageContextValue {
  garages: Garage[];
  activeGarageId: string | null;
  switchGarage: (garageId: string) => void;
  addBranch: (data: Pick<Garage, 'name' | 'phone'>) => Promise<Garage>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

export function GarageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Only ever populated/used for owners — non-owners are always scoped to
  // their single assigned garage, derived below rather than stored.
  const [ownerGarages, setOwnerGarages] = useState<Garage[]>([]);
  const [ownerActiveGarageId, setOwnerActiveGarageId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'owner') return;

    listBranches().then(async ({ data }) => {
      setOwnerGarages(data);
      const stored = await AsyncStorage.getItem(ACTIVE_GARAGE_KEY);
      const resolved = stored && data.some(g => g._id === stored) ? stored : user.garage;
      setOwnerActiveGarageId(resolved);
      await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, resolved);
    }).catch(() => {
      // Branch list failed to load — falls back to the home garage below.
    });
  }, [user]);

  const garages = user?.role === 'owner' ? ownerGarages : [];
  // Falls back to the home garage until the branch list resolves (or if it
  // fails) — a branch is always active from the moment of login, with no
  // synchronous setState needed in the effect above.
  const activeGarageId = user
    ? (user.role === 'owner' ? (ownerActiveGarageId ?? user.garage) : user.garage)
    : null;

  const switchGarage = (garageId: string) => {
    setOwnerActiveGarageId(garageId);
    AsyncStorage.setItem(ACTIVE_GARAGE_KEY, garageId);
  };

  const addBranch = async (data: Pick<Garage, 'name' | 'phone'>): Promise<Garage> => {
    const { data: garage } = await createBranch(data);
    setOwnerGarages(prev => [...prev, garage]);
    switchGarage(garage._id);
    return garage;
  };

  return (
    <GarageContext.Provider value={{ garages, activeGarageId, switchGarage, addBranch }}>
      {children}
    </GarageContext.Provider>
  );
}

export const useGarage = (): GarageContextValue => {
  const context = useContext(GarageContext);
  if (!context) throw new Error('useGarage must be used within GarageProvider');
  return context;
};
