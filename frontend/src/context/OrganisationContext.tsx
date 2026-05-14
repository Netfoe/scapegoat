import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Organisation } from '../types';
import { api } from '../api/client';

interface OrganisationContextType {
  organisations: Organisation[];
  selectedOrganisation: Organisation | null;
  setSelectedOrganisation: (org: Organisation | null) => void;
  loading: boolean;
  refreshOrganisations: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisation, setSelectedOrganisationState] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganisations = async () => {
    try {
      const data = await api.fetchOrganisations();
      setOrganisations(data);
      
      // Try to restore from localStorage or pick the first one
      const savedId = localStorage.getItem('selectedOrganisationId');
      if (savedId && data.length > 0) {
        const found = data.find(o => o.id === parseInt(savedId, 10));
        if (found) {
          setSelectedOrganisationState(found);
        } else {
          setSelectedOrganisationState(data[0]);
        }
      } else if (data.length > 0 && !selectedOrganisation) {
        setSelectedOrganisationState(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrganisations();
  }, []);

  const setSelectedOrganisation = (org: Organisation | null) => {
    setSelectedOrganisationState(org);
    if (org) {
      localStorage.setItem('selectedOrganisationId', org.id.toString());
    } else {
      localStorage.removeItem('selectedOrganisationId');
    }
  };

  return (
    <OrganisationContext.Provider value={{ 
      organisations, 
      selectedOrganisation, 
      setSelectedOrganisation, 
      loading,
      refreshOrganisations
    }}>
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
}
