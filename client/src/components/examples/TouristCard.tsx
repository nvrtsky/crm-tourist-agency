import TouristCard from '../TouristCard';
import type { TouristWithVisits } from '@shared/schema';

export default function TouristCardExample() {
  const mockTourist: TouristWithVisits = {
    id: '1',
    entityId: 'dev-entity-123',
    entityTypeId: 'dev-type-1',
    bitrixContactId: null,
    name: 'Александр Иванов',
    email: 'alex@example.com',
    phone: '+7 900 123-45-67',
    visits: [
      {
        id: 'v1',
        touristId: '1',
        city: 'Beijing',
        arrivalDate: '2025-06-15',
        transportType: 'plane',
        hotelName: 'Grand Hotel Beijing',
      },
      {
        id: 'v2',
        touristId: '1',
        city: 'Xian',
        arrivalDate: '2025-06-18',
        transportType: 'train',
        hotelName: 'Imperial Inn Xi\'an',
      },
    ],
  };

  return (
    <div className="p-4 max-w-2xl">
      <TouristCard
        tourist={mockTourist}
        onEdit={() => console.log('Edit tourist')}
        onDelete={() => console.log('Delete tourist')}
      />
    </div>
  );
}
