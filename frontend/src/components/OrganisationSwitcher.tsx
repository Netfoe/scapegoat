import { useOrganisation } from '../context/OrganisationContext';

export function OrganisationSwitcher() {
  const { organisations, selectedOrganisation, setSelectedOrganisation, loading } = useOrganisation();

  if (loading && organisations.length === 0) {
    return <div className="text-sm text-muted">Loading...</div>;
  }

  return (
    <div className="header-actions">
      <select 
        value={selectedOrganisation?.id || ''} 
        onChange={(e) => {
          const org = organisations.find(o => o.id === parseInt(e.target.value, 10));
          setSelectedOrganisation(org || null);
        }}
        className="select"
      >
        {organisations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
